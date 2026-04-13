import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFluxDeStockDto } from './dto/create-flux-de-stock.dto';
import { UpdateFluxDeStockDto } from './dto/update-flux-de-stock.dto';
import { PredictionService } from '../prediction/prediction.service';
import { PropositionCommandeService } from '../proposition-commande/proposition-commande.service';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Stock flow types that DECREASE inventory and should trigger
 * prediction recalculation + low-stock check.
 *
 * Why only these? Incoming flows (achat, retour) increase stock,
 * so they can't cause stockout. Only outgoing flows need attention.
 */
const OUTGOING_FLOW_TYPES = ['vente', 'perte'];

/**
 * Stock flow types that INCREASE inventory.
 */
const INCOMING_FLOW_TYPES = ['achat', 'retour'];

@Injectable()
export class FluxDeStockService {
  private readonly logger = new Logger(FluxDeStockService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionService: PredictionService,
    private readonly propositionService: PropositionCommandeService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  SHARED HELPER: Compute delta from type + raw quantity
  // ─────────────────────────────────────────────────────────────────

  /**
   * Computes the stock delta (signed) from a flow type and raw quantity.
   *  - Outgoing types (vente, perte) → negative delta
   *  - Incoming types (achat, retour) → positive delta
   *  - correction_inventaire → keeps the sign as provided
   */
  private computeDelta(type: string, quantite: number): number {
    if (OUTGOING_FLOW_TYPES.includes(type)) {
      return -Math.abs(quantite);
    }
    if (INCOMING_FLOW_TYPES.includes(type)) {
      return Math.abs(quantite);
    }
    // 'correction_inventaire' keeps the sign as provided
    return quantite;
  }

  /**
   * Creates a stock flow entry and updates stock levels atomically.
   *
   * Flow:
   *   1. Validate entities exist (entrepot + produit)
   *   2. Calculate delta based on flow type
   *   3. Validate no negative stock
   *   4. Validate entrepot capacity for incoming flows
   *   5. Update entrepot + produit stock levels
   *   6. Create the FluxDeStock record
   *   7. (Post-commit) Trigger prediction & proposition if outgoing flow
   *
   * All DB operations (steps 1-6) are wrapped in a transaction.
   * Step 7 runs AFTER commit — failure here doesn't rollback the flux.
   */
  async create(createFluxDeStockDto: CreateFluxDeStockDto) {
    const fluxResult = await this.prisma.$transaction(async (tx) => {
      // ── Validate entities exist (parallel for performance) ──
      const [entrepot, produit] = await Promise.all([
        tx.entrepot.findUnique({
          where: { id: createFluxDeStockDto.entrepotId },
          select: { id: true, stockActuelle: true, capaciteMax: true },
        }),
        tx.produit.findUnique({
          where: { id: createFluxDeStockDto.produitId },
          select: { id: true, quantite: true },
        }),
      ]);

      if (!entrepot) {
        throw new NotFoundException(
          `Entrepot with ID ${createFluxDeStockDto.entrepotId} not found`,
        );
      }
      if (!produit) {
        throw new NotFoundException(
          `Produit with ID ${createFluxDeStockDto.produitId} not found`,
        );
      }

      // ── Calculate stock delta based on flow type ──
      const delta = this.computeDelta(
        createFluxDeStockDto.type,
        createFluxDeStockDto.quantite,
      );

      // ── Validate: no negative stock after this operation ──
      const newEntrepotStock = (entrepot.stockActuelle ?? 0) + delta;
      const newProduitStock = (produit.quantite ?? 0) + delta;

      if (newEntrepotStock < 0) {
        throw new BadRequestException(
          `Le stock de l'entrepôt ne peut pas être négatif. ` +
            `Stock actuel: ${entrepot.stockActuelle ?? 0}, delta: ${delta}`,
        );
      }
      if (newProduitStock < 0) {
        throw new BadRequestException(
          `La quantité du produit ne peut pas être négative. ` +
            `Quantité actuelle: ${produit.quantite ?? 0}, delta: ${delta}`,
        );
      }

      // ── Validate: entrepot capacity for incoming flows ──
      if (
        delta > 0 &&
        entrepot.capaciteMax != null &&
        newEntrepotStock > entrepot.capaciteMax
      ) {
        throw new BadRequestException(
          `Le stock dépasserait la capacité maximale de l'entrepôt. ` +
            `Capacité max: ${entrepot.capaciteMax}, ` +
            `nouveau stock serait: ${newEntrepotStock}`,
        );
      }

      // ── Update stock levels (parallel for performance) ──
      await Promise.all([
        tx.entrepot.update({
          where: { id: createFluxDeStockDto.entrepotId },
          data: { stockActuelle: newEntrepotStock },
        }),
        tx.produit.update({
          where: { id: createFluxDeStockDto.produitId },
          data: { quantite: newProduitStock },
        }),
      ]);

      // ── Create the flux record ──
      return tx.fluxDeStock.create({
        data: createFluxDeStockDto,
        include: {
          produit: true,
          entrepot: true,
          creerPar: { select: { id: true, name: true, email: true } },
        },
      });
    });

    // ── EVENT TRIGGER (post-commit, non-blocking) ──
    // Only recalculate predictions on OUTGOING flows (vente, perte)
    // because only these affect stock depletion forecasts.
    // Incoming flows (achat, retour) increase stock — no urgency.
    if (OUTGOING_FLOW_TYPES.includes(createFluxDeStockDto.type)) {
      // Fire-and-forget: void operator signals this is intentionally not awaited.
      // The method has its own try/catch so the promise will never reject.
      void this.triggerPredictionUpdate(createFluxDeStockDto.produitId);
    }

    return fluxResult;
  }

  /**
   * Asynchronously triggers prediction recalculation and
   * proposition generation after an outgoing stock flow.
   *
   * This is fire-and-forget: errors are logged but don't
   * affect the original flux creation response.
   */
  private async triggerPredictionUpdate(produitId: string): Promise<void> {
    try {
      this.logger.log(
        `Outgoing flow detected for product ${produitId} — ` +
          `triggering prediction update...`,
      );
      await this.predictionService.generatePrediction(produitId);
      await this.propositionService.generateProposition(produitId);
    } catch (error) {
      // Non-blocking: log the error but don't fail the flux creation
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Post-flux prediction/proposition trigger failed: ${msg}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  CRUD
  // ─────────────────────────────────────────────────────────────────

  async findAll() {
    return this.prisma.fluxDeStock.findMany({
      include: {
        produit: true,
        entrepot: true,
        creerPar: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const flux = await this.prisma.fluxDeStock.findUnique({
      where: { id },
      include: {
        produit: true,
        entrepot: true,
        creerPar: { select: { id: true, name: true, email: true } },
      },
    });
    if (!flux) {
      throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
    }
    return flux;
  }

  /**
   * Updates a stock flow and adjusts stock levels atomically.
   *
   * Why this is complex:
   *   When updating a flux, we must REVERSE the old delta and APPLY
   *   the new one. Otherwise stock levels become inconsistent.
   *
   * Example: Old flux was "vente 10" (delta = -10). User changes to
   *   "vente 5" (delta = -5). We must: +10 (reverse old) then -5 (apply new)
   *   → net effect = +5 on stock.
   */
  async update(id: string, updateFluxDeStockDto: UpdateFluxDeStockDto) {
    return this.prisma.$transaction(async (tx) => {
      // ── Fetch the existing flux to reverse its delta ──
      const existingFlux = await tx.fluxDeStock.findUnique({
        where: { id },
        include: { entrepot: true, produit: true },
      });

      if (!existingFlux) {
        throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
      }

      // ── Compute old delta (what was applied) ──
      const oldDelta = this.computeDelta(
        existingFlux.type,
        existingFlux.quantite,
      );

      // ── Compute new delta (what should be applied) ──
      const newType = updateFluxDeStockDto.type ?? existingFlux.type;
      const newQuantite =
        updateFluxDeStockDto.quantite ?? existingFlux.quantite;
      const newDelta = this.computeDelta(newType, newQuantite);

      // Net adjustment = reverse old + apply new
      const netDelta = -oldDelta + newDelta;

      // ── Validate new stock levels ──
      const currentEntrepotStock = existingFlux.entrepot.stockActuelle ?? 0;
      const currentProduitStock = existingFlux.produit.quantite ?? 0;

      const newEntrepotStock = currentEntrepotStock + netDelta;
      const newProduitStock = currentProduitStock + netDelta;

      if (newEntrepotStock < 0) {
        throw new BadRequestException(
          `La mise à jour rendrait le stock de l'entrepôt négatif. ` +
            `Stock actuel: ${currentEntrepotStock}, ajustement net: ${netDelta}`,
        );
      }
      if (newProduitStock < 0) {
        throw new BadRequestException(
          `La mise à jour rendrait la quantité du produit négative. ` +
            `Quantité actuelle: ${currentProduitStock}, ajustement net: ${netDelta}`,
        );
      }

      // ── Validate entrepot capacity for incoming adjustments ──
      if (netDelta > 0 && existingFlux.entrepot.capaciteMax != null) {
        if (newEntrepotStock > existingFlux.entrepot.capaciteMax) {
          throw new BadRequestException(
            `La mise à jour dépasserait la capacité maximale de l'entrepôt. ` +
              `Capacité max: ${existingFlux.entrepot.capaciteMax}, ` +
              `nouveau stock serait: ${newEntrepotStock}`,
          );
        }
      }

      // ── Apply stock adjustments + update flux record atomically ──
      const entrepotId =
        updateFluxDeStockDto.entrepotId ?? existingFlux.entrepotId;
      const produitId =
        updateFluxDeStockDto.produitId ?? existingFlux.produitId;

      await Promise.all([
        tx.entrepot.update({
          where: { id: entrepotId },
          data: { stockActuelle: newEntrepotStock },
        }),
        tx.produit.update({
          where: { id: produitId },
          data: { quantite: newProduitStock },
        }),
      ]);

      return tx.fluxDeStock.update({
        where: { id },
        data: updateFluxDeStockDto,
        include: {
          produit: true,
          entrepot: true,
          creerPar: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  /**
   * Deletes a stock flow and reverses its stock impact atomically.
   *
   * Why: Deleting a flux without reversing its delta leaves phantom
   * stock changes with no audit trail. The old code just deleted the
   * record — this version reverses the stock impact first.
   */
  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // ── Fetch the flux to reverse its delta ──
      const flux = await tx.fluxDeStock.findUnique({
        where: { id },
        include: { entrepot: true, produit: true },
      });

      if (!flux) {
        throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
      }

      // ── Reverse the delta ──
      const delta = this.computeDelta(flux.type, flux.quantite);
      const reversedDelta = -delta;

      const newEntrepotStock =
        (flux.entrepot.stockActuelle ?? 0) + reversedDelta;
      const newProduitStock = (flux.produit.quantite ?? 0) + reversedDelta;

      // Guard: reversing shouldn't create negative stock
      if (newEntrepotStock < 0) {
        throw new BadRequestException(
          `Impossible de supprimer ce flux: le stock de l'entrepôt ` +
            `deviendrait négatif (${newEntrepotStock}).`,
        );
      }
      if (newProduitStock < 0) {
        throw new BadRequestException(
          `Impossible de supprimer ce flux: la quantité du produit ` +
            `deviendrait négative (${newProduitStock}).`,
        );
      }

      // ── Reverse stock + delete record atomically ──
      await Promise.all([
        tx.entrepot.update({
          where: { id: flux.entrepotId },
          data: { stockActuelle: newEntrepotStock },
        }),
        tx.produit.update({
          where: { id: flux.produitId },
          data: { quantite: newProduitStock },
        }),
      ]);

      return tx.fluxDeStock.delete({ where: { id } });
    });
  }
}

