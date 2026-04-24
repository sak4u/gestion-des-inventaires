import { Module } from '@nestjs/common';
import { StockSchedulerService } from './stock-scheduler.service';
import { AiModule } from '../ai/ai.module';
import { PropositionCommandeModule } from '../proposition-commande/proposition-commande.module';

/**
 * StockSchedulerModule
 *
 * Imports AiModule (which exports PredictionService) so the daily
 * stock-replenishment cron can trigger prediction generation and
 * then check for low-stock propositions.
 */
@Module({
  imports: [AiModule, PropositionCommandeModule],
  providers: [StockSchedulerService],
})
export class StockSchedulerModule {}
