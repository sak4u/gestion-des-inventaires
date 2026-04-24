import { Injectable } from '@nestjs/common';
import { AI_CONFIG } from '../config/ai.config';
import { DailyDataPoint } from '../prediction/prediction.types';

/**
 * MovingAverageModel
 *
 * Implements Simple Moving Average (SMA) over a configurable window.
 *
 * WHY SMA?
 *  SMA smooths out short-term noise and gives a stable estimate of
 *  the "normal" daily consumption level over the recent window.
 *  It is a fast O(n) computation with no tuning parameters beyond
 *  the window size.
 */
@Injectable()
export class MovingAverageModel {
  /**
   * Computes the Simple Moving Average over the last `window` data-points.
   *
   * @param series  Full daily time-series (ordered oldest → newest)
   * @param window  Number of trailing days to average (default from config)
   * @returns       Average daily quantity for the window — or 0 if empty
   */
  compute(
    series: DailyDataPoint[],
    window: number = AI_CONFIG.MOVING_AVERAGE_WINDOW,
  ): number {
    if (series.length === 0) return 0;

    const slice = series.slice(-window); // last N days
    const sum = slice.reduce((acc, dp) => acc + dp.quantity, 0);
    return sum / slice.length;
  }
}
