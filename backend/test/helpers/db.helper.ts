import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Supprime les données de test créées pendant les specs.
 * À appeler dans afterAll() pour ne pas polluer la base.
 */
export async function cleanTestData(ids: {
  produitIds?: string[];
  fournisseurIds?: string[];
  entrepotIds?: string[];
  commandeIds?: string[];
}) {
  if (ids.commandeIds?.length) {
    await prisma.commandeLigne.deleteMany({ where: { commandeId: { in: ids.commandeIds } } });
    await prisma.fluxDeStock.deleteMany({ where: { commandeId: { in: ids.commandeIds } } });
    await prisma.commande.deleteMany({ where: { id: { in: ids.commandeIds } } });
  }
  if (ids.produitIds?.length) {
    await prisma.stockEntrepot.deleteMany({ where: { produitId: { in: ids.produitIds } } });
    await prisma.commandeLigne.deleteMany({ where: { produitId: { in: ids.produitIds } } });
    await prisma.fournisseurProduit.deleteMany({ where: { produitId: { in: ids.produitIds } } });
    await prisma.produit.deleteMany({ where: { id: { in: ids.produitIds } } });
  }
  if (ids.fournisseurIds?.length) {
    await prisma.fournisseur.deleteMany({ where: { id: { in: ids.fournisseurIds } } });
  }
  if (ids.entrepotIds?.length) {
    await prisma.entrepot.deleteMany({ where: { id: { in: ids.entrepotIds } } });
  }
}

export { prisma };
