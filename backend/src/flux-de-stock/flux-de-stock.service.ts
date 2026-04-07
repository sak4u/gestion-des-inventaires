import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFluxDeStockDto } from './dto/create-flux-de-stock.dto';
import { UpdateFluxDeStockDto } from './dto/update-flux-de-stock.dto';

@Injectable()
export class FluxDeStockService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFluxDeStockDto: CreateFluxDeStockDto) {
    return this.prisma.$transaction(async (tx) => {
      const [entrepot, produit] = await Promise.all([
        tx.entrepot.findUnique({ where: { id: createFluxDeStockDto.entrepotId } }),
        tx.produit.findUnique({ where: { id: createFluxDeStockDto.produitId } }),
      ]);

      if (!entrepot) {
        throw new NotFoundException(`Entrepot with ID ${createFluxDeStockDto.entrepotId} not found`);
      }
      if (!produit) {
        throw new NotFoundException(`Produit with ID ${createFluxDeStockDto.produitId} not found`);
      }

      let delta = createFluxDeStockDto.quantite;
      if (['vente', 'perte'].includes(createFluxDeStockDto.type)) {
        delta = -Math.abs(createFluxDeStockDto.quantite);
      } else if (['achat', 'retour'].includes(createFluxDeStockDto.type)) {
        delta = Math.abs(createFluxDeStockDto.quantite);
      }

      const newEntrepotStock = (entrepot.stockActuelle ?? 0) + delta;
      const newProduitStock = (produit.quantite ?? 0) + delta;

      if (newEntrepotStock < 0) {
        throw new BadRequestException(
          `Le stock de l'entrepôt ne peut pas être négatif. Stock actuel: ${entrepot.stockActuelle ?? 0}`,
        );
      }
      if (newProduitStock < 0) {
        throw new BadRequestException(
          `La quantité globale du produit ne peut pas être négative. Quantité actuelle: ${produit.quantite ?? 0}`,
        );
      }

      await Promise.all([
        tx.entrepot.update({
          where: { id: createFluxDeStockDto.entrepotId },
          data: { stockActuelle: newEntrepotStock },
        }),
        tx.produit.update({
          where: { id: createFluxDeStockDto.produitId },
          data: { quantite: newProduitStock },
        })
      ]);

      return tx.fluxDeStock.create({
        data: createFluxDeStockDto,
        include: {
          produit: true,
          entrepot: true,
          creerPar: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.fluxDeStock.findMany({
      include: {
        produit: true,
        entrepot: true,
        creerPar: { select: { id: true, name: true, email: true } },
      },
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
    if (!flux) {
      throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
    }
    return flux;
  }

  async update(id: string, updateFluxDeStockDto: UpdateFluxDeStockDto) {
    try {
      return await this.prisma.fluxDeStock.update({
        where: { id },
        data: updateFluxDeStockDto,
        include: {
          produit: true,
          entrepot: true,
          creerPar: { select: { id: true, name: true, email: true } },
        },
      });
    } catch {
      throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.fluxDeStock.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`FluxDeStock with ID ${id} not found`);
    }
  }
}
