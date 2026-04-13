import { Module } from '@nestjs/common';
import { StockSchedulerService } from './stock-scheduler.service';
import { PredictionModule } from '../prediction/prediction.module';
import { PropositionCommandeModule } from '../proposition-commande/proposition-commande.module';

@Module({
  imports: [PredictionModule, PropositionCommandeModule],
  providers: [StockSchedulerService],
})
export class StockSchedulerModule {}
