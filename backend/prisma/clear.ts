import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Vidage de la base de données ---');

  try {
    await prisma.propositionCommande.deleteMany();
    await prisma.prediction.deleteMany();
    await prisma.fluxDeStock.deleteMany();
    await prisma.commandeLigne.deleteMany();
    await prisma.commande.deleteMany();
    await prisma.stockEntrepot.deleteMany();
    await prisma.fournisseurProduit.deleteMany();
    await prisma.produit.deleteMany();
    await prisma.fournisseur.deleteMany();
    await prisma.entrepot.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    console.log('✔ Base de données vidée avec succès.');
  } catch (error) {
    console.error('✖ Erreur lors du vidage :', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
