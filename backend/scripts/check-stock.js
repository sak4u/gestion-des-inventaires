const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.produit.findMany();
  console.log('--- Products ---');
  for (const p of products) {
    const stock = await prisma.stockEntrepot.aggregate({
      where: { produitId: p.id },
      _sum: { quantite: true }
    });
    const stockTotal = stock._sum.quantite ?? 0;
    console.log(`${p.nom}: Stock=${stockTotal}, Alert=${p.stockAlert} ${stockTotal <= p.stockAlert ? '!! LOW !!' : ''}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
