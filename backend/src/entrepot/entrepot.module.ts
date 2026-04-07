import { Module } from '@nestjs/common';
import { EntrepotService } from './entrepot.service';
import { EntrepotController } from './entrepot.controller';

@Module({
  controllers: [EntrepotController],
  providers: [EntrepotService],
  exports: [EntrepotService],
})
export class EntrepotModule {}
