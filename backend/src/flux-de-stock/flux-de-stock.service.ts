import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFluxDeStockDto } from './dto/create-flux-de-stock.dto';
import { UpdateFluxDeStockDto } from './dto/update-flux-de-stock.dto';
import { CreateTransfertDto } from './dto/create-transfert.dto';
import { PredictionService } from '../ai/prediction/prediction.service';
import { PropositionCommandeService } from '../proposition-commande/proposition-commande.service';
import { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════

const OUTGOING_FLOW_TYPES = ['vente', 'perte'];
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
  //  HELPER: compute stock delta from flow type
  // ─────────────────────────────────────────────────────────────────

  private computeDelta(type: string, quantite: number): number {
    if (OUTGOING_FLOW_TYPES.includes(type)) return -Math.abs(quantite);
    if (INCOMING_FLOW_TYPES.includes(type)) return Math.abs(quantite);
    return quantite; // correction_inventaire keeps the sign
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPER: get total product stock across all warehouses
  // ─────────────────────────────────────────────────────────────────

  async getStockTotal(produitId: string): Promise<number> {
    const agg = await this.prisma.stockEntrepot.aggregate({
      where: { produitId },
      _sum: { quantite: true },
    });
    return agg._sum.quantite ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPER: get total stock in a specific warehouse (all products)
  //  Used for capaciteMax validation — replaces stockActuelle
  // ─────────────────────────────────────────────────────────────────

  private async getEntrepotStockTotal(
    entrepotId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    const agg = await client.stockEntrepot.aggregate({
      where: { entrepotId },
      _sum: { quantite: true },
    });
    return agg._sum.quantite ?? 0;
  }

  // ─────────────────────────────────────────────────────────────────
  //  CREATE — single flux with StockEntrepot sync
  //  Uses Serializable isolation to prevent race conditions
  // ─────────────────────────────────────────────────────────────────

  async create(createFluxDeStockDto: CreateFluxDeStockDto) {
    // ── Flux 'achat' are generated automatically when a Commande ACHAT
    //    transitions to LIVREE. Manual creation is forbidden to prevent
    //    quantity mismatches between the order and the stock reception.
    if (createFluxDeStockDto.type === 'achat') {
      throw new BadRequestException(
        "Les flux d'achat sont générés automatiquement lors de la livraison d'une commande. " +
        "Passez la commande à l'état LIVREE pour déclencher la réception de stock.",
      );
    }

    const fluxResult = await this.prisma.$transaction(
      async (tx) => {
        // Validate entities exist
        const [entrepot, produit] = await Promise.all([
          tx.entrepot.findUnique({
            where: { id: createFluxDeStockDto.entrepotId },
            select: { id: true, capaciteMax: true },
          }),
          tx.produit.findUnique({
            where: { id: createFluxDeStockDto.produitId },
            select: { id: true, prixAchatMoyen: true },
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

        const delta = this.computeDelta(
          createFluxDeStockDto.type,
          createFluxDeStockDto.quantite,
        );

        // ── Fetch current localized stock for this warehouse ──
        const currentLocal = await tx.stockEntrepot.findUnique({
          where: {
            produitId_entrepotId: {
              produitId: createFluxDeStockDto.produitId,
              entrepotId: createFluxDeStockDto.entrepotId,
            },
          },
          select: { quantite: true },
        });
        const localStock = currentLocal?.quantite ?? 0;

        // Validate no negative stock in this warehouse
        if (localStock + delta < 0) {
          throw new BadRequestException(
            `Stock insuffisant dans cet entrepôt. ` +
              `Stock local: ${localStock}, mouvement: ${delta}`,
          );
        }

        // Validate warehouse capacity for incoming flows
        if (delta > 0 && entrepot.capaciteMax != null) {
          const currentEntrepotTotal = await this.getEntrepotStockTotal(
            createFluxDeStockDto.entrepotId,
            tx,
          );
          if (currentEntrepotTotal + delta > entrepot.capaciteMax) {
            throw new BadRequestException(
              `Capacité maximale de l'entrepôt dépassée. ` +
                `Capacité max: ${entrepot.capaciteMax}, stock actuel: ${currentEntrepotTotal}, mouvement: +${delta}`,
            );
          }
        }

        // Upsert StockEntrepot (source of truth for localized stock)
        await tx.stockEntrepot.upsert({
          where: {
            produitId_entrepotId: {
              produitId: createFluxDeStockDto.produitId,
              entrepotId: createFluxDeStockDto.entrepotId,
            },
          },
          create: {
            produitId: createFluxDeStockDto.produitId,
            entrepotId: createFluxDeStockDto.entrepotId,
            quantite: Math.max(0, delta),
          },
          update: {
            quantite: { increment: delta },
          },
        });

        // ── CALCUL CUMP (Coût Unitaire Moyen Pondéré) ──
        if (createFluxDeStockDto.type === 'achat' && delta > 0) {
          let prixAchat: number | null = null;
          
          if (createFluxDeStockDto.commandeId) {
            const commandeLigne = await tx.commandeLigne.findFirst({
              where: {
                commandeId: createFluxDeStockDto.commandeId,
                produitId: createFluxDeStockDto.produitId,
              },
            });
            if (commandeLigne) prixAchat = (commandeLigne as any).prixUnitaire;
          }
          
          if (prixAchat === null) {
            const fp = await tx.fournisseurProduit.findFirst({
              where: { produitId: createFluxDeStockDto.produitId },
              orderBy: { updatedAt: 'desc' },
            });
            if (fp) prixAchat = fp.prixAchat;
          }

          if (prixAchat !== null) {
            const agg = await tx.stockEntrepot.aggregate({
              where: { produitId: createFluxDeStockDto.produitId },
              _sum: { quantite: true },
            });
            // agg._sum.quantite already includes the 'delta' we just upserted above
            const globalStockAfter = agg._sum.quantite ?? 0;
            const globalStockBefore = Math.max(0, globalStockAfter - delta);
            
            const totalValeurAncienne = globalStockBefore * ((produit as any).prixAchatMoyen || 0);
            const valeurEntrante = delta * prixAchat;
            
            const newPrixAchatMoyen = globalStockAfter > 0
              ? (totalValeurAncienne + valeurEntrante) / globalStockAfter
              : prixAchat;
              
            await tx.produit.update({
              where: { id: produit.id },
              data: { prixAchatMoyen: newPrixAchatMoyen },
            });
            
            this.logger.log(`CUMP calculé pour produit ${produit.id}: Ancien prix ${(produit as any).prixAchatMoyen}, Nouveau prix ${newPrixAchatMoyen}`);
          }
        }

        return tx.fluxDeStock.create({
          data: {
            quantite: createFluxDeStockDto.quantite,
            type: createFluxDeStockDto.type,
            note: createFluxDeStockDto.note,
            produitId: createFluxDeStockDto.produitId,
            entrepotId: createFluxDeStockDto.entrepotId,
            creerParId: createFluxDeStockDto.creerParId,
            commandeId: createFluxDeStockDto.commandeId,
          },
          include: {
            produit: true,
            entrepot: true,
            creerPar: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // Fire-and-forget prediction update for outgoing flows only
    if (OUTGOING_FLOW_TYPES.includes(createFluxDeStockDto.type)) {
      void this.triggerPredictionUpdate(createFluxDeStockDto.produitId);
    }

    return fluxResult;
  }

  // ─────────────────────────────────────────────────────────────────
  //  TRANSFERT — move stock between two warehouses atomically
  //  Both flux records use type: 'transfert' and are cross-linked
  //  via entrepotLieId for full traceability.
  // ─────────────────────────────────────────────────────────────────

  async transfert(dto: CreateTransfertDto) {
    if (dto.entrepotSourceId === dto.entrepotDestinationId) {
      throw new BadRequestException(
        `Entrepôt source et destination doivent être différents.`,
      );
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Validate all entities
        const [source, destination, produit] = await Promise.all([
          tx.entrepot.findUnique({
            where: { id: dto.entrepotSourceId },
            select: { id: true, nom: true, capaciteMax: true },
          }),
          tx.entrepot.findUnique({
            where: { id: dto.entrepotDestinationId },
            select: { id: true, nom: true, capaciteMax: true },
          }),
          tx.produit.findUnique({
            where: { id: dto.produitId },
            select: { id: true, nom: true },
          }),
        ]);

        if (!source)
          throw new NotFoundException(`Entrepôt source introuvable`);
        if (!destination)
          throw new NotFoundException(`Entrepôt destination introuvable`);
        if (!produit) throw new NotFoundException(`Produit introuvable`);

        // Get localized stock in source warehouse
        const sourceStock = await tx.stockEntrepot.findUnique({
          where: {
            produitId_entrepotId: {
              produitId: dto.produitId,
              entrepotId: dto.entrepotSourceId,
            },
          },
          select: { quantite: true },
        });
        const sourceQty = sourceStock?.quantite ?? 0;

        if (sourceQty < dto.quantite) {
          throw new BadRequestException(
            `Stock insuffisant dans "${source.nom}". ` +
              `Disponible: ${sourceQty}, Demandé: ${dto.quantite}`,
          );
        }

        // Validate destination capacity
        if (destination.capaciteMax != null) {
          const destCurrentTotal = await this.getEntrepotStockTotal(
            dto.entrepotDestinationId,
            tx,
          );
          if (destCurrentTotal + dto.quantite > destination.capaciteMax) {
            throw new BadRequestException(
              `La capacité de l'entrepôt "${destination.nom}" serait dépassée. ` +
                `Capacité max: ${destination.capaciteMax}, stock actuel: ${destCurrentTotal}`,
            );
          }
        }

        // ── Create OUTGOING flux at source (type: transfert) ──
        const fluxSortie = await tx.fluxDeStock.create({
          data: {
            quantite: dto.quantite,
            type: 'transfert',
            note: dto.note ?? `Transfert vers "${destination.nom}"`,
            produitId: dto.produitId,
            entrepotId: dto.entrepotSourceId,
            creerParId: dto.creerParId,
            entrepotLieId: dto.entrepotDestinationId,
          },
        });

        // ── Create INCOMING flux at destination (type: transfert) ──
        const fluxEntree = await tx.fluxDeStock.create({
          data: {
            quantite: dto.quantite,
            type: 'transfert',
            note: dto.note ?? `Transfert depuis "${source.nom}"`,
            produitId: dto.produitId,
            entrepotId: dto.entrepotDestinationId,
            creerParId: dto.creerParId,
            entrepotLieId: dto.entrepotSourceId,
          },
        });

        // ── Update StockEntrepot for source (decrement) ──
        await tx.stockEntrepot.update({
          where: {
            produitId_entrepotId: {
              produitId: dto.produitId,
              entrepotId: dto.entrepotSourceId,
            },
          },
          data: { quantite: { decrement: dto.quantite } },
        });

        // ── Upsert StockEntrepot for destination (increment) ──
        await tx.stockEntrepot.upsert({
          where: {
            produitId_entrepotId: {
              produitId: dto.produitId,
              entrepotId: dto.entrepotDestinationId,
            },
          },
          create: {
            produitId: dto.produitId,
            entrepotId: dto.entrepotDestinationId,
            quantite: dto.quantite,
          },
          update: { quantite: { increment: dto.quantite } },
        });

        this.logger.log(
          `Transfert: ${dto.quantite}x "${produit.nom}" ` +
            `"${source.nom}" → "${destination.nom}"`,
        );

        return {
          fluxSortie,
          fluxEntree,
          produit,
          source,
          destination,
          quantite: dto.quantite,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────────────
  //  POST-COMMIT: trigger prediction (fire & forget)
  // ─────────────────────────────────────────────────────────────────

  private async triggerPredictionUpdate(produitId: string): Promise<void> {
    try {
      this.logger.log(
        `Outgoing flow for ${produitId} — triggering prediction...`,
      );
      await this.predictionService.generatePrediction(produitId);
      await this.propositionService.generateProposition(produitId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Post-flux trigger failed: ${msg}`);
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
    if (!flux)
      throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
    return flux;
  }

  async update(id: string, updateFluxDeStockDto: UpdateFluxDeStockDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const existingFlux = await tx.fluxDeStock.findUnique({
          where: { id },
          include: { entrepot: true, produit: true },
        });
        if (!existingFlux)
          throw new NotFoundException(`FluxDeStock with ID ${id} not found`);

        const oldDelta = this.computeDelta(
          existingFlux.type,
          existingFlux.quantite,
        );
        const newType = updateFluxDeStockDto.type ?? existingFlux.type;
        const newQuantite =
          updateFluxDeStockDto.quantite ?? existingFlux.quantite;
        const newDelta = this.computeDelta(newType, newQuantite);
        const netDelta = -oldDelta + newDelta;

        const newCommandeId = updateFluxDeStockDto.commandeId !== undefined ? updateFluxDeStockDto.commandeId : existingFlux.commandeId;
        if (newType === 'achat' && !newCommandeId) {
          throw new BadRequestException("Un flux d'achat doit obligatoirement être lié à une commande.");
        }

        const entrepotId =
          updateFluxDeStockDto.entrepotId ?? existingFlux.entrepotId;
        const produitId =
          updateFluxDeStockDto.produitId ?? existingFlux.produitId;

        // Validate via StockEntrepot
        const localStock = await tx.stockEntrepot.findUnique({
          where: { produitId_entrepotId: { produitId, entrepotId } },
          select: { quantite: true },
        });
        if ((localStock?.quantite ?? 0) + netDelta < 0) {
          throw new BadRequestException(
            `Stock local insuffisant pour cette modification.`,
          );
        }

        // Validate warehouse capacity for net incoming adjustments
        if (netDelta > 0) {
          const entrepotRecord = await tx.entrepot.findUnique({
            where: { id: entrepotId },
            select: { capaciteMax: true },
          });
          if (entrepotRecord?.capaciteMax != null) {
            const currentTotal = await this.getEntrepotStockTotal(
              entrepotId,
              tx,
            );
            if (currentTotal + netDelta > entrepotRecord.capaciteMax) {
              throw new BadRequestException(
                `Capacité de l'entrepôt dépassée après modification.`,
              );
            }
          }
        }

        await tx.stockEntrepot.upsert({
          where: { produitId_entrepotId: { produitId, entrepotId } },
          create: {
            produitId,
            entrepotId,
            quantite: Math.max(0, netDelta),
          },
          update: { quantite: { increment: netDelta } },
        });

        return tx.fluxDeStock.update({
          where: { id },
          data: {
            quantite: updateFluxDeStockDto.quantite,
            type: updateFluxDeStockDto.type,
            note: updateFluxDeStockDto.note,
            produitId: updateFluxDeStockDto.produitId,
            entrepotId: updateFluxDeStockDto.entrepotId,
            creerParId: updateFluxDeStockDto.creerParId,
          },
          include: {
            produit: true,
            entrepot: true,
            creerPar: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async remove(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const flux = await tx.fluxDeStock.findUnique({
          where: { id },
          include: { entrepot: true, produit: true },
        });
        if (!flux)
          throw new NotFoundException(`FluxDeStock with ID ${id} not found`);

        const delta = this.computeDelta(flux.type, flux.quantite);
        const reversedDelta = -delta;

        const localStock = await tx.stockEntrepot.findUnique({
          where: {
            produitId_entrepotId: {
              produitId: flux.produitId,
              entrepotId: flux.entrepotId,
            },
          },
          select: { quantite: true },
        });
        if ((localStock?.quantite ?? 0) + reversedDelta < 0) {
          throw new BadRequestException(
            `Impossible de supprimer: stock local deviendrait négatif.`,
          );
        }

        await tx.stockEntrepot.upsert({
          where: {
            produitId_entrepotId: {
              produitId: flux.produitId,
              entrepotId: flux.entrepotId,
            },
          },
          create: {
            produitId: flux.produitId,
            entrepotId: flux.entrepotId,
            quantite: 0,
          },
          update: { quantite: { increment: reversedDelta } },
        });

        return tx.fluxDeStock.delete({ where: { id } });
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
