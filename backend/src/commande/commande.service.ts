import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandeDto } from './dto/create-commande.dto';
import { UpdateCommandeDto } from './dto/update-commande.dto';

@Injectable()
export class CommandeService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    if (!commande) {
      throw new NotFoundException(`Commande with ID ${id} not found`);
    }
    return commande;
  }

  async update(id: string, updateCommandeDto: UpdateCommandeDto) {
    try {
      return await this.prisma.commande.update({
        where: { id },
        data: updateCommandeDto,
        include: {
          user: { select: { id: true, name: true, email: true } },
          fournisseur: true,
          commandesLigne: true,
        },
      });
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
