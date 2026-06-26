const { PrismaClient } = require('@prisma/client');
const { PropositionCommandeService } = require('../dist/proposition-commande/proposition-commande.service');
const { PredictionService } = require('../dist/ai/prediction/prediction.service');
const { StatisticsService } = require('../dist/ai/analytics/statistics.service');
const { AnomalyService } = require('../dist/ai/analytics/anomaly.service');
const { TrendService } = require('../dist/ai/analytics/trend.service');
const { MovingAverageModel } = require('../dist/ai/models/moving-average.model');
const { LinearRegressionModel } = require('../dist/ai/models/regression.model');
const { HybridPredictionModel } = require('../dist/ai/models/hybrid.model');

// This is complex because of NestJS dependency injection.
// I'll just use a simple script that directly uses Prisma to create some dummy propositions for testing if the UI works.

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.produit.findFirst();
  const supplier = await prisma.fournisseur.findFirst();
  
  if (!product || !supplier) {
    console.log('Need at least one product and one supplier.');
    return;
  }

  const prop = await prisma.propositionCommande.create({
    data: {
      produitId: product.id,
      fournisseurId: supplier.id,
      quantiteProposee: 50,
      scoreFournisseur: 0.85,
      statut: 'EN_ATTENTE',
    }
  });

  console.log('Created test proposition:', prop.id);
}

main().finally(() => prisma.$disconnect());
