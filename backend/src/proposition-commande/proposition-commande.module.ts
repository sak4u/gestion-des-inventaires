import { Module } from '@nestjs/common';
import { PropositionCommandeService } from './proposition-commande.service';
import { PropositionCommandeController } from './proposition-commande.controller';
import { PredictionModule } from '../prediction/prediction.module';

@Module({
  imports: [PredictionModule],
  controllers: [PropositionCommandeController],
  providers: [PropositionCommandeService],
  exports: [PropositionCommandeService],
})
export class PropositionCommandeModule {}
