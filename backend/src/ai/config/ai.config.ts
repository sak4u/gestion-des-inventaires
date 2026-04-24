// ═══════════════════════════════════════════════════════════════════
//  AI ENGINE — CONFIGURATION
//  All tunable parameters live here; change once, affect everywhere.
// ═══════════════════════════════════════════════════════════════════

export const AI_CONFIG = {
  // ── Time-series ──────────────────────────────────────────────────
  /** Days of sales history to include in the time-series */
  HISTORY_DAYS: 90,

  // ── Moving Average ───────────────────────────────────────────────
  /** Window size (days) for the Simple Moving Average */
  MOVING_AVERAGE_WINDOW: 30,

  // ── Hybrid Model Weights ─────────────────────────────────────────
  /** Weight given to linear-regression output in the hybrid model */
  REGRESSION_WEIGHT: 0.6,
  /** Weight given to moving-average output in the hybrid model */
  MOVING_AVG_WEIGHT: 0.4,

  // ── Trend Detection ──────────────────────────────────────────────
  /**
   * Minimum relative slope (slope / mean) to classify as increasing/decreasing.
   * Example: 0.05 = slope must be > 5 % of the mean to be "increasing".
   */
  TREND_THRESHOLD: 0.05,

  // ── Anomaly Detection ────────────────────────────────────────────
  /** Z-score magnitude above which a data-point is flagged as anomalous */
  ANOMALY_Z_THRESHOLD: 2,

  // ── Stock Replenishment ──────────────────────────────────────────
  /** Default supplier lead-time in days (fallback when not specified) */
  DELAI_LIVRAISON: 5,
  /** Safety-stock buffer added on top of the lead-time demand */
  STOCK_SECURITE: 20,

  // ── CMJ Active-Day Floor ─────────────────────────────────────────
  /**
   * When the hybrid model's output is diluted by zero-filled days,
   * we take the maximum of the hybrid value and (activeMean × FLOOR_RATIO).
   */
  ACTIVE_MEAN_FLOOR_RATIO: 0.5,

  // ── Minimum Active Days for Hybrid Model ─────────────────────────
  /**
   * Products with fewer active sales days than this threshold
   * skip the hybrid model and use the active-day mean directly.
   */
  MIN_ACTIVE_DAYS_FOR_HYBRID: 3,
} as const;
