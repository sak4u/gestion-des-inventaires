import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PredictionService } from '../src/ai/prediction/prediction.service';
import { PropositionCommandeService } from '../src/proposition-commande/proposition-commande.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const predictionService = app.get(PredictionService);
  const propositionService = app.get(PropositionCommandeService);

  console.log('--- Lancement des Prédictions AI ---');
  await predictionService.generateAllPredictions();
  console.log('✔ Prédictions générées avec succès.');

  console.log('--- Lancement des Propositions de Commande ---');
  await propositionService.checkAllProducts();
  console.log('✔ Propositions générées avec succès.');

  await app.close();
}

bootstrap()
  .then(() => console.log('Script terminé.'))
  .catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
  });
