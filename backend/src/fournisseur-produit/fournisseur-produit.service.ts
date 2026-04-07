import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFournisseurProduitDto } from './dto/create-fournisseur-produit.dto';
import { UpdateFournisseurProduitDto } from './dto/update-fournisseur-produit.dto';

@Injectable()
export class FournisseurProduitService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFournisseurProduitDto: CreateFournisseurProduitDto) {
    return this.prisma.fournisseurProduit.create({
      data: createFournisseurProduitDto,
      include: { fournisseur: true, produit: true },
    });
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
      return await this.prisma.fournisseurProduit.update({
        where: { id },
        data: updateFournisseurProduitDto,
        include: { fournisseur: true, produit: true },
      });
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
