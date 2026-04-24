import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';
import { MailService } from '../mail/mail.service';
import { EtatCommande } from '@prisma/client';

@Injectable()
export class CommandeService {
  private readonly logger = new Logger(CommandeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(createCommandeDto: CreateCommandeDto) {
    return this.prisma.commande.create({
      data: createCommandeDto,
      include: {
        user: { select: { id: true, name: true, email: true } },
        fournisseur: true,
        commandesLigne: true,
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
      },
    });
    if (!commande) {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
    return commande;
  }

  async update(id: string, updateCommandeDto: UpdateCommandeDto) {
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

      // ── Fire-and-forget email notification when order is closed ──
      // We only trigger if the incoming update explicitly sets etat to FERMEE.
      // The mail method handles its own errors so this never blocks the HTTP response.
      if (updateCommandeDto.etat === EtatCommande.FERMEE) {
        if (updated.fournisseur?.email) {
          void this.mailService.sendCommandeNotification(
            updated.fournisseur.email,
            {
              commandeId: updated.id,
              dateCreation: updated.dateCreation,
              nomFournisseur: updated.fournisseur.nom,
              lignes: updated.commandesLigne.map((ligne) => ({
                nomProduit: ligne.produit.nom,
                quantite: ligne.quantite,
                prixUnitaireAchat: ligne.prixUnitaireAchat,
              })),
            },
          );
          this.logger.log(
            `Commande ${id} closed (état: FERMEE) — email notification dispatched to ${updated.fournisseur.email}`,
          );
        } else {
          this.logger.warn(
            `Commande ${id} closed but supplier has no email — notification skipped`,
          );
        }
      }

      return updated;
    } catch {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.commande.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
  }
}
