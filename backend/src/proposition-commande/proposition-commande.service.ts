import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../ai/prediction/prediction.service';
import { EtatCommande, StatutProposition, Prisma } from '@prisma/client';

const WEIGHT_PRICE = 0.7;
const WEIGHT_DELIVERY = 0.3;

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
  //  HELPER: get total product stock (sum of all StockEntrepot)
  // ─────────────────────────────────────────────────────────────────

  private async getStockTotal(produitId: string): Promise<number> {
    const agg = await this.prisma.stockEntrepot.aggregate({
      where: { produitId },
      _sum: { quantite: true },
    });
    return agg._sum.quantite ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPER: get total stock in a specific warehouse (all products)
  // ─────────────────────────────────────────────────────────────────

  private async getEntrepotStockTotal(
    entrepotId: string,
    tx?: any,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const agg = await client.stockEntrepot.aggregate({
      where: { entrepotId },
      _sum: { quantite: true },
    });
    return agg._sum.quantite ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────
  //  SUPPLIER SCORING (Normalized)
  // ─────────────────────────────────────────────────────────────────

  async selectBestSupplier(produitId: string): Promise<SupplierScore | null> {
    const fournisseurProduits = await this.prisma.fournisseurProduit.findMany({
      where: { produitId },
      include: { fournisseur: { select: { id: true, nom: true } } },
    });

    if (fournisseurProduits.length === 0) {
      this.logger.warn(`No suppliers found for product ${produitId}`);
      return null;
    }

    const maxPrice = Math.max(...fournisseurProduits.map((fp) => fp.prixAchat), 1);
    const maxDelivery = Math.max(...fournisseurProduits.map((fp) => fp.delaiLivraison), 1);

    const scored: SupplierScore[] = fournisseurProduits.map((fp) => ({
      fournisseurId: fp.fournisseurId,
      fournisseurNom: fp.fournisseur.nom,
      prixAchat: fp.prixAchat,
      delaiLivraison: fp.delaiLivraison,
      score: Math.round(
        (WEIGHT_PRICE * (fp.prixAchat / maxPrice) +
          WEIGHT_DELIVERY * (fp.delaiLivraison / maxDelivery)) *
          1000,
      ) / 1000,
    }));

    scored.sort((a, b) => a.score - b.score);
    return scored[0];
  }

  // ─────────────────────────────────────────────────────────────────
  //  GENERATE PROPOSITION
  // ─────────────────────────────────────────────────────────────────

  async generateProposition(produitId: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true, stockAlert: true },
    });
    if (!produit) throw new NotFoundException(`Produit with ID ${produitId} not found`);

    // ── Calcul dynamique du stock total réel ──
    const stockTotal = await this.getStockTotal(produitId);

    if (stockTotal > produit.stockAlert) {
      this.logger.debug(
        `"${produit.nom}": stock (${stockTotal}) > alert (${produit.stockAlert}). Skipping.`,
      );
      return null;
    }

    const predictionResult = await this.predictionService.generatePrediction(produitId);

    if (predictionResult.quantiteRecommande <= 0) {
      this.logger.debug(`"${produit.nom}": recommended qty is 0. Skipping.`);
      return null;
    }

    const bestSupplier = await this.selectBestSupplier(produitId);
    if (!bestSupplier) {
      this.logger.warn(`Cannot generate proposition for "${produit.nom}": no supplier.`);
      return null;
    }

    try {
      const proposition = await this.prisma.$transaction(
        async (tx) => {
          const existingPending = await tx.propositionCommande.findFirst({
            where: { produitId, statut: StatutProposition.EN_ATTENTE },
          });
          if (existingPending) {
            this.logger.debug(`Pending proposition already exists for "${produit.nom}". Skipping.`);
            return null;
          }
          return tx.propositionCommande.create({
            data: {
              produitId,
              fournisseurId: bestSupplier.fournisseurId,
              predictionId: predictionResult.predictionId,
              quantiteProposee: predictionResult.quantiteRecommande,
              scoreFournisseur: bestSupplier.score,
              statut: StatutProposition.EN_ATTENTE,
            },
            include: { produit: true, fournisseur: true, prediction: true },
          });
        },
        { isolationLevel: 'Serializable' },
      );

      if (!proposition) return null;

      this.logger.log(
        `✅ Proposition created for "${produit.nom}": qty=${predictionResult.quantiteRecommande}, ` +
          `supplier="${bestSupplier.fournisseurNom}" (score=${bestSupplier.score})`,
      );
      return proposition;
    } catch (error) {
      if (error instanceof Error && error.message.includes('could not serialize')) {
        this.logger.warn(`Concurrent proposition creation for "${produit.nom}". Skipping.`);
        return null;
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  BATCH CHECK
  // ─────────────────────────────────────────────────────────────────

  async checkAllProducts(): Promise<{
    checked: number;
    propositionsCreated: number;
    skipped: number;
    errors: string[];
  }> {
    // Utilise la SOMME des StockEntrepot pour comparer avec stockAlert
    const lowStockProducts = await this.prisma.$queryRaw<
      { id: string; nom: string }[]
    >`
      SELECT p.id, p.nom
      FROM "Produit" p
      WHERE COALESCE(
        (SELECT SUM(se.quantite) FROM "StockEntrepot" se WHERE se."produitId" = p.id),
        0
      ) <= p."stockAlert"
    `;

    let propositionsCreated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const product of lowStockProducts) {
      try {
        const result = await this.generateProposition(product.id);
        result ? propositionsCreated++ : skipped++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`"${product.nom}": ${msg}`);
        this.logger.warn(`Failed to process "${product.nom}": ${msg}`);
      }
    }

    this.logger.log(
      `Batch: ${lowStockProducts.length} low-stock, ${propositionsCreated} created, ${skipped} skipped`,
    );

    return { checked: lowStockProducts.length, propositionsCreated, skipped, errors };
  }

  // ─────────────────────────────────────────────────────────────────
  //  CRUD
  // ─────────────────────────────────────────────────────────────────

  async findAll(filters: {
    statut?: StatutProposition;
    search?: string;
    produitId?: string;
    fournisseurId?: string;
    commandeEtat?: EtatCommande;
  }) {
    const { statut, search, produitId, fournisseurId, commandeEtat } = filters;
    console.log('--- Propositions Filters ---', filters);
    const where: Prisma.PropositionCommandeWhereInput = {};

    if (statut && Object.values(StatutProposition).includes(statut)) {
      where.statut = statut;
    }
    if (produitId) {
      where.produitId = produitId;
    }
    if (fournisseurId) {
      where.fournisseurId = fournisseurId;
    }
    if (commandeEtat) {
      // @ts-ignore - Temporary bypass until prisma generate succeeds
      where.commande = { etat: commandeEtat };
    }
    if (search) {
      where.OR = [
        { produit: { nom: { contains: search, mode: 'insensitive' } } },
        { fournisseur: { nom: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // @ts-ignore
    return this.prisma.propositionCommande.findMany({
      where,
      include: {
        produit: true,
        fournisseur: true,
        prediction: true,
        // @ts-ignore
        commande: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPending() {
    return this.prisma.propositionCommande.findMany({
      where: { statut: StatutProposition.EN_ATTENTE },
      include: { produit: true, fournisseur: true, prediction: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const proposition = await this.prisma.propositionCommande.findUnique({
      where: { id },
      include: { produit: true, fournisseur: true, prediction: true },
    });
    if (!proposition) throw new NotFoundException(`PropositionCommande with ID ${id} not found`);
    return proposition;
  }

  // ─────────────────────────────────────────────────────────────────
  //  ACCEPT — avec entrepôt cible obligatoire
  //  Capacity validated via dynamic SUM(StockEntrepot)
  // ─────────────────────────────────────────────────────────────────

  async accept(id: string, userId: string, entrepotId: string) {
    const proposition = await this.findOne(id);

    if (proposition.statut !== StatutProposition.EN_ATTENTE) {
      throw new BadRequestException(
        `Proposition is already "${proposition.statut}". Only EN_ATTENTE can be accepted.`,
      );
    }
    if (!userId) {
      throw new BadRequestException('User ID is required.');
    }

    // Valider l'entrepôt
    const entrepot = await this.prisma.entrepot.findUnique({
      where: { id: entrepotId },
      select: { id: true, nom: true, capaciteMax: true },
    });
    if (!entrepot) {
      throw new NotFoundException(`Entrepôt avec ID ${entrepotId} introuvable.`);
    }

    // Vérifier capacité dynamiquement
    if (entrepot.capaciteMax != null) {
      const currentStock = await this.getEntrepotStockTotal(entrepotId);
      if (currentStock + proposition.quantiteProposee > entrepot.capaciteMax) {
        throw new BadRequestException(
          `Capacité de l'entrepôt "${entrepot.nom}" insuffisante. ` +
            `Capacité max: ${entrepot.capaciteMax}, ` +
            `stock actuel: ${currentStock}, ` +
            `quantité à recevoir: ${proposition.quantiteProposee}`,
        );
      }
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const fournisseurProduit = await tx.fournisseurProduit.findFirst({
          where: { produitId: proposition.produitId, fournisseurId: proposition.fournisseurId },
          select: { prixAchat: true },
        });
        const prixAchat = fournisseurProduit?.prixAchat ?? 0;

        // 1) Mettre à jour la proposition
        const updatedProposition = await tx.propositionCommande.update({
          where: { id },
          data: { statut: StatutProposition.ACCEPTEE },
        });

        // 2) Créer la commande avec lien entrepôt et proposition
        const commande = await tx.commande.create({
          data: {
            etat: EtatCommande.EN_COURS,
            userId,
            fournisseurId: proposition.fournisseurId,
            entrepotId,
            propositionId: proposition.id,
          },
        });

        // 3) Créer la ligne de commande
        const commandeLigne = await tx.commandeLigne.create({
          data: {
            commandeId: commande.id,
            produitId: proposition.produitId,
            quantite: proposition.quantiteProposee,
            prixUnitaire: prixAchat,
          },
        });

        // 4) Créer un flux d'achat dans l'entrepôt cible (matérialise la réception)
        await tx.fluxDeStock.create({
          data: {
            quantite: proposition.quantiteProposee,
            type: 'achat',
            note: `Réception commande ${commande.id} (proposition ${proposition.id})`,
            produitId: proposition.produitId,
            entrepotId,
            creerParId: userId,
            commandeId: commande.id,
          },
        });

        // 5) Mettre à jour StockEntrepot destination
        await tx.stockEntrepot.upsert({
          where: {
            produitId_entrepotId: { produitId: proposition.produitId, entrepotId },
          },
          create: {
            produitId: proposition.produitId,
            entrepotId,
            quantite: proposition.quantiteProposee,
          },
          update: { quantite: { increment: proposition.quantiteProposee } },
        });

        return { proposition: updatedProposition, commande, commandeLigne, prixUnitaire: prixAchat, entrepot };
      },
      { isolationLevel: 'Serializable' },
    );

    this.logger.log(
      `✅ Proposition ${id} accepted → Commande ${result.commande.id} ` +
        `(${result.commandeLigne.quantite} units → entrepôt "${result.entrepot.nom}")`,
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  //  REJECT
  // ─────────────────────────────────────────────────────────────────

  async reject(id: string) {
    const proposition = await this.findOne(id);
    if (proposition.statut !== StatutProposition.EN_ATTENTE) {
      throw new BadRequestException(
        `Proposition is already "${proposition.statut}". Only EN_ATTENTE can be rejected.`,
      );
    }
    const updated = await this.prisma.propositionCommande.update({
      where: { id },
      data: { statut: StatutProposition.REFUSEE },
      include: { produit: true, fournisseur: true },
    });
    this.logger.log(`❌ Proposition ${id} rejected for "${updated.produit.nom}"`);
    return updated;
  }
}
