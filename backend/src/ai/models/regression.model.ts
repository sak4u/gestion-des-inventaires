import { Injectable } from '@nestjs/common';
import { DailyDataPoint, RegressionResult } from '../prediction/prediction.types';

/**
 * LinearRegressionModel
 *
 * Fits the Ordinary Least Squares (OLS) line  y = intercept + slope·x
 * where x = day-index (0, 1, 2, …) and y = daily quantity sold.
 *
 * WHY OLS?
 *  Regression captures the TREND direction of demand — whether it is
 *  growing, shrinking, or flat — which a simple average cannot tell.
 *  The predicted value at the latest point is used as the trend-aware
 *  component in the hybrid model.
 */
@Injectable()
export class LinearRegressionModel {
  /**
   * Fits a linear model to the time-series and returns slope, intercept,
   * and the trend-predicted value at the most recent data-point.
   *
   * @param series  Ordered (oldest → newest) daily data-points
   * @param movingAverageFallback  Value to return when there are < 2 points
   * @returns  RegressionResult — slope, intercept, predictedLatest
   */
  compute(
    series: DailyDataPoint[],
    movingAverageFallback: number,
  ): RegressionResult {
    const n = series.length;

    // Not enough points for OLS — fall back to the moving average
    if (n < 2) {
      return {
        slope: 0,
        intercept: movingAverageFallback,
        predictedLatest: movingAverageFallback,
      };
    }

    // Accumulate sums for OLS formula
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

    // Denominator = n·Σx² − (Σx)²
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      // All x values identical (degenerate case — shouldn't occur with 0-based index)
      const avg = sumY / n;
      return { slope: 0, intercept: avg, predictedLatest: avg };
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Predicted consumption at the latest observed point ("today's trend value")
    const predictedLatest = Math.max(0, intercept + slope * (n - 1));

    return { slope, intercept, predictedLatest };
  }
}
