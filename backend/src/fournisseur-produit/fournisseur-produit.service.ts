import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFournisseurProduitDto } from './dto/create-fournisseur-produit.dto';
import { UpdateFournisseurProduitDto } from './dto/update-fournisseur-produit.dto';

@Injectable()
export class FournisseurProduitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFournisseurProduitDto: CreateFournisseurProduitDto) {
    const fp = await this.prisma.fournisseurProduit.create({
      data: createFournisseurProduitDto,
      include: { fournisseur: true, produit: true },
    });

    if (fp.produit && fp.produit.prixActuel === 0 && fp.prixAchat > 0) {
      await this.prisma.produit.update({
        where: { id: fp.produitId },
        data: { prixActuel: fp.prixAchat },
      });
      fp.produit.prixActuel = fp.prixAchat;
    }

    return fp;
  }

  async findAll() {
    return this.prisma.fournisseurProduit.findMany({
      include: { fournisseur: true, produit: true },
    });
  }

  async findOne(id: string) {
    const fp = await this.prisma.fournisseurProduit.findUnique({
      where: { id },
      include: { fournisseur: true, produit: true },
    });
    if (!fp) {
      throw new NotFoundException(`FournisseurProduit with ID ${id} not found`);
    }
    return fp;
  }

  async update(
    id: string,
    updateFournisseurProduitDto: UpdateFournisseurProduitDto,
  ) {
    try {
      const fp = await this.prisma.fournisseurProduit.update({
        where: { id },
        data: updateFournisseurProduitDto,
        include: { fournisseur: true, produit: true },
      });

      if (fp.produit && fp.produit.prixActuel === 0 && fp.prixAchat > 0) {
        await this.prisma.produit.update({
          where: { id: fp.produitId },
          data: { prixActuel: fp.prixAchat },
        });
        fp.produit.prixActuel = fp.prixAchat;
      }

      return fp;
    } catch {
      throw new NotFoundException(`FournisseurProduit with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.fournisseurProduit.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`FournisseurProduit with ID ${id} not found`);
    }
  }
}
