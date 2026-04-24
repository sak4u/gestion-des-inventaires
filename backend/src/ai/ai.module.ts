import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// Analytics
import { StatisticsService } from './analytics/statistics.service';
import { AnomalyService } from './analytics/anomaly.service';
import { TrendService } from './analytics/trend.service';

// Models
import { MovingAverageModel } from './models/moving-average.model';
import { LinearRegressionModel } from './models/regression.model';
import { HybridPredictionModel } from './models/hybrid.model';

// Prediction
import { PredictionService } from './prediction/prediction.service';
import { PredictionController } from './prediction/prediction.controller';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AiModule
 *
 * Self-contained AI engine module.  Import this once into AppModule
 * and the entire prediction pipeline is available system-wide.
 *
 * What is registered here:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  Analytics      StatisticsService, AnomalyService,          │
 *  │                 TrendService                                 │
 *  │  Models         MovingAverageModel, LinearRegressionModel,   │
 *  │                 HybridPredictionModel                        │
 *  │  Prediction     PredictionService (orchestrator),           │
 *  │                 PredictionController                         │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * NOTE: PredictionCron has been REMOVED. All scheduled prediction
 * generation is handled by StockSchedulerService to avoid duplicate
 * cron executions at midnight.
 *
 * Exported:
 *  PredictionService — so that StockSchedulerModule and
 *  PropositionCommandeModule can consume it without importing the
 *  entire module chain.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  controllers: [PredictionController],
  providers: [
    // ── Analytics ────────────────────────────────────────────────
    StatisticsService,
    AnomalyService,
    TrendService,

    // ── Models ───────────────────────────────────────────────────
    MovingAverageModel,
    LinearRegressionModel,
    HybridPredictionModel,

    // ── Orchestrator ─────────────────────────────────────────────
    PredictionService,
  ],
  exports: [
    // Export only the orchestrator so other modules stay decoupled
    // from the internal AI implementation details.
    PredictionService,
  ],
})
export class AiModule {}
