import { PrismaClient, StatutProposition } from '@prisma/client';
import { AI_CONFIG } from '../src/ai/config/ai.config';

const prisma = new PrismaClient();

async function debugProductProp(produitNom: string) {
  const produit = await prisma.produit.findFirst({
    where: { nom: { contains: produitNom, mode: 'insensitive' } },
  });

  if (!produit) {
    console.log(`❌ Produit "${produitNom}" non trouvé.`);
    return;
  }

  console.log(`\n--- Diagnostic pour "${produit.nom}" (${produit.id}) ---`);
  console.log(`Seuil d'alerte configuré: ${produit.stockAlert}`);

  const stockAgg = await prisma.stockEntrepot.aggregate({
    where: { produitId: produit.id },
    _sum: { quantite: true },
  });
  const stockTotal = stockAgg._sum.quantite ?? 0;
  console.log(`Stock total actuel: ${stockTotal}`);

  if (stockTotal > (produit.stockAlert ?? 0)) {
    console.log(`⚠️  SKIP: Stock (${stockTotal}) > Alerte (${produit.stockAlert}).`);
  } else {
    console.log(`✅  Condition d'alerte remplie (${stockTotal} <= ${produit.stockAlert}).`);
  }

  const existingPending = await prisma.propositionCommande.findFirst({
    where: { produitId: produit.id, statut: StatutProposition.EN_ATTENTE },
  });
  
  if (existingPending) {
    console.log(`⚠️  SKIP: Une proposition existante est déjà EN_ATTENTE (ID: ${existingPending.id}).`);
    console.log(`Quantité proposée auparavant: ${existingPending.quantiteProposee}`);
  } else {
    console.log(`✅  Aucune proposition en attente.`);
  }

  // Simulation calcul CMJ (on prend une valeur simplifiée pour le debug)
  // En réalité il faudrait appeler le service, mais on va juste voir si quantiteRecommande serait > 0
  const cmj_estime = 0.5; // Exemple
  const quantiteRecommande = Math.max(
    0,
    Math.ceil(
      cmj_estime * AI_CONFIG.DELAI_LIVRAISON +
        AI_CONFIG.STOCK_SECURITE -
        stockTotal,
    ),
  );
  console.log(`Calcul théorique Qte Recommandée (avec CMJ=0.5): ${quantiteRecommande}`);
  
  const latestPrediction = await prisma.prediction.findFirst({
    where: { produitId: produit.id },
    orderBy: { createdAt: 'desc' },
  });
  
  if (latestPrediction) {
    console.log(`\nDernière prédiction enregistrée:`);
    console.log(`- Date: ${latestPrediction.createdAt}`);
    console.log(`- CMJ: ${latestPrediction.CMJ}`);
    console.log(`- Qte Recommandée: ${latestPrediction.quantiteRecommande}`);
  } else {
    console.log(`\n❌  Aucune prédiction trouvée en base.`);
  }
}

async function listAlertProducts() {
  const products = await prisma.produit.findMany({
    select: { id: true, nom: true, stockAlert: true },
  });
  console.log('--- Produits en état d\'ALERTE ---');
  let found = false;
  for (const p of products) {
    const stockSum = await prisma.stockEntrepot.aggregate({
      where: { produitId: p.id },
      _sum: { quantite: true },
    });
    const stock = stockSum._sum.quantite || 0;
    if (stock <= (p.stockAlert || 0)) {
      console.log(`- ${p.nom} (Stock: ${stock}, Alert: ${p.stockAlert})`);
      found = true;
    }
  }
  if (!found) console.log('Aucun produit en alerte.');
}

async function main() {
  const args = process.argv.slice(2);
  const productName = args[0] || '';
  if (!productName) {
    await listAlertProducts();
    return;
  }
  await debugProductProp(productName);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
