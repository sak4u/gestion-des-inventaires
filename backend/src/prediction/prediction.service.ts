import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ═══════════════════════════════════════════════════════════════════
//  CONFIGURABLE CONSTANTS
//  These can be moved to a config file or environment variables
//  for different deployment environments.
// ═══════════════════════════════════════════════════════════════════

/** Default supplier lead-time in days (used as fallback) */
const DELAI_LIVRAISON = 5;

/** Safety-stock buffer (units) — extra stock to prevent stockout */
const STOCK_SECURITE = 20;

/** Window size for the moving-average calculation (days) */
const MOVING_AVERAGE_WINDOW = 30;

/** How many days of history to consider for the time-series */
const HISTORY_DAYS = 90;

/** Hybrid model weights: how much to trust regression vs moving average */
const REGRESSION_WEIGHT = 0.6;
const MOVING_AVG_WEIGHT = 0.4;

/** Threshold for trend detection: slope must be > threshold × mean to be "increasing" */
const TREND_THRESHOLD = 0.05;

/** Z-score threshold for anomaly detection (±N standard deviations) */
const ANOMALY_Z_THRESHOLD = 2;

// ═══════════════════════════════════════════════════════════════════
//  TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════

/** One data-point in a daily time-series */
interface DailyDataPoint {
  date: Date;
  quantity: number;
}

/** Pre-computed statistical summary (computed once, reused everywhere) */
interface SeriesStatistics {
  mean: number;
  variance: number;
  stdDev: number;
  total: number;
  count: number;
}

/** Detected anomaly with z-score */
interface Anomaly {
  date: Date;
  quantity: number;
  zScore: number;
}

/** Trend direction enum */
type TrendDirection = 'increasing' | 'decreasing' | 'stable';

/** Result bundle returned by the hybrid prediction engine */
export interface PredictionResult {
  /** The persisted prediction record ID — use this for downstream linking */
  predictionId: string;
  cmj: number;
  movingAverage: number;
  regressionSlope: number;
  hybridValue: number;
  daysBeforeStockout: number;
  estimationSortieDate: Date;
  quantiteRecommande: number;
  fiabilite: number;
  methode: string;
  explication: string;
  tendance: TrendDirection;
  anomalies: Anomaly[];
}

