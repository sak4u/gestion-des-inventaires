// ═══════════════════════════════════════════════════════════════════
//  AI ENGINE — SHARED TYPES & INTERFACES
//  All domain types used across the ai/* sub-modules are defined here
//  so that there is a single source of truth for the data contracts.
// ═══════════════════════════════════════════════════════════════════

// ── Primitive domain types ───────────────────────────────────────

/** Direction in which product demand is trending */
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

// ── Time-series ──────────────────────────────────────────────────

/** One data-point in a daily sales time-series */
export interface DailyDataPoint {
  date: Date;
  quantity: number;
}

// ── Statistics ───────────────────────────────────────────────────

/**
 * Pre-computed statistical summary of a DailyDataPoint series.
 * Computed once and shared across services to avoid redundant work.
 */
export interface SeriesStatistics {
  mean: number;
  variance: number;
  stdDev: number;
  total: number;
  count: number;
}

// ── Anomaly ──────────────────────────────────────────────────────

/** A single anomalous data-point flagged by z-score analysis */
export interface Anomaly {
  date: Date;
  quantity: number;
  zScore: number;
}

// ── Regression ───────────────────────────────────────────────────

/** Output from the Ordinary Least Squares linear regression model */
export interface RegressionResult {
  /** Daily demand trend (positive = growing, negative = shrinking) */
  slope: number;
  /** Baseline consumption at day 0 */
  intercept: number;
  /** Predicted consumption value at the latest observed data-point */
  predictedLatest: number;
}

// ── Prediction ───────────────────────────────────────────────────

/**
 * Full prediction result returned by PredictionService.generatePrediction().
 * This is the main API response object as well as the data contract used
 * by downstream services such as PropositionCommandeService.
 */
export interface PredictionResult {
  /** Persisted Prediction record ID — use for downstream linking */
  predictionId: string;

  /** Average daily consumption (Consommation Moyenne Journalière) */
  cmj: number;

  /** Simple moving-average value */
  movingAverage: number;

  /** Slope from the linear regression (consumption trend per day) */
  regressionSlope: number;

  /** Final hybrid model value used as CMJ */
  hybridValue: number;

  /** Estimated days until stock runs out at current CMJ */
  daysBeforeStockout: number;

  /** Estimated date when the stock will be exhausted */
  estimationSortieDate: Date;

  /** Recommended reorder quantity */
  quantiteRecommande: number;

  /** Prediction confidence score in [0, 1] */
  fiabilite: number;

  /** Prediction method used */
  methode: string;

  /** Human-readable explanation of the prediction */
  explication: string;

  /** Detected demand trend direction */
  tendance: TrendDirection;

  /** List of anomalous data-points found in the series */
  anomalies: Anomaly[];
}

// ── Explanation Params ───────────────────────────────────────────

/** Parameters bag consumed by ExplanationService.generate() */
export interface ExplanationParams {
  slope: number;
  mean: number;
  tendance: TrendDirection;
  daysBeforeStockout: number;
  fiabilite: number;
  anomalyCount: number;
  cmj: number;
  currentStock: number;
}

// ── Batch Result ─────────────────────────────────────────────────

/** Summary returned by generateAllPredictions() */
export interface BatchPredictionResult {
  total: number;
  generated: number;
  errors: string[];
}
