import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandeLigneDto } from './dto/create-commande-ligne.dto';
import { UpdateCommandeLigneDto } from './dto/update-commande-ligne.dto';
import { EtatCommande } from '@prisma/client';

@Injectable()
export class CommandeLigneService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCommandeLigneDto: CreateCommandeLigneDto) {
    const commande = await this.prisma.commande.findUnique({
      where: { id: createCommandeLigneDto.commandeId },
    });

    if (!commande) {
      throw new NotFoundException(`Commande with ID ${createCommandeLigneDto.commandeId} not found`);
    }

    const closedStates: EtatCommande[] = [EtatCommande.FERMEE, EtatCommande.LIVREE, EtatCommande.ANNULEE];
    if (closedStates.includes(commande.etat)) {
      throw new BadRequestException(`Impossible d'ajouter une ligne : la commande est déjà ${commande.etat}`);
    }

    return this.prisma.commandeLigne.create({
      data: createCommandeLigneDto,
      include: { produit: true, commande: true },
    });
  }

  async findAll() {
    return this.prisma.commandeLigne.findMany({
      include: { produit: true, commande: true },
    });
  }

  async findOne(id: string) {
    const commandeLigne = await this.prisma.commandeLigne.findUnique({
      where: { id },
      include: { produit: true, commande: true },
    });
    if (!commandeLigne) {
      throw new NotFoundException(`CommandeLigne with ID ${id} not found`);
    }
    return commandeLigne;
  }

  async update(id: string, updateCommandeLigneDto: UpdateCommandeLigneDto) {
    try {
      return await this.prisma.commandeLigne.update({
        where: { id },
        data: updateCommandeLigneDto,
        include: { produit: true, commande: true },
      });
    } catch {
      throw new NotFoundException(`CommandeLigne with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.commandeLigne.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`CommandeLigne with ID ${id} not found`);
    }
  }
}
