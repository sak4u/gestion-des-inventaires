import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * StockEntrepotService
 *
 * Provides read-only views of the localised stock table (StockEntrepot).
 * Write operations are handled automatically by FluxDeStockService
 * inside its transactions — this service is query-only.
 *
 *  Available queries:
 *   findAll()                  → All localised stock entries (product × warehouse)
 *   findByProduit(produitId)   → All warehouses that hold a specific product
 *   findByEntrepot(entrepotId) → All products stored in a specific warehouse
 *   findOne(produitId, entrepotId) → Exact quantity of one product in one warehouse
 */
@Injectable()
export class StockEntrepotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all StockEntrepot entries with their product and warehouse details.
   * Ordered by warehouse name then product name for easy reading.
   */
  async findAll() {
    return this.prisma.stockEntrepot.findMany({
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            codeBare: true,
            category: true,
            stockAlert: true,
          },
        },
        entrepot: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            capaciteMax: true,
          },
        },
      },
      orderBy: [{ entrepot: { nom: 'asc' } }, { produit: { nom: 'asc' } }],
    });
  }

  /**
   * Returns every warehouse that holds a specific product,
   * along with the localised quantity in each warehouse.
   *
   * Use case: "Where is this product stored, and how much is in each location?"
   *
   * @param produitId UUID of the target product
   */
  async findByProduit(produitId: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true },
    });
    if (!produit) {
      throw new NotFoundException(`Produit with ID ${produitId} not found`);
    }

    const stocks = await this.prisma.stockEntrepot.findMany({
      where: { produitId },
      include: {
        entrepot: {
          select: { id: true, nom: true, adresse: true, capaciteMax: true },
        },
      },
      orderBy: { entrepot: { nom: 'asc' } },
    });

    // Stock total = somme des StockEntrepot (calcul dynamique — source de vérité)
    const totalGlobal = stocks.reduce((sum, s) => sum + s.quantite, 0);

    return {
      produit,
      totalGlobal,
      localisations: stocks.map((s) => ({
        entrepot: s.entrepot,
        quantite: s.quantite,
        updatedAt: s.updatedAt,
      })),
    };
  }

  /**
   * Returns every product stored in a specific warehouse,
   * along with the localised quantity for each product.
   *
   * Use case: "What products are in this warehouse, and in what quantities?"
   *
   * @param entrepotId UUID of the target warehouse
   */
  async findByEntrepot(entrepotId: string) {
    // Verify warehouse exists
    const entrepot = await this.prisma.entrepot.findUnique({
      where: { id: entrepotId },
      select: {
        id: true,
        nom: true,
        adresse: true,
        capaciteMax: true,
      },
    });
    if (!entrepot) {
      throw new NotFoundException(`Entrepot with ID ${entrepotId} not found`);
    }

    const stocks = await this.prisma.stockEntrepot.findMany({
      where: { entrepotId },
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            codeBare: true,
            category: true,
            stockAlert: true,
            prixAchatMoyen: true,
          },
        },
      },
      orderBy: { produit: { nom: 'asc' } },
    });

    // Stock total de l'entrepôt = somme dynamique (remplace stockActuelle)
    const stockTotalEntrepot = stocks.reduce((sum, s) => sum + s.quantite, 0);

    return {
      entrepot: {
        ...entrepot,
        stockTotalEntrepot,
      },
      produits: stocks.map((s) => ({
        produit: s.produit,
        quantite: s.quantite,
        updatedAt: s.updatedAt,
      })),
    };
  }

  /**
   * Returns the exact localised stock for ONE product in ONE warehouse.
   *
   * @param produitId   UUID of the product
   * @param entrepotId  UUID of the warehouse
   */
  async findOne(produitId: string, entrepotId: string) {
    const stock = await this.prisma.stockEntrepot.findUnique({
      where: {
        produitId_entrepotId: { produitId, entrepotId },
      },
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            codeBare: true,
            category: true,
            stockAlert: true,
          },
        },
        entrepot: {
          select: {
            id: true,
            nom: true,
            adresse: true,
            capaciteMax: true,
          },
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `Aucun stock trouvé pour le produit ${produitId} dans l'entrepôt ${entrepotId}`,
      );
    }

    return stock;
  }

  async exportCsv(filters?: { produitId?: string; entrepotId?: string }) {
    const rows = await this.prisma.stockEntrepot.findMany({
      where: {
        produitId: filters?.produitId || undefined,
        entrepotId: filters?.entrepotId || undefined,
      },
      include: {
        produit: {
          select: {
            id: true,
            nom: true,
            codeBare: true,
            category: true,
            stockAlert: true,
            prixAchatMoyen: true,
          },
        },
        entrepot: {
          select: {
            id: true,
            nom: true,
            adresse: true,
          },
        },
      },
      orderBy: [{ entrepot: { nom: 'asc' } }, { produit: { nom: 'asc' } }],
    });

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (/[",;\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const header = [
      'produit_id',
      'produit_nom',
      'code_barre',
      'categorie',
      'stock_alerte',
      'prix_achat_moyen',
      'entrepot_id',
      'entrepot_nom',
      'entrepot_adresse',
      'quantite',
      'updated_at',
    ];

    const lines = rows.map((row) =>
      [
        row.produit.id,
        row.produit.nom,
        row.produit.codeBare,
        row.produit.category,
        row.produit.stockAlert,
        row.produit.prixAchatMoyen ?? '',
        row.entrepot.id,
        row.entrepot.nom,
        row.entrepot.adresse ?? '',
        row.quantite,
        row.updatedAt.toISOString(),
      ]
        .map(escapeCsv)
        .join(';'),
    );

    return [header.join(';'), ...lines].join('\n');
  }
}
