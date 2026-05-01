import { Module } from '@nestjs/common';
import { CommandeService } from './commande.service';
import { CommandeController } from './commande.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [CommandeController],
  providers: [CommandeService],
  exports: [CommandeService],
})
export class CommandeModule {}
