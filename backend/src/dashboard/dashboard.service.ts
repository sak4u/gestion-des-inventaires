import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis() {
    const [produits, entrepots, commandesEnCours, commandesStats] = await Promise.all([
      this.prisma.produit.findMany({
        include: { stockEntrepots: { select: { quantite: true } } },
      }),
      this.prisma.entrepot.findMany({
        include: {
          stockEntrepots: {
            include: { produit: { select: { prixAchatMoyen: true, nom: true } } },
          },
        },
      }),
      this.prisma.commande.count({ where: { etat: 'EN_COURS' } }),
      this.prisma.commande.findMany({
        where: { etat: 'LIVREE' },
        select: {
          commandesLigne: { select: { quantite: true, prixUnitaire: true } },
        },
      }),
    ]);

    const produitsEnAlerte = produits.filter((p) => {
      const stockTotal = p.stockEntrepots.reduce((s, se) => s + se.quantite, 0);
      return stockTotal <= (p as any).stockAlert;
    }).length;

    const valeurStock = produits.reduce((acc, p) => {
      const stockTotal = p.stockEntrepots.reduce((s, se) => s + se.quantite, 0);
      return acc + ((p as any).prixAchatMoyen ?? 0) * stockTotal;
    }, 0);

    let revenue = 0;
    let profit = 0;
    for (const cmd of commandesStats) {
      for (const ligne of cmd.commandesLigne) {
        revenue += ligne.quantite * ligne.prixUnitaire;
      }
    }
    profit = revenue * 0.2; // simplified margin estimate

    return {
      totalProduits: produits.length,
      produitsEnAlerte,
      commandesEnCours,
      valeurStock,
      revenue,
      profit,
    };
  }
}
