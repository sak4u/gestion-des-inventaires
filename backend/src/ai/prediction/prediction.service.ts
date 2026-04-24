import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AI_CONFIG } from '../config/ai.config';
import { StatisticsService } from '../analytics/statistics.service';
import { AnomalyService } from '../analytics/anomaly.service';
import { TrendService } from '../analytics/trend.service';
import { MovingAverageModel } from '../models/moving-average.model';
import { LinearRegressionModel } from '../models/regression.model';
import { HybridPredictionModel } from '../models/hybrid.model';
import {
  BatchPredictionResult,
  DailyDataPoint,
  ExplanationParams,
  PredictionResult,
  TrendDirection,
} from './prediction.types';

/**
 * PredictionService — ORCHESTRATOR
 *
 * This service is the single entry-point for the prediction pipeline.
 * It does NOT contain any math logic; it delegates:
 *
 *  ┌─────────────────────────────────────────────────────────────┐
 *  │  Step 1  Build time-series      → getSalesTimeSeries()      │
 *  │  Step 2  Compute statistics     → StatisticsService         │
 *  │  Step 3  Run models             → MovingAverageModel        │
 *  │                                    LinearRegressionModel    │
 *  │                                    HybridPredictionModel    │
 *  │  Step 4  Detect anomalies       → AnomalyService            │
 *  │  Step 5  Classify trend         → TrendService              │
 *  │  Step 6  Stockout estimation    → inline (pure arithmetic)  │
 *  │  Step 7  Explanation            → generateExplanation()     │
 *  │  Step 8  Persist via CREATE     → PrismaService             │
 *  └─────────────────────────────────────────────────────────────┘
 *
 * HISTORY: Each call to generatePrediction() creates a NEW Prediction
 * record. Historical predictions are preserved for model accuracy
 * tracking and continuous improvement.
 */
