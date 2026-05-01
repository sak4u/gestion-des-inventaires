import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { MailService } from '../mail/mail.service';
import { EtatCommande, TypeCommande } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommandeService {
  private readonly logger = new Logger(CommandeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  HELPER: validate business rules per commande type
  // ─────────────────────────────────────────────────────────────────

  private validateCreateRules(dto: CreateCommandeDto) {
    const type = dto.type ?? TypeCommande.ACHAT;

    if (type === TypeCommande.ACHAT && !dto.fournisseurId) {
      throw new BadRequestException(
        "Une commande d'achat doit obligatoirement être liée à un fournisseur.",
      );
    }
    if (type === TypeCommande.ACHAT && !dto.entrepotId) {
      throw new BadRequestException(
        "Une commande d'achat doit obligatoirement avoir un entrepôt de réception.",
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  HELPER: generate achat flux for all lignes (called inside tx)
  //  Only triggered when a ACHAT commande transitions to LIVREE.
  // ─────────────────────────────────────────────────────────────────

  private async generateFluxReception(
    commandeId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const commande = await tx.commande.findUnique({
      where: { id: commandeId },
      include: {
        commandesLigne: { include: { produit: true } },
        entrepot: { select: { id: true, capaciteMax: true } },
      },
    });

    if (!commande) throw new NotFoundException(`Commande ${commandeId} introuvable`);
    if (!commande.entrepotId) {
      throw new BadRequestException(
        "Impossible de livrer : aucun entrepôt de réception défini sur la commande.",
      );
    }
    if (commande.commandesLigne.length === 0) {
      throw new BadRequestException(
        "Impossible de livrer : la commande ne contient aucune ligne.",
      );
    }

    for (const ligne of commande.commandesLigne) {
      const delta = ligne.quantite;

      // ── Validate warehouse capacity ──
      if (commande.entrepot?.capaciteMax != null) {
        const agg = await tx.stockEntrepot.aggregate({
          where: { entrepotId: commande.entrepotId! },
          _sum: { quantite: true },
        });
        const currentTotal = agg._sum.quantite ?? 0;
        if (currentTotal + delta > commande.entrepot.capaciteMax) {
          throw new BadRequestException(
            `Capacité de l'entrepôt dépassée pour le produit "${ligne.produit.nom}". ` +
              `Capacité max: ${commande.entrepot.capaciteMax}, stock actuel: ${currentTotal}, réception: +${delta}`,
          );
        }
      }

      // ── Upsert StockEntrepot ──
      await tx.stockEntrepot.upsert({
        where: {
          produitId_entrepotId: {
            produitId: ligne.produitId,
            entrepotId: commande.entrepotId!,
          },
        },
        create: {
          produitId: ligne.produitId,
          entrepotId: commande.entrepotId!,
          quantite: Math.max(0, delta),
        },
        update: { quantite: { increment: delta } },
      });

      // ── CUMP recalculation ──
      const produit = await tx.produit.findUnique({
        where: { id: ligne.produitId },
        select: { prixActuel: true },
      });
      const prixAchat = ligne.prixUnitaireAchat;

      if (prixAchat > 0 && produit) {
        const aggGlobal = await tx.stockEntrepot.aggregate({
          where: { produitId: ligne.produitId },
          _sum: { quantite: true },
        });
        const globalStockAfter = aggGlobal._sum.quantite ?? 0;
        const globalStockBefore = Math.max(0, globalStockAfter - delta);
        const totalValeurAncienne = globalStockBefore * (produit.prixActuel || 0);
        const valeurEntrante = delta * prixAchat;
        const newPrixActuel =
          globalStockAfter > 0
            ? (totalValeurAncienne + valeurEntrante) / globalStockAfter
            : prixAchat;

        await tx.produit.update({
          where: { id: ligne.produitId },
          data: { prixActuel: newPrixActuel },
        });
        this.logger.log(
          `CUMP produit ${ligne.produitId}: ancien=${produit.prixActuel} → nouveau=${newPrixActuel.toFixed(4)}`,
        );
      }

      // ── Create FluxDeStock achat ──
      await tx.fluxDeStock.create({
        data: {
          quantite: ligne.quantite,
          type: 'achat',
          note: `Réception automatique — Commande #${commandeId}`,
          produitId: ligne.produitId,
          entrepotId: commande.entrepotId!,
          creerParId: commande.userId,
          commandeId: commande.id,
        },
      });

      this.logger.log(
        `Flux achat auto: +${ligne.quantite} "${ligne.produit.nom}" → entrepôt ${commande.entrepotId}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────
  //  CREATE
  // ─────────────────────────────────────────────────────────────────

  async create(createCommandeDto: CreateCommandeDto) {
    this.validateCreateRules(createCommandeDto);

    return this.prisma.commande.create({
      data: createCommandeDto,
      include: {
        user: { select: { id: true, name: true, email: true } },
        fournisseur: true,
        commandesLigne: true,
        entrepot: true,
      },
    });
  }

  async findAll() {
    return this.prisma.commande.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        fournisseur: true,
        commandesLigne: { include: { produit: true } },
        entrepot: true,
      },
      orderBy: { dateCreation: 'desc' },
    });
  }

  async findOne(id: string) {
    const commande = await this.prisma.commande.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fournisseur: true,
        commandesLigne: { include: { produit: true } },
        entrepot: true,
        fluxDeStocks: true,
      },
    });
    if (!commande) {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
    return commande;
  }

  // ─────────────────────────────────────────────────────────────────
  //  UPDATE — handles state transitions with business rules
  // ─────────────────────────────────────────────────────────────────

  async update(id: string, updateCommandeDto: UpdateCommandeDto) {
    const existing = await this.prisma.commande.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Commande with ID ${id} not found`);

    const LOCKED_STATES: EtatCommande[] = [
      EtatCommande.LIVREE,
      EtatCommande.ANNULEE,
    ];

    // Block any modifications on locked commandes
    if (LOCKED_STATES.includes(existing.etat)) {
      throw new BadRequestException(
        `La commande est déjà "${existing.etat}" et ne peut plus être modifiée.`,
      );
    }

    // Transition to LIVREE — only for commandes ACHAT
    if (updateCommandeDto.etat === EtatCommande.LIVREE) {
      if (existing.type !== TypeCommande.ACHAT) {
        throw new BadRequestException(
          "Seules les commandes de type ACHAT peuvent être marquées comme LIVREE.",
        );
      }

      return this.prisma.$transaction(
        async (tx) => {
          // 1. Generate all stock reception flux automatically
          await this.generateFluxReception(id, tx);

          // 2. Update the commande state
          const updated = await tx.commande.update({
            where: { id },
            data: { etat: EtatCommande.LIVREE },
            include: {
              user: { select: { id: true, name: true, email: true } },
              fournisseur: true,
              commandesLigne: { include: { produit: true } },
              entrepot: true,
              fluxDeStocks: true,
            },
          });

          // 3. Notify supplier via email (fire-and-forget, outside tx)
          if (updated.fournisseur?.email) {
            void this.mailService
              .sendCommandeNotification(updated.fournisseur.email, {
                commandeId: updated.id,
                dateCreation: updated.dateCreation,
                nomFournisseur: updated.fournisseur.nom,
                lignes: updated.commandesLigne.map((l) => ({
                  nomProduit: l.produit.nom,
                  quantite: l.quantite,
                  prixUnitaireAchat: l.prixUnitaireAchat,
                })),
              })
              .catch((err) =>
                this.logger.warn(`Email fournisseur échoué: ${err}`),
              );
          }

          this.logger.log(`Commande ${id} passée à LIVREE — flux générés automatiquement`);
          return updated;
        },
        { isolationLevel: 'Serializable' },
      );
    }

    // Standard state update (EN_COURS → FERMEE, etc.)
    try {
      const updated = await this.prisma.commande.update({
        where: { id },
        data: updateCommandeDto,
        include: {
          user: { select: { id: true, name: true, email: true } },
          fournisseur: true,
          commandesLigne: { include: { produit: true } },
          entrepot: true,
        },
      });

      // Legacy: email on FERMEE
      if (updateCommandeDto.etat === EtatCommande.FERMEE) {
        if (updated.fournisseur?.email) {
          void this.mailService
            .sendCommandeNotification(updated.fournisseur.email, {
              commandeId: updated.id,
              dateCreation: updated.dateCreation,
              nomFournisseur: updated.fournisseur.nom,
              lignes: updated.commandesLigne.map((l) => ({
                nomProduit: l.produit.nom,
                quantite: l.quantite,
                prixUnitaireAchat: l.prixUnitaireAchat,
              })),
            })
            .catch((err) =>
              this.logger.warn(`Email fournisseur échoué: ${err}`),
            );
          this.logger.log(`Commande ${id} fermée — email dispatché`);
        }
      }

      return updated;
    } catch {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    const existing = await this.prisma.commande.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Commande with ID ${id} not found`);

    if (existing.etat === EtatCommande.LIVREE) {
      throw new BadRequestException(
        "Une commande livrée ne peut pas être supprimée.",
      );
    }

    try {
      return await this.prisma.commande.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
  }
}
