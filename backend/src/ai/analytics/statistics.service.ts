import { Injectable } from '@nestjs/common';
import { DailyDataPoint, SeriesStatistics } from '../prediction/prediction.types';

/**
 * StatisticsService
 *
 * Provides shared statistical summaries for a DailyDataPoint series.
 *
 * Computing statistics once here prevents multiple downstream services
 * (AnomalyService, TrendService, confidence scoring) from repeating
 * the same O(n) pass over the same data.
 */
@Injectable()
export class StatisticsService {
  // ─────────────────────────────────────────────────────────────────
  //  FULL-SERIES STATISTICS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Computes mean, variance, std. deviation, and total for ALL
   * data-points in the series (including zero-quantity days).
   *
   * Use this for anomaly detection and trend analysis where zero-days
   * are meaningful (they represent "no sales that day").
   *
   * @param series  Array of DailyDataPoint objects
   * @returns       SeriesStatistics over the entire series
   */
  computeStatistics(series: DailyDataPoint[]): SeriesStatistics {
    const count = series.length;
    if (count === 0) {
      return { mean: 0, variance: 0, stdDev: 0, total: 0, count: 0 };
    }

    const values = series.map((dp) => dp.quantity);
    const total = values.reduce((a, b) => a + b, 0);
    const mean = total / count;

    // Population variance (not sample) — we have the full window
    const variance =
      values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
    const stdDev = Math.sqrt(variance);

    return { mean, variance, stdDev, total, count };
  }

  // ─────────────────────────────────────────────────────────────────
  //  ACTIVE-DAY STATISTICS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Computes statistics using ONLY the days where quantity > 0.
   *
   * WHY?
   *  When a product has only 1–2 days of sales in a 90-day window,
   *  the full-series mean is diluted to near-zero by empty days,
   *  causing CMJ ≈ 0 and a false "inactif" classification.
   *  Active-day statistics give a realistic per-sale-day estimate.
   *
   * @param series  Full DailyDataPoint series (may contain zero-days)
   * @returns       SeriesStatistics computed only over active days
   */
  computeActiveDayStatistics(series: DailyDataPoint[]): SeriesStatistics {
    const activeDays = series.filter((dp) => dp.quantity > 0);
    return this.computeStatistics(activeDays);
  }

  // ─────────────────────────────────────────────────────────────────
  //  CONFIDENCE SCORE
  // ─────────────────────────────────────────────────────────────────

  /**
   * Computes a prediction confidence score in [0, 1].
   *
   * Formula: confidence = 1 − CoV   (Coefficient of Variation)
   *          CoV = σ / μ
   *
   * Interpretation:
   *  ≥ 0.8 → Very stable demand, high confidence
   *  0.5–0.8 → Moderate variance, reasonable confidence
   *  < 0.5 → Highly erratic demand, low confidence
   *
   * @param stats  Pre-computed SeriesStatistics (active-day preferred)
   * @returns      Confidence score clamped to [0, 1]
   */
  calculateConfidence(stats: SeriesStatistics): number {
    if (stats.count < 2 || stats.mean === 0) return 0;

    const cov = stats.stdDev / stats.mean;
    return Math.max(0, Math.min(1, 1 - cov));
  }
}
