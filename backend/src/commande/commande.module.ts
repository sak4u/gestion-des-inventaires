import { Module } from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropositionCommandeModule } from '../proposition-commande/proposition-commande.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [MailModule, NotificationsModule, PropositionCommandeModule, AiModule],
  controllers: [CommandeController],
  providers: [CommandeService],
  exports: [CommandeService],
})
export class CommandeModule {}
