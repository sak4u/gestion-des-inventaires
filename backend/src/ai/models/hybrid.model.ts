import { Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../config/ai.config';

/**
 * HybridPredictionModel
 *
 * Combines the Linear Regression output and the Moving Average output
 * using a weighted blend:
 *
 *   FinalPrediction = REGRESSION_WEIGHT × regressionValue
 *                   + MOVING_AVG_WEIGHT × movingAverageValue
 *
 * WHY HYBRID?
 *  - Regression captures the TREND (is demand going up or down?)
 *  - Moving Average captures the LEVEL (what is the typical daily demand?)
 *  - Combining both yields a balanced prediction that reacts to trends
 *    while remaining grounded in recent actual data.
 */
@Injectable()
export class HybridPredictionModel {
  /**
   * Blends regression and moving-average outputs into a single CMJ estimate.
   *
   * @param movingAverage       SMA value for the recent window
   * @param regressionPredicted OLS value at the latest data-point
   * @returns                   Hybrid CMJ value, clamped to ≥ 0
   */
  compute(movingAverage: number, regressionPredicted: number): number {
    const hybrid =
      AI_CONFIG.REGRESSION_WEIGHT * regressionPredicted +
      AI_CONFIG.MOVING_AVG_WEIGHT * movingAverage;

    return Math.max(0, hybrid); // Consumption cannot be negative
  }
}