@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly statisticsService: StatisticsService,
    private readonly anomalyService: AnomalyService,
    private readonly trendService: TrendService,
    private readonly movingAverageModel: MovingAverageModel,
    private readonly regressionModel: LinearRegressionModel,
    private readonly hybridModel: HybridPredictionModel,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  CRUD — backward-compatible read operations
  // ═══════════════════════════════════════════════════════════════════

  /** Returns all predictions, most recent first, with their product */
  async findAll() {
    return this.prisma.prediction.findMany({
      include: { produit: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Returns a single prediction by its primary key */
  async findOne(id: string) {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id },
      include: { produit: true },
    });
    if (!prediction) {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
    return prediction;
  }

  /**
   * Returns the latest (most recent) prediction for a specific product.
   * Since predictions now have history, we use findFirst with ordering.
   */
  async findLatestByProduct(produitId: string) {
    const prediction = await this.prisma.prediction.findFirst({
      where: { produitId },
      orderBy: { createdAt: 'desc' },
      include: { produit: true },
    });
    if (!prediction) {
      throw new NotFoundException(
        `No prediction found for product ${produitId}`,
      );
    }
    return prediction;
  }

  /**
   * Returns all historical predictions for a specific product.
   * Useful for tracking model accuracy over time.
   */
  async findHistoryByProduct(produitId: string) {
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true },
    });
    if (!produit) {
      throw new NotFoundException(`Produit with ID ${produitId} not found`);
    }

    const predictions = await this.prisma.prediction.findMany({
      where: { produitId },
      orderBy: { createdAt: 'desc' },
    });

    return { produit, predictions };
  }

  /** Deletes a prediction by its primary key */
  async remove(id: string) {
    try {
      return await this.prisma.prediction.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  TIME-SERIES BUILDER
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Builds a continuous daily sales time-series for a product.
   *
   * Steps:
   *  1. Query FluxDeStock where type = "vente" within the last `days` days
   *  2. Group totals by UTC calendar day
   *  3. Fill missing days with quantity = 0 (no sales = zero consumption)
   *
   * IMPORTANT: All date arithmetic uses UTC methods to avoid timezone-
   * shift bugs when comparing against PostgreSQL UTC-stored timestamps.
   *
   * @param produitId  Target product
   * @param days       History window in days (default from AI_CONFIG)
   */
  async getSalesTimeSeries(
    produitId: string,
    days: number = AI_CONFIG.HISTORY_DAYS,
  ): Promise<DailyDataPoint[]> {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    const fluxes = await this.prisma.fluxDeStock.findMany({
      where: {
        produitId,
        type: 'vente',
        date: { gte: startDate },
      },
      select: { date: true, quantite: true },
      orderBy: { date: 'asc' },
    });

    // Group by "YYYY-MM-DD" key for O(1) lookups
    const dailyMap = new Map<string, number>();
    for (const flux of fluxes) {
      const key = flux.date.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(flux.quantite));
    }

    // Build continuous series — fill gaps with quantity = 0
    const series: DailyDataPoint[] = [];
    const cursor = new Date(startDate);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({ date: new Date(cursor), quantity: dailyMap.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return series;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  EXPLANATION GENERATOR  (pure text, no external dependencies)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Generates a human-readable French explanation of the prediction.
   *
   * Covers:
   *  1. Demand trend direction and magnitude
   *  2. Stockout urgency
   *  3. Confidence level
   *  4. Anomaly warnings
   */
  generateExplanation(params: ExplanationParams): string {
    const parts: string[] = [];

    // ── 1. Trend or inactivity ────────────────────────────────────
    if (params.mean === 0 && params.cmj === 0) {
      return 'Aucune consommation détectée — produit nouveau ou inactif.';
    }

    switch (params.tendance) {
      case 'increasing':
        parts.push(
          `La consommation est en hausse (+${params.slope.toFixed(2)}/jour).`,
        );
        break;
      case 'decreasing':
        parts.push(
          `La consommation est en baisse (${params.slope.toFixed(2)}/jour).`,
        );
        break;
      case 'stable':
        parts.push(
          `Demande stable avec une consommation moyenne de ${params.cmj.toFixed(1)} unités/jour.`,
        );
        break;
    }

    // ── 2. Stockout urgency ───────────────────────────────────────
    if (params.daysBeforeStockout <= 3) {
      parts.push(
        `⚠️ URGENT: rupture de stock estimée dans ${params.daysBeforeStockout} jour(s)!`,
      );
    } else if (params.daysBeforeStockout <= 7) {
      parts.push(
        `Attention: rupture de stock estimée dans ${params.daysBeforeStockout} jours.`,
      );
    } else if (params.daysBeforeStockout <= 30) {
      parts.push(
        `Stock suffisant pour environ ${params.daysBeforeStockout} jours.`,
      );
    } else if (params.daysBeforeStockout < 9999) {
      parts.push(
        `Stock confortable — durée estimée: ${params.daysBeforeStockout} jours.`,
      );
    }

    // ── 3. Confidence ─────────────────────────────────────────────
    const confPct = Math.round(params.fiabilite * 100);
    if (params.fiabilite >= 0.8) {
      parts.push(`Fiabilité élevée (${confPct}%).`);
    } else if (params.fiabilite >= 0.5) {
      parts.push(`Fiabilité modérée (${confPct}%) — variance notable.`);
    } else if (params.fiabilite > 0) {
      parts.push(`Fiabilité faible (${confPct}%) — demande très irrégulière.`);
    }

    // ── 4. Anomaly warnings ───────────────────────────────────────
    if (params.anomalyCount > 0) {
      parts.push(
        `${params.anomalyCount} jour(s) anormal(aux) détecté(s) dans l'historique.`,
      );
    }

    return parts.join(' ');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GENERATE PREDICTION — main orchestration pipeline
  //  Now creates a NEW record each time (history is preserved).
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Runs the full prediction pipeline for a single product and persists
   * the result as a NEW Prediction record (historical predictions are kept).
   *
   * Returns the full PredictionResult including the persisted record ID,
   * so downstream services (e.g. PropositionCommandeService) can link
   * directly without an additional findFirst() lookup.
   *
   * @param produitId  UUID of the target product
   */
  async generatePrediction(produitId: string): Promise<PredictionResult> {
    // ── Step 1: Verify product & fetch current stock ──────────────
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true, stockAlert: true },
    });
    if (!produit) {
      throw new NotFoundException(`Produit with ID ${produitId} not found`);
    }

    // Calcul dynamique du stock total réel (SOMME des StockEntrepot)
    const stockAgg = await this.prisma.stockEntrepot.aggregate({
      where: { produitId },
      _sum: { quantite: true },
    });
    const stockTotal = stockAgg._sum.quantite ?? 0;

    // ── Step 2: Build daily sales time-series ─────────────────────
    const series = await this.getSalesTimeSeries(produitId, AI_CONFIG.HISTORY_DAYS);

    // ── Step 3: Compute statistics ────────────────────────────────
    //   fullStats   → entire window including zero-days (trend & anomaly)
    //   activeStats → only days with sales > 0 (CMJ & confidence)
    const fullStats = this.statisticsService.computeStatistics(series);
    const activeStats = this.statisticsService.computeActiveDayStatistics(series);

    const hasHistory = activeStats.count > 0 && activeStats.total > 0;

    // ── Step 4: Run prediction models ─────────────────────────────
    const movingAverage = this.movingAverageModel.compute(series);
    const regression = this.regressionModel.compute(series, movingAverage);
    const hybridRaw = this.hybridModel.compute(
      movingAverage,
      regression.predictedLatest,
    );

    // ── Step 5: Determine CMJ (Consommation Moyenne Journalière) ──
    let cmj: number;
    if (!hasHistory) {
      // Truly inactive product
      cmj = 0;
    } else if (activeStats.count >= AI_CONFIG.MIN_ACTIVE_DAYS_FOR_HYBRID) {
      // Enough data: use hybrid but floor with active-day mean to avoid
      // near-zero dilution from zero-filled days
      cmj = Math.max(hybridRaw, activeStats.mean * AI_CONFIG.ACTIVE_MEAN_FLOOR_RATIO);
    } else {
      // Too few active days for regression to be reliable
      cmj = activeStats.mean;
    }

    const hybridValue = cmj;

    // ── Step 6: Confidence & anomalies ───────────────────────────
    const fiabilite = hasHistory
      ? this.statisticsService.calculateConfidence(activeStats)
      : 0;
    const anomalies = this.anomalyService.detectAnomalies(series, fullStats);

    // ── Step 7: Trend detection ───────────────────────────────────
    const tendance: TrendDirection = this.trendService.detectTrend(
      regression.slope,
      activeStats.mean,
    );

    // ── Step 8: Stockout estimation ───────────────────────────────
    //   Sentinel 9999 = stock won't run out (zero consumption)
    const daysBeforeStockout =
      cmj > 0 ? Math.floor(stockTotal / cmj) : 9999;

    const estimationSortieDate = new Date();
    estimationSortieDate.setDate(
      estimationSortieDate.getDate() + daysBeforeStockout,
    );

    // ── Step 9: Recommended reorder quantity ──────────────────────
    //   Formula: qty = (CMJ × leadTime) + safetyStock − currentStock
    const quantiteRecommande = Math.max(
      0,
      Math.ceil(
        cmj * AI_CONFIG.DELAI_LIVRAISON +
          AI_CONFIG.STOCK_SECURITE -
          stockTotal,
      ),
    );

    // ── Step 10: Human-readable explanation ───────────────────────
    const explication = this.generateExplanation({
      slope: regression.slope,
      mean: activeStats.mean,
      tendance,
      daysBeforeStockout,
      fiabilite,
      anomalyCount: anomalies.length,
      cmj,
      currentStock: stockTotal,
    });

    // ── Step 11: Persist as a NEW record (history preserved) ──────
    const predictionData = {
      estimationSortieDate,
      quantiteRecommande,
      CMJ: Math.round(cmj * 100) / 100,
      methode: 'hybrid',
      fiabilite: Math.round(fiabilite * 100) / 100,
      explication,
      tendance,
    };

    const prediction = await this.prisma.prediction.create({
      data: { produitId, ...predictionData },
    });

    this.logger.log(
      `Prediction [${prediction.id}] for "${produit.nom}": ` +
        `CMJ=${cmj.toFixed(2)} (${activeStats.count} active day(s)), ` +
        `trend=${tendance}, stockout in ${daysBeforeStockout} days, ` +
        `reorder=${quantiteRecommande}, confidence=${(fiabilite * 100).toFixed(0)}%`,
    );

    return {
      predictionId: prediction.id,
      cmj,
      movingAverage,
      regressionSlope: regression.slope,
      hybridValue,
      daysBeforeStockout,
      estimationSortieDate,
      quantiteRecommande,
      fiabilite,
      methode: 'hybrid',
      explication,
      tendance,
      anomalies,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  BATCH — Generate predictions for ALL products
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Iterates all products and generates their prediction sequentially.
   * Individual failures are caught and collected — one bad product
   * does not abort the rest of the batch.
   *
   * @returns BatchPredictionResult: total, generated, errors[]
   */
  async generateAllPredictions(): Promise<BatchPredictionResult> {
    const products = await this.prisma.produit.findMany({
      select: { id: true, nom: true },
    });

    const errors: string[] = [];
    let generated = 0;

    for (const product of products) {
      try {
        await this.generatePrediction(product.id);
        generated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Product "${product.nom}" (${product.id}): ${msg}`);
        this.logger.warn(
          `Failed to generate prediction for "${product.nom}": ${msg}`,
        );
      }
    }

    this.logger.log(
      `Batch prediction complete: ${generated}/${products.length} succeeded` +
        (errors.length > 0 ? `, ${errors.length} failed` : ''),
    );

    return { total: products.length, generated, errors };
  }
}