@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────
  //  CRUD (kept for backward compatibility with the API)
  // ─────────────────────────────────────────────────────────────────

  /** List all predictions, most recent first */
  async findAll() {
    return this.prisma.prediction.findMany({
      include: { produit: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Get a single prediction by its ID */
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
   * Get the latest prediction for a specific product.
   * Since we now enforce @@unique([produitId]), there is at most ONE.
   */
  async findLatestByProduct(produitId: string) {
    const prediction = await this.prisma.prediction.findUnique({
      where: { produitId },
      include: { produit: true },
    });
    if (!prediction) {
      throw new NotFoundException(
        `No prediction found for product ${produitId}`,
      );
    }
    return prediction;
  }

  /** Delete a prediction by ID */
  async remove(id: string) {
    try {
      return await this.prisma.prediction.delete({ where: { id } });
    } catch {
      throw new NotFoundException(`Prediction with ID ${id} not found`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  STATISTICAL HELPERS (compute once, reuse everywhere)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Computes mean, variance, standard deviation for a series.
   *
   * This is extracted into a shared helper to avoid the previous
   * pattern where calculateConfidence() and detectAnomalies() each
   * computed the same statistics independently.
   */
  private computeStatistics(series: DailyDataPoint[]): SeriesStatistics {
    const count = series.length;
    if (count === 0) {
      return { mean: 0, variance: 0, stdDev: 0, total: 0, count: 0 };
    }

    const values = series.map((dp) => dp.quantity);
    const total = values.reduce((a, b) => a + b, 0);
    const mean = total / count;

    // Population variance (not sample variance — we have the full series)
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);

    return { mean, variance, stdDev, total, count };
  }

  /**
   * Computes statistics using ONLY the active days (days with sales > 0).
   *
   * Why: When a product has only 1-2 days of sales in a 90-day window,
   * the overall mean is diluted to near-zero by empty days, causing CMJ=0.
   * Using active-day statistics gives a realistic consumption estimate.
   */
  private computeActiveDayStatistics(series: DailyDataPoint[]): SeriesStatistics {
    const activeDays = series.filter((dp) => dp.quantity > 0);
    return this.computeStatistics(activeDays);
  }

  // ─────────────────────────────────────────────────────────────────
  //  1. TIME-SERIES BUILDER
  // ─────────────────────────────────────────────────────────────────

  /**
   * Builds a daily time-series of sales (type = "vente") for a product.
   *
   * Steps:
   *  - Query FluxDeStock where type = "vente" within the last `days` period
   *  - Group totals by calendar day
   *  - Fill missing days with 0 (gaps = no sales that day)
   *
   * Performance: Uses a single DB query with minimal selected fields.
   */
  async getSalesTimeSeries(
    produitId: string,
    days: number = HISTORY_DAYS,
  ): Promise<DailyDataPoint[]> {
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    startDate.setUTCHours(0, 0, 0, 0);

    // Fetch only the fields we need (date + quantite) to reduce memory usage
    const fluxes = await this.prisma.fluxDeStock.findMany({
      where: {
        produitId,
        type: 'vente',
        date: { gte: startDate },
      },
      select: { date: true, quantite: true },
      orderBy: { date: 'asc' },
    });

    // Group by calendar day (UTC) using a Map for O(1) lookups
    const dailyMap = new Map<string, number>();
    for (const flux of fluxes) {
      const key = flux.date.toISOString().slice(0, 10); // "YYYY-MM-DD" (UTC)
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(flux.quantite));
    }

    // Build continuous series (fill missing days with 0)
    // IMPORTANT: Use UTC methods throughout to avoid timezone mismatches.
    // PostgreSQL stores dates in UTC, and toISOString() returns UTC strings.
    // Using local-time setHours() would shift the cursor by the timezone offset,
    // causing the last day's key to never match the flux date keys.
    const series: DailyDataPoint[] = [];
    const cursor = new Date(startDate);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      series.push({
        date: new Date(cursor),
        quantity: dailyMap.get(key) ?? 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return series;
  }

  // ─────────────────────────────────────────────────────────────────
  //  2. MOVING AVERAGE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Simple Moving Average over the last `window` data-points.
   * Returns the average daily consumption in that window.
   *
   * Why: SMA smooths out noise and short-term fluctuations,
   * giving a stable estimate of "normal" daily consumption.
   */
  calculateMovingAverage(
    series: DailyDataPoint[],
    window: number = MOVING_AVERAGE_WINDOW,
  ): number {
    if (series.length === 0) return 0;

    const slice = series.slice(-window); // take last N days
    const sum = slice.reduce((acc, dp) => acc + dp.quantity, 0);
    return sum / slice.length;
  }

  // ─────────────────────────────────────────────────────────────────
  //  3. LINEAR REGRESSION (Ordinary Least Squares)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Fits  y = intercept + slope·x  where  x = day-index, y = quantity.
   *
   * Returns an object with { slope, intercept, predictedLatest }:
   *  - slope: daily consumption trend (positive = demand increasing)
   *  - intercept: baseline consumption level
   *  - predictedLatest: predicted consumption at the latest data point
   *
   * Why both slope and predictedLatest?
   *  - slope is used for trend detection and explanation
   *  - predictedLatest is used in the hybrid model as the "regression value"
   */
  calculateLinearRegression(
    series: DailyDataPoint[],
  ): { slope: number; intercept: number; predictedLatest: number } {
    const n = series.length;
    if (n < 2) {
      const fallback = this.calculateMovingAverage(series);
      return { slope: 0, intercept: fallback, predictedLatest: fallback };
    }

    // x = 0,1,2,...,n-1   y = quantities
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = series[i].quantity;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      const avg = sumY / n;
      return { slope: 0, intercept: avg, predictedLatest: avg };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Predicted consumption at the latest point ("today's trend value")
    const predictedLatest = Math.max(0, intercept + slope * (n - 1));
    return { slope, intercept, predictedLatest };
  }

  // ─────────────────────────────────────────────────────────────────
  //  4. HYBRID MODEL
  // ─────────────────────────────────────────────────────────────────

  /**
   * Combines regression and moving average:
   *   FinalPrediction = 0.6 × Regression + 0.4 × MovingAverage
   *
   * Why hybrid?
   *  - Regression captures the TREND (is demand going up or down?)
   *  - Moving average captures the LEVEL (what is the typical daily demand?)
   *  - Combining them gives a balanced prediction that reacts to trends
   *    while remaining grounded in recent actual data.
   */
  calculateHybridPrediction(
    movingAverage: number,
    regressionPredicted: number,
  ): number {
    const hybrid =
      REGRESSION_WEIGHT * regressionPredicted +
      MOVING_AVG_WEIGHT * movingAverage;
    return Math.max(0, hybrid); // Consumption cannot be negative
  }

  // ─────────────────────────────────────────────────────────────────
  //  5. CONFIDENCE SCORE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Confidence = 1 − CoV  (Coefficient of Variation)
   *
   * CoV = σ / μ → high variance ⇒ low confidence
   * Clamped to [0, 1].
   *
   * Interpretation:
   *  - 0.9+ : Very stable demand, high confidence in prediction
   *  - 0.7-0.9: Moderate variance, reasonable confidence
   *  - <0.5  : Highly erratic demand, prediction is unreliable
   */
  calculateConfidence(stats: SeriesStatistics): number {
    if (stats.count < 2 || stats.mean === 0) return 0;

    const cov = stats.stdDev / stats.mean;
    return Math.max(0, Math.min(1, 1 - cov));
  }

  // ─────────────────────────────────────────────────────────────────
  //  6. ANOMALY DETECTION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Flags days where consumption deviates beyond ±2 standard deviations
   * from the mean (z-score method).
   *
   * These anomalies are:
   *  - Used in the explanation to warn about irregular patterns
   *  - Useful for identifying promotional spikes, supply disruptions, etc.
   */
  detectAnomalies(
    series: DailyDataPoint[],
    stats: SeriesStatistics,
  ): Anomaly[] {
    if (stats.count < 2 || stats.stdDev === 0) return [];

    const anomalies: Anomaly[] = [];
    for (const dp of series) {
      const zScore = (dp.quantity - stats.mean) / stats.stdDev;
      if (Math.abs(zScore) > ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          date: dp.date,
          quantity: dp.quantity,
          zScore: Math.round(zScore * 100) / 100,
        });
      }
    }
    return anomalies;
  }

  // ─────────────────────────────────────────────────────────────────
  //  7. TREND DETECTION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Determines the consumption trend based on the regression slope.
   *
   * The slope is compared relative to the mean consumption:
   *  - If slope > 5% of mean → "increasing"
   *  - If slope < -5% of mean → "decreasing"
   *  - Otherwise → "stable"
   *
   * Using a relative threshold (instead of absolute) makes this
   * work correctly regardless of the product's sales volume.
   */
  detectTrend(slope: number, mean: number): TrendDirection {
    if (mean === 0) return 'stable';

    const relativeSlope = slope / mean;

    if (relativeSlope > TREND_THRESHOLD) return 'increasing';
    if (relativeSlope < -TREND_THRESHOLD) return 'decreasing';
    return 'stable';
  }

  // ─────────────────────────────────────────────────────────────────
  //  8. EXPLANATION GENERATOR
  // ─────────────────────────────────────────────────────────────────

  /**
   * Generates a human-readable explanation of the prediction.
   *
   * This is critical for the PFE defense — it demonstrates that
   * the system isn't a "black box" but provides actionable insights.
   *
   * The explanation covers:
   *  1. Trend direction and magnitude
   *  2. Days before stockout (urgency)
   *  3. Confidence assessment
   *  4. Anomaly warnings
   */
  generateExplanation(params: {
    slope: number;
    mean: number;
    tendance: TrendDirection;
    daysBeforeStockout: number;
    fiabilite: number;
    anomalyCount: number;
    cmj: number;
    currentStock: number;
  }): string {
    const parts: string[] = [];

    // ── Part 1: Trend description ──
    if (params.mean === 0 && params.cmj === 0) {
      // No consumption at all
      parts.push(
        'Aucune consommation détectée — produit nouveau ou inactif.',
      );
      return parts.join(' ');
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

    // ── Part 2: Stockout urgency ──
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

    // ── Part 3: Confidence assessment ──
    const confPct = Math.round(params.fiabilite * 100);
    if (params.fiabilite >= 0.8) {
      parts.push(`Fiabilité élevée (${confPct}%).`);
    } else if (params.fiabilite >= 0.5) {
      parts.push(`Fiabilité modérée (${confPct}%) — variance notable.`);
    } else if (params.fiabilite > 0) {
      parts.push(
        `Fiabilité faible (${confPct}%) — demande très irrégulière.`,
      );
    }

    // ── Part 4: Anomaly warnings ──
    if (params.anomalyCount > 0) {
      parts.push(
        `${params.anomalyCount} jour(s) anormal(aux) détecté(s) dans l'historique.`,
      );
    }

    return parts.join(' ');
  }

  // ─────────────────────────────────────────────────────────────────
  //  9. ORCHESTRATOR — Generate a full prediction for one product
  // ─────────────────────────────────────────────────────────────────

  /**
   * Main entry point: builds the time-series → runs hybrid model →
   * calculates stockout date & recommended reorder quantity →
   * persists the Prediction record via UPSERT (no duplicates).
   *
   * Returns the prediction result INCLUDING the persisted record ID,
   * so downstream services (PropositionCommande) can link to it directly
   * without a fragile findFirst() lookup.
   */
  async generatePrediction(produitId: string): Promise<PredictionResult> {
    // ── Step 1: Verify product exists & get current stock ──
    const produit = await this.prisma.produit.findUnique({
      where: { id: produitId },
      select: { id: true, nom: true, quantite: true, stockAlert: true },
    });
    if (!produit) {
      throw new NotFoundException(`Produit with ID ${produitId} not found`);
    }

    // ── Step 2: Build the daily sales time-series ──
    const series = await this.getSalesTimeSeries(produitId, HISTORY_DAYS);

    // ── Step 3: Compute statistics ──
    //   fullStats: over the entire window (for trend & anomaly detection)
    //   activeStats: only days with sales > 0 (for CMJ & confidence)
    //
    //   WHY TWO SETS OF STATS?
    //   With only 1-2 days of sales in a 90-day window, the "full" mean
    //   is diluted to ~0 by 88 empty days → CMJ = 0 → false "inactif" result.
    //   Using active-day stats gives a realistic consumption estimate.
    const fullStats = this.computeStatistics(series);
    const activeStats = this.computeActiveDayStatistics(series);

    // Determine if the product has any real sales history
    const hasHistory = activeStats.count > 0 && activeStats.total > 0;

    // ── Step 4: Run prediction algorithms ──
    const movingAverage = this.calculateMovingAverage(series);
    const regression = this.calculateLinearRegression(series);

    // CMJ calculation strategy:
    //   - If enough active days (≥ 3): use the hybrid model on the full series,
    //     but floor it with the active-day mean to avoid near-zero dilution.
    //   - If only 1-2 active days: use the active-day mean directly (not enough
    //     data for regression to be meaningful).
    //   - If no sales at all: CMJ = 0 (product truly inactive).
    let cmj: number;
    if (!hasHistory) {
      cmj = 0;
    } else if (activeStats.count >= 3) {
      // Enough data: use hybrid model, but ensure it's at least the active mean
      const hybridRaw = this.calculateHybridPrediction(
        movingAverage,
        regression.predictedLatest,
      );
      // If hybrid is diluted below the active-day mean due to zero-filling,
      // fall back to the active-day mean as the more realistic estimate.
      cmj = Math.max(hybridRaw, activeStats.mean * 0.5);
    } else {
      // 1-2 active days only: use the active-day mean directly
      cmj = activeStats.mean;
    }

    const hybridValue = cmj; // kept for the return object

    // Confidence is based on active-day variance (not diluted full series)
    const fiabilite = hasHistory ? this.calculateConfidence(activeStats) : 0;

    // Anomaly detection uses full stats (zero-days are part of the pattern)
    const anomalies = this.detectAnomalies(series, fullStats);

    // ── Step 5: Trend detection (uses full series for regression slope) ──
    const tendance = this.detectTrend(regression.slope, activeStats.mean);

    // ── Step 6: Stockout estimation ──
    //   daysBeforeStockout = currentStock / dailyConsumption
    //   If consumption is zero, stock won't deplete (use sentinel value 9999)
    const daysBeforeStockout =
      cmj > 0 ? Math.floor(produit.quantite / cmj) : 9999;

    const estimationSortieDate = new Date();
    estimationSortieDate.setDate(
      estimationSortieDate.getDate() + daysBeforeStockout,
    );

    // ── Step 7: Recommended reorder quantity ──
    //   Formula: qty = (CMJ × leadTime) + safetyStock − currentStock
    const quantiteRecommande = Math.max(
      0,
      Math.ceil(cmj * DELAI_LIVRAISON + STOCK_SECURITE - produit.quantite),
    );

    // ── Step 8: Generate human-readable explanation ──
    const explication = this.generateExplanation({
      slope: regression.slope,
      mean: activeStats.mean, // use active-day mean for explanation accuracy
      tendance,
      daysBeforeStockout,
      fiabilite,
      anomalyCount: anomalies.length,
      cmj,
      currentStock: produit.quantite,
    });

    // ── Step 9: Persist via UPSERT ──
    const predictionData = {
      estimationSortieDate,
      quantiteRecommande,
      CMJ: Math.round(cmj * 100) / 100,
      methode: 'hybrid',
      fiabilite: Math.round(fiabilite * 100) / 100,
      explication,
      tendance,
    };

    const prediction = await this.prisma.prediction.upsert({
      where: { produitId },
      create: { produitId, ...predictionData },
      update: predictionData,
    });

    this.logger.log(
      `Prediction ${prediction.id} for "${produit.nom}": ` +
        `CMJ=${cmj.toFixed(2)} (from ${activeStats.count} active day(s)), ` +
        `trend=${tendance}, stockout in ${daysBeforeStockout} days, ` +
        `reorder qty=${quantiteRecommande}, ` +
        `confidence=${(fiabilite * 100).toFixed(0)}%`,
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

  // ─────────────────────────────────────────────────────────────────
  //  10. BATCH — Generate predictions for ALL products
  // ─────────────────────────────────────────────────────────────────

  /**
   * Generates predictions for all products in the system.
   *
   * Performance note: We fetch only product IDs (not full records)
   * since generatePrediction() fetches the product internally.
   * This reduces the initial query payload.
   */
  async generateAllPredictions(): Promise<{
    total: number;
    generated: number;
    errors: string[];
  }> {
    // Fetch only IDs + names to minimize data transfer
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
