import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProduitDto } from './dto/create-produit.dto';
import { UpdateProduitDto } from './dto/update-produit.dto';

@Injectable()
export class ProduitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProduitDto: CreateProduitDto) {
    return this.prisma.produit.create({
      data: createProduitDto,
      include: {
        fournisseurProduits: { include: { fournisseur: true } },
        predictions: true,
      },
    });
  }

  async findAll() {
    return this.prisma.produit.findMany({
      include: {
        fournisseurProduits: { include: { fournisseur: true } },
        commandesLigne: true,
        predictions: true,
      },
    });
  }

  async findOne(id: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id },
      include: {
        fournisseurProduits: { include: { fournisseur: true } },
        commandesLigne: { include: { commande: true } },
        predictions: true,
        fluxDeStocks: {
          include: {
            entrepot: true,
            creerPar: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!produit) {
      throw new NotFoundException(`Produit with ID ${id} not found`);
    }
    return produit;
  }

  async update(id: string, updateProduitDto: UpdateProduitDto) {
    try {
      return await this.prisma.produit.update({
        where: { id },
        data: updateProduitDto,
        include: {
          fournisseurProduits: { include: { fournisseur: true } },
          predictions: true,
        },
      });
    } catch {
      throw new NotFoundException(`Produit with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.produit.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Produit with ID ${id} not found`);
    }
  }
}
