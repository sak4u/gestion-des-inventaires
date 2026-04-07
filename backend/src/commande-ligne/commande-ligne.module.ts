import { Module } from '@nestjs/common';
import { CommandeLigneService } from './commande-ligne.service';
import { CommandeLigneController } from './commande-ligne.controller';

@Module({
  controllers: [CommandeLigneController],
  providers: [CommandeLigneService],
  exports: [CommandeLigneService],
})
export class CommandeLigneModule {}
