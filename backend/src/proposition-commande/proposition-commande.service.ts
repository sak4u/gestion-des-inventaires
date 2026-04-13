import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../prediction/prediction.service';

// ═══════════════════════════════════════════════════════════════════
//  SUPPLIER SCORING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/** Weight for price in supplier scoring (lower price = better) */
const WEIGHT_PRICE = 0.7;

/** Weight for delivery time in supplier scoring (faster = better) */
const WEIGHT_DELIVERY = 0.3;

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════

/** Supplier evaluation result after scoring */
interface SupplierScore {
  fournisseurId: string;
  fournisseurNom: string;
  prixAchat: number;
  delaiLivraison: number;
  score: number;
}

@Injectable()
export class PropositionCommandeService {
  private readonly logger = new Logger(PropositionCommandeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionService: PredictionService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  SUPPLIER SELECTION & SCORING (Normalized)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Scores and ranks all suppliers for a given product.
   *
   * Scoring formula (Min-Max Normalization):
   *   normalizedPrice    = prix / maxPrix         → range [0, 1]
   *   normalizedDelivery = delai / maxDelai        → range [0, 1]
   *   score = (WEIGHT_PRICE × normalizedPrice)
   *         + (WEIGHT_DELIVERY × normalizedDelivery)
   *
   * Lower score = better supplier.
   *
   * Why normalize?
   *   Without normalization, a price of 500 would dominate a delivery
   *   time of 5, making the delivery weight meaningless. Normalization
   *   ensures both dimensions contribute proportionally.
   */
  async selectBestSupplier(produitId: string): Promise<SupplierScore | null> {
    // Fetch all suppliers for this product with minimal fields
    const fournisseurProduits = await this.prisma.fournisseurProduit.findMany({
      where: { produitId },
      include: {
        fournisseur: { select: { id: true, nom: true } },
      },
    });

    if (fournisseurProduits.length === 0) {
      this.logger.warn(`No suppliers found for product ${produitId}`);
      return null;
    }

    // ── Compute normalization maximums ──
    // Math.max(..., 1) prevents division by zero when all values are 0
    const maxPrice = Math.max(
      ...fournisseurProduits.map((fp) => fp.prixAchat ?? 0),
      1, // floor to 1 to prevent division by zero
    );

    const maxDelivery = Math.max(
      ...fournisseurProduits.map((fp) => fp.delaiLivraison),
      1, // floor to 1 to prevent division by zero
    );

    // ── Score each supplier ──
    const scored: SupplierScore[] = fournisseurProduits.map((fp) => {
      const normalizedPrice = (fp.prixAchat ?? 0) / maxPrice;
      const normalizedDelivery = fp.delaiLivraison / maxDelivery;

      const score =
        WEIGHT_PRICE * normalizedPrice +
        WEIGHT_DELIVERY * normalizedDelivery;

      return {
        fournisseurId: fp.fournisseurId,
        fournisseurNom: fp.fournisseur.nom,
        prixAchat: fp.prixAchat ?? 0,
        delaiLivraison: fp.delaiLivraison,
        score: Math.round(score * 1000) / 1000, // 3 decimal places
      };
    });

    // Sort ascending: lowest score = best supplier
    scored.sort((a, b) => a.score - b.score);

    this.logger.log(
      `Best supplier for product ${produitId}: "${scored[0].fournisseurNom}" ` +
        `(score=${scored[0].score}, price=${scored[0].prixAchat}, ` +
        `delivery=${scored[0].delaiLivraison}d)`,
    );

    return scored[0];
  }

  // ─────────────────────────────────────────────────────────────────
  //  PROPOSITION GENERATION (Concurrency-Safe)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Generates a purchase-order proposition for a product IF:
   *   1. Current stock ≤ stockAlert threshold
   *   2. No pending proposition already exists for this product
   *
   * Concurrency Safety:
   *   The duplicate check + creation is wrapped in a SERIALIZABLE
   *   transaction. This prevents race conditions where two concurrent
   *   requests both pass the "no existing" check and both create
   *   a proposition.
   *
   * Flow:
   *   1. Validate product & stock level
   *   2. Generate prediction (upserts, returns prediction ID)
   *   3. Select best supplier via normalized scoring
   *   4. Create PropositionCommande in a serializable transaction
   */
  async generateProposition(produitId: string) {
    // ── Step 1: Get the product and check stock level ──
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true, quantite: true, stockAlert: true },
    });

    if (!produit) {
      throw new NotFoundException(`Produit with ID ${produitId} not found`);
    }

    // Only generate if stock is at or below alert level
    if (produit.quantite > produit.stockAlert) {
      this.logger.debug(
        `Product "${produit.nom}": stock (${produit.quantite}) > ` +
          `alert (${produit.stockAlert}). Skipping.`,
      );
      return null;
    }

    // ── Step 2: Generate a fresh prediction (upserts, returns ID) ──
    const predictionResult =
      await this.predictionService.generatePrediction(produitId);

    // Guard: if recommended qty is 0, no order needed
    if (predictionResult.quantiteRecommande <= 0) {
      this.logger.debug(
        `Product "${produit.nom}": recommended qty is 0. Skipping.`,
      );
      return null;
    }

    // ── Step 3: Select the best supplier ──
    const bestSupplier = await this.selectBestSupplier(produitId);
    if (!bestSupplier) {
      this.logger.warn(
        `Cannot generate proposition for "${produit.nom}": ` +
          `no supplier found. Add a FournisseurProduit entry first.`,
      );
      return null;
    }

    // ── Step 4: Concurrency-safe proposition creation ──
    //   Using a Serializable transaction to prevent duplicate EN_ATTENTE
    //   propositions. If two requests arrive simultaneously:
    //   - First one: check passes → creates proposition
    //   - Second one: check finds the first one → skips
    try {
      const proposition = await this.prisma.$transaction(
        async (tx) => {
          // Check for existing pending proposition WITHIN the transaction
          const existingPending =
            await tx.propositionCommande.findFirst({
              where: {
                produitId,
                statut: 'EN_ATTENTE',
              },
            });

          if (existingPending) {
            this.logger.debug(
              `Pending proposition already exists for "${produit.nom}" ` +
                `(ID: ${existingPending.id}). Skipping.`,
            );
            return null;
          }

          // Create the proposition
          return tx.propositionCommande.create({
            data: {
              produitId,
              fournisseurId: bestSupplier.fournisseurId,
              predictionId: predictionResult.predictionId, // Direct ID link — no fragile findFirst!
              quantiteProposee: predictionResult.quantiteRecommande,
              scoreFournisseur: bestSupplier.score,
              statut: 'EN_ATTENTE',
            },
            include: {
              produit: true,
              fournisseur: true,
              prediction: true,
            },
          });
        },
        {
          // Serializable isolation prevents phantom reads (race conditions)
          isolationLevel: 'Serializable',
        },
      );

      if (!proposition) return null;

      this.logger.log(
        `✅ Proposition created for "${produit.nom}": ` +
          `qty=${predictionResult.quantiteRecommande}, ` +
          `supplier="${bestSupplier.fournisseurNom}" ` +
          `(score=${bestSupplier.score}, price=${bestSupplier.prixAchat})`,
      );

      return proposition;
    } catch (error) {
      // Handle Prisma serialization failure (concurrent transaction conflict)
      if (
        error instanceof Error &&
        error.message.includes('could not serialize')
      ) {
        this.logger.warn(
          `Concurrent proposition creation detected for "${produit.nom}". ` +
            `Another transaction won. Skipping.`,
        );
        return null;
      }
      throw error; // Re-throw unexpected errors
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  BATCH CHECK — All Products
  // ─────────────────────────────────────────────────────────────────

  /**
   * Scans ALL products, generates propositions for those
   * whose stock is at or below the alert threshold.
   *
   * Optimization: Pre-filters products at the DB level using
   * a raw query to compare quantite <= stockAlert, avoiding
   * unnecessary processing of well-stocked products.
   */
  async checkAllProducts(): Promise<{
    checked: number;
    propositionsCreated: number;
    skipped: number;
    errors: string[];
  }> {
    // Optimization: only fetch products where stock <= alert threshold
    // Prisma doesn't support field-to-field comparisons in where clauses,
    // so we use $queryRawUnsafe for this optimization.
    const lowStockProducts = await this.prisma.$queryRaw<
      { id: string; nom: string }[]
    >`SELECT id, nom FROM "Produit" WHERE quantite <= "stockAlert"`;

    let propositionsCreated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of lowStockProducts) {
      try {
        const result = await this.generateProposition(product.id);
        if (result) {
          propositionsCreated++;
        } else {
          skipped++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`"${product.nom}": ${msg}`);
        this.logger.warn(
          `Failed to process product "${product.nom}": ${msg}`,
        );
      }
    }

    this.logger.log(
      `Batch check complete: ${lowStockProducts.length} low-stock products found, ` +
        `${propositionsCreated} propositions created, ${skipped} skipped`,
    );

    return {
      checked: lowStockProducts.length,
      propositionsCreated,
      skipped,
      errors,
    };
  }

  // ─────────────────────────────────────────────────────────────────
  //  CRUD / QUERIES
  // ─────────────────────────────────────────────────────────────────

  /** List all propositions with full relations */
  async findAll() {
    return this.prisma.propositionCommande.findMany({
      include: {
        produit: true,
        fournisseur: true,
        prediction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** List only pending (EN_ATTENTE) propositions */
  async findPending() {
    return this.prisma.propositionCommande.findMany({
      where: { statut: 'EN_ATTENTE' },
      include: {
        produit: true,
        fournisseur: true,
        prediction: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get a single proposition by ID */
  async findOne(id: string) {
    const proposition = await this.prisma.propositionCommande.findUnique({
      where: { id },
      include: {
        produit: true,
        fournisseur: true,
        prediction: true,
      },
    });
    if (!proposition) {
      throw new NotFoundException(
        `PropositionCommande with ID ${id} not found`,
      );
    }
    return proposition;
  }

  // ─────────────────────────────────────────────────────────────────
  //  ACCEPT — Convert proposition into a real Commande
  // ─────────────────────────────────────────────────────────────────

  /**
   * Accepts a proposition and converts it into a real purchase order.
   *
   * Transaction flow:
   *   1. Validate state — only EN_ATTENTE can be accepted
   *   2. Fetch supplier price INSIDE the transaction (data consistency)
   *   3. Update proposition statut → "ACCEPTEE"
   *   4. Create a Commande (etat = "En cours")
   *   5. Create a CommandeLigne with correct supplier price
   *
   * All steps are atomic — if any fails, nothing is committed.
   *
   * @param id     Proposition ID
   * @param userId The user accepting the proposition (from JWT token)
   */
  async accept(id: string, userId: string) {
    // Validate: proposition must exist and be in pending state
    const proposition = await this.findOne(id);

    if (proposition.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        `Proposition is already "${proposition.statut}". ` +
          `Only EN_ATTENTE propositions can be accepted.`,
      );
    }

    if (!userId) {
      throw new BadRequestException(
        'User ID is required to accept a proposition.',
      );
    }

    // ── Execute everything in a single transaction ──
    const result = await this.prisma.$transaction(async (tx) => {
      // 1) Fetch supplier's price for this product INSIDE the transaction
      //    This ensures we use the price that was valid at acceptance time
      const fournisseurProduit = await tx.fournisseurProduit.findFirst({
        where: {
          produitId: proposition.produitId,
          fournisseurId: proposition.fournisseurId,
        },
        select: { prixAchat: true },
      });

      const prixAchat = fournisseurProduit?.prixAchat ?? 0;

      if (prixAchat === 0) {
        this.logger.warn(
          `Supplier price is 0 for proposition ${id}. ` +
            `This may indicate missing FournisseurProduit data.`,
        );
      }

      // 2) Update proposition status
      const updatedProposition = await tx.propositionCommande.update({
        where: { id },
        data: { statut: 'ACCEPTEE' },
      });

      // 3) Create the real Commande (purchase order)
      const commande = await tx.commande.create({
        data: {
          etat: 'En cours',
          userId,
          fournisseurId: proposition.fournisseurId,
        },
      });

      // 4) Create the CommandeLigne (order line)
      const commandeLigne = await tx.commandeLigne.create({
        data: {
          commandeId: commande.id,
          produitId: proposition.produitId,
          quantite: proposition.quantiteProposee,
          prixUnitaireAchat: prixAchat,
        },
      });

      return {
        proposition: updatedProposition,
        commande,
        commandeLigne,
        prixUnitaireAchat: prixAchat,
      };
    });

    this.logger.log(
      `✅ Proposition ${id} accepted → Commande ${result.commande.id} created ` +
        `(${result.commandeLigne.quantite} units × ${result.prixUnitaireAchat} DA)`,
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  //  REJECT
  // ─────────────────────────────────────────────────────────────────

  /**
   * Rejects a pending proposition. The product remains flagged for
   * potential re-evaluation in the next scheduler cycle.
   */
  async reject(id: string) {
    const proposition = await this.findOne(id);

    if (proposition.statut !== 'EN_ATTENTE') {
      throw new BadRequestException(
        `Proposition is already "${proposition.statut}". ` +
          `Only EN_ATTENTE propositions can be rejected.`,
      );
    }

    const updated = await this.prisma.propositionCommande.update({
      where: { id },
      data: { statut: 'REFUSEE' },
      include: {
        produit: true,
        fournisseur: true,
      },
    });

    this.logger.log(
      `❌ Proposition ${id} rejected for product "${updated.produit.nom}"`,
    );
    return updated;
  }
}
