import { Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../config/ai.config';
import { TrendDirection } from '../prediction/prediction.types';

/**
 * TrendService
 *
 * Classifies the consumption trend based on the OLS regression slope
 * relative to the active-day mean.
 *
 * Using a RELATIVE threshold (slope / mean) ensures that the same
 * percentage-based rule works correctly regardless of whether a product
 * sells 2 units/day or 200 units/day.
 */
@Injectable()
export class TrendService {
  /**
   * Determines whether demand is growing, shrinking, or flat.
   *
   * Rules:
   *  relativeSlope > +TREND_THRESHOLD → 'increasing'
   *  relativeSlope < -TREND_THRESHOLD → 'decreasing'
   *  otherwise                        → 'stable'
   *
   * @param slope  OLS regression slope (units per day)
   * @param mean   Active-day mean consumption (used as normalisation base)
   * @returns      TrendDirection
   */
  detectTrend(slope: number, mean: number): TrendDirection {
    if (mean === 0) return 'stable';

    const relativeSlope = slope / mean;

    if (relativeSlope > AI_CONFIG.TREND_THRESHOLD) return 'increasing';
    if (relativeSlope < -AI_CONFIG.TREND_THRESHOLD) return 'decreasing';
    return 'stable';
  }
}
