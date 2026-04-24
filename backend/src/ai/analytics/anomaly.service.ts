import { Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../config/ai.config';
import {
  Anomaly,
  DailyDataPoint,
  SeriesStatistics,
} from '../prediction/prediction.types';

/**
 * AnomalyService
 *
 * Flags data-points that deviate beyond ±N standard deviations from
 * the series mean using the Z-score method.
 *
 * Anomalies can represent:
 *  - Promotional spikes (sudden demand surge)
 *  - Supply disruptions (unexpected zero-quantity periods)
 *  - Data entry errors
 *
 * They are surfaced in the prediction explanation so that users
 * can investigate the root cause rather than treat the flag as noise.
 */
@Injectable()
export class AnomalyService {
  /**
   * Scans the series and returns all points whose absolute z-score
   * exceeds AI_CONFIG.ANOMALY_Z_THRESHOLD.
   *
   * Returns an empty array when:
   *  - The series has fewer than 2 points
   *  - The standard deviation is 0 (constant series — no anomalies possible)
   *
   * @param series  Full DailyDataPoint series (including zero-days)
   * @param stats   Pre-computed statistics for the same series
   * @returns       Array of Anomaly objects (may be empty)
   */
  detectAnomalies(
    series: DailyDataPoint[],
    stats: SeriesStatistics,
  ): Anomaly[] {
    if (stats.count < 2 || stats.stdDev === 0) return [];

    const anomalies: Anomaly[] = [];

    for (const dp of series) {
      const zScore = (dp.quantity - stats.mean) / stats.stdDev;

      if (Math.abs(zScore) > AI_CONFIG.ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          date: dp.date,
          quantity: dp.quantity,
          zScore: Math.round(zScore * 100) / 100,
        });
      }
    }

    return anomalies;
  }
}
