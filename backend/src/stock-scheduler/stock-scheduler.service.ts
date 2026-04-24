import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PredictionService } from '../ai/prediction/prediction.service';
import { PropositionCommandeService } from '../proposition-commande/proposition-commande.service';

/**
 * StockSchedulerService
 *
 * Runs automated tasks on a schedule to keep the stock prediction
 * and replenishment system up to date.
 *
 * Schedule:
 *   - Daily at midnight: recalculate ALL predictions, then check for
 *     low-stock products and generate purchase-order propositions.
 *
 * This is the "autonomous brain" of the system — it runs without
 * human intervention and ensures predictions stay fresh.
 */
@Injectable()
export class StockSchedulerService {
  private readonly logger = new Logger(StockSchedulerService.name);

  constructor(
    private readonly predictionService: PredictionService,
    private readonly propositionService: PropositionCommandeService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  //  DAILY CRON JOB — runs every day at midnight
  // ─────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyStockCheck() {
    const startTime = Date.now();
    this.logger.log('═══════════════════════════════════════════');
    this.logger.log('🕛 Daily stock check started...');
    this.logger.log('═══════════════════════════════════════════');

    // Each step is wrapped in its own try/catch so that a failure
    // in one step doesn't prevent the other from running.

    // ── Step 1: Recalculate predictions for all products ──
    let predictionResult: {
      total: number;
      generated: number;
      errors: string[];
    } = { total: 0, generated: 0, errors: [] };

    try {
      const predictionStart = Date.now();
      predictionResult =
        await this.predictionService.generateAllPredictions();
      const predictionDuration = Date.now() - predictionStart;

      this.logger.log(
        `📊 Predictions: ${predictionResult.generated}/${predictionResult.total} generated ` +
          `(${predictionDuration}ms)`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Prediction step crashed unexpectedly: ${msg}`,
      );
      predictionResult.errors.push(`FATAL: ${msg}`);
    }

    // ── Step 2: Detect low stock & generate propositions ──
    let propositionResult: {
      checked: number;
      propositionsCreated: number;
      skipped: number;
      errors: string[];
    } = { checked: 0, propositionsCreated: 0, skipped: 0, errors: [] };

    try {
      const propositionStart = Date.now();
      propositionResult =
        await this.propositionService.checkAllProducts();
      const propositionDuration = Date.now() - propositionStart;

      this.logger.log(
        `📋 Propositions: ${propositionResult.propositionsCreated} created, ` +
          `${propositionResult.skipped} skipped ` +
          `out of ${propositionResult.checked} low-stock products ` +
          `(${propositionDuration}ms)`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Proposition step crashed unexpectedly: ${msg}`,
      );
      propositionResult.errors.push(`FATAL: ${msg}`);
    }

    // ── Log errors if any ──
    if (predictionResult.errors.length > 0) {
      this.logger.warn(
        `⚠️  Prediction errors (${predictionResult.errors.length}):\n` +
          predictionResult.errors.map((e) => `  - ${e}`).join('\n'),
      );
    }
    if (propositionResult.errors.length > 0) {
      this.logger.warn(
        `⚠️  Proposition errors (${propositionResult.errors.length}):\n` +
          propositionResult.errors.map((e) => `  - ${e}`).join('\n'),
      );
    }

    // ── Summary ──
    const totalDuration = Date.now() - startTime;
    this.logger.log('═══════════════════════════════════════════');
    this.logger.log(
      `✅ Daily stock check completed in ${totalDuration}ms`,
    );
    this.logger.log('═══════════════════════════════════════════');
  }
}
