import { Module } from '@nestjs/common';
import { PropositionCommandeService } from './proposition-commande.service';
import { PropositionCommandeController } from './proposition-commande.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [PropositionCommandeController],
  providers: [PropositionCommandeService],
  exports: [PropositionCommandeService],
})
export class PropositionCommandeModule {}
