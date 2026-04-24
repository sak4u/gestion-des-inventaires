import { Module } from '@nestjs/common';
import { StockEntrepotService } from './stock-entrepot.service';
import { StockEntrepotController } from './stock-entrepot.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * StockEntrepotModule
 *
 * Self-contained module that answers the question:
 * "In which warehouse is this product stored, and in what quantity?"
 *
 * It does NOT handle stock mutations — those are done atomically
 * inside FluxDeStockModule transactions.
 */
@Module({
  imports: [PrismaModule],
  controllers: [StockEntrepotController],
  providers: [StockEntrepotService],
  exports: [StockEntrepotService], // Export in case other modules need localised stock data
})
export class StockEntrepotModule {}
