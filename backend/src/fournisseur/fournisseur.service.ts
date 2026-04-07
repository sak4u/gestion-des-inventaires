import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFournisseurDto } from './dto/create-fournisseur.dto';
import { UpdateFournisseurDto } from './dto/update-fournisseur.dto';
import { GetFournisseursFilterDto } from './dto/get-fournisseurs-filter.dto';

@Injectable()
export class FournisseurService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFournisseurDto: CreateFournisseurDto) {
    return this.prisma.fournisseur.create({
      data: createFournisseurDto,
      include: {
        fournisseurProduits: { include: { produit: true } },
        commandes: true,
      },
    });
  }

  async findAll(filterDto: GetFournisseursFilterDto) {
    const { nom, email } = filterDto;

    const where: Prisma.FournisseurWhereInput = {};
    if (nom) {
      where.nom = {
        contains: nom,
        mode: 'insensitive',
      };
    }
    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    return this.prisma.fournisseur.findMany({
      where,
      include: {
        fournisseurProduits: { include: { produit: true } },
        commandes: true,
      },
    });
  }

  async findOne(id: string) {
    const fournisseur = await this.prisma.fournisseur.findUnique({
      where: { id },
      include: {
        fournisseurProduits: { include: { produit: true } },
        commandes: {
          include: {
            commandesLigne: { include: { produit: true } },
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!fournisseur) {
      throw new NotFoundException(`Fournisseur with ID ${id} not found`);
    }
    return fournisseur;
  }

  async update(id: string, updateFournisseurDto: UpdateFournisseurDto) {
    try {
      return await this.prisma.fournisseur.update({
        where: { id },
        data: updateFournisseurDto,
        include: {
          fournisseurProduits: { include: { produit: true } },
          commandes: true,
        },
      });
    } catch {
      throw new NotFoundException(`Fournisseur with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.fournisseur.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Fournisseur with ID ${id} not found`);
    }
  }
}
