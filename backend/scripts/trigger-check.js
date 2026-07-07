const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/src/app.module');
const { PropositionCommandeService } = require('../dist/src/proposition-commande/proposition-commande.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(PropositionCommandeService);
  
  console.log('Triggering batch check...');
  const result = await service.checkAllProducts();
  console.log('Result:', JSON.stringify(result, null, 2));
  
  await app.close();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
