import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntrepotDto } from './dto/create-entrepot.dto';
import { UpdateEntrepotDto } from './dto/update-entrepot.dto';
import { GetEntrepotsFilterDto } from './dto/get-entrepots-filter.dto';

@Injectable()
export class EntrepotService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEntrepotDto: CreateEntrepotDto) {
    return this.prisma.entrepot.create({
      data: createEntrepotDto,
      include: { fluxDeStocks: true },
    });
  }

  async findAll(filterDto: GetEntrepotsFilterDto) {
    const { adresse, capaciteMax } = filterDto;

    const where: Prisma.EntrepotWhereInput = {};
    if (adresse) {
      where.adresse = {
        contains: adresse,
        mode: 'insensitive',
      };
    }
    if (capaciteMax !== undefined) {
      where.capaciteMax = capaciteMax;
    }

    const entrepots = await this.prisma.entrepot.findMany({
      where,
      include: {
        stockEntrepots: { include: { produit: true } },
        fluxDeStocks: { include: { produit: true } },
      },
    });

    // Enrichir chaque entrepôt avec son stock total calculé dynamiquement
    return entrepots.map((e) => ({
      ...e,
      stockTotalEntrepot: e.stockEntrepots.reduce(
        (sum, se) => sum + se.quantite,
        0,
      ),
    }));
  }

  async findOne(id: string) {
    const entrepot = await this.prisma.entrepot.findUnique({
      where: { id },
      include: {
        stockEntrepots: { include: { produit: true } },
        fluxDeStocks: {
          include: {
            produit: true,
            creerPar: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!entrepot) {
      throw new NotFoundException(`Entrepot with ID ${id} not found`);
    }

    return {
      ...entrepot,
      stockTotalEntrepot: entrepot.stockEntrepots.reduce(
        (sum, se) => sum + se.quantite,
        0,
      ),
    };
  }

  async update(id: string, updateEntrepotDto: UpdateEntrepotDto) {
    try {
      return await this.prisma.entrepot.update({
        where: { id },
        data: updateEntrepotDto,
        include: { fluxDeStocks: true },
      });
    } catch {
      throw new NotFoundException(`Entrepot with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.entrepot.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`Entrepot with ID ${id} not found`);
    }
  }
}
