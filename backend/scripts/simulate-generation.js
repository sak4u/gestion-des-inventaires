const { PrismaClient } = require('@prisma/client');
// I'll try to find the compiled service if it exists, otherwise I'll use Prisma directly to see what checkAllProducts would do.

async function main() {
  const prisma = new PrismaClient();
  
  // Simulation de checkAllProducts
  const lowStockProducts = await prisma.$queryRaw`
      SELECT p.id, p.nom
      FROM "Produit" p
      WHERE COALESCE(
        (SELECT SUM(se.quantite) FROM "StockEntrepot" se WHERE se."produitId" = p.id),
        0
      ) <= p."stockAlert"
    `;
    
  console.log('Low stock products count:', lowStockProducts.length);
  
  for (const p of lowStockProducts) {
    console.log(`Checking ${p.nom} (${p.id})...`);
    // Check if there's a pending prop
    const existing = await prisma.propositionCommande.findFirst({
        where: { produitId: p.id, statut: 'EN_ATTENTE' }
    });
    if (existing) {
        console.log(`  -> Already has pending prop: ${existing.id}`);
        continue;
    }
    
    // Check if there are suppliers
    const suppliers = await prisma.fournisseurProduit.findMany({
        where: { produitId: p.id }
    });
    if (suppliers.length === 0) {
        console.log(`  -> No suppliers found.`);
        continue;
    }
    
    // Check if there are sales (for CMJ)
    const sales = await prisma.fluxDeStock.findMany({
        where: { produitId: p.id, type: 'vente' }
    });
    console.log(`  -> Sales count: ${sales.length}`);
  }
}

main().catch(console.error);
