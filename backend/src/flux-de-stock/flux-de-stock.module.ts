import { Module } from '@nestjs/common';
import { FluxDeStockService } from './flux-de-stock.service';
import { FluxDeStockController } from './flux-de-stock.controller';
import { AiModule } from '../ai/ai.module';
import { PropositionCommandeModule } from '../proposition-commande/proposition-commande.module';

@Module({
  imports: [AiModule, PropositionCommandeModule],
  controllers: [FluxDeStockController],
  providers: [FluxDeStockService],
  exports: [FluxDeStockService],
})
export class FluxDeStockModule {}
