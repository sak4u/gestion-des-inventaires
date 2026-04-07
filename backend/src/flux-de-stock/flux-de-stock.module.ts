import { Module } from '@nestjs/common';
import { FluxDeStockService } from './flux-de-stock.service';
import { FluxDeStockController } from './flux-de-stock.controller';

@Module({
  controllers: [FluxDeStockController],
  providers: [FluxDeStockService],
  exports: [FluxDeStockService],
})
export class FluxDeStockModule {}
