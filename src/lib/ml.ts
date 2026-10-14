export interface SalesRow {
  date: string;
  sales: number;
  brand?: string;
}

export interface ChartPoint {
  date: string;
  actual?: number;
  predicted?: number;
  lowerBound?: number;
  upperBound?: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  accuracy: number;
}

export type ModelType = 'linear' | 'exponential' | 'moving_avg' | 'polynomial';

export interface ModelEvaluation {
  modelType: ModelType;
  name: string;
  description: string;
  metrics: ModelMetrics;
  isBest?: boolean;
}

export interface ForecastResult {
  chartData: ChartPoint[];
  selectedMetrics: ModelMetrics;
  evaluations: ModelEvaluation[];
  bestModelType: ModelType;
  /** Number of rolling-origin folds used to score the chosen model. */
  backtestFolds?: number;
}

// ---------------------------------------------------------------------------
// Helpers: Statistical Metrics
// ---------------------------------------------------------------------------
export function calculateMetrics(actuals: number[], predicteds: number[]): ModelMetrics {
  const n = actuals.length;
  if (n === 0) {
    return { mae: 0, rmse: 0, mape: 0, r2: 0, accuracy: 0 };
  }

  let absErrSum = 0;
  let sqErrSum = 0;
  let pctErrSum = 0;
  let actualSum = 0;

  for (let i = 0; i < n; i++) {
    const act = actuals[i];
    const pred = predicteds[i];
    const diff = pred - act;

    absErrSum += Math.abs(diff);
    sqErrSum += diff * diff;
    actualSum += act;

    if (act !== 0) {
      pctErrSum += Math.abs(diff / act);
    }
  }

  const meanActual = actualSum / n;
  let totalSqSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = actuals[i] - meanActual;
    totalSqSum += diff * diff;
  }

  const mae = absErrSum / n;
  const rmse = Math.sqrt(sqErrSum / n);
  const mape = (pctErrSum / n) * 100;
  const r2 = totalSqSum > 0 ? Math.max(-1, Math.min(1, 1 - sqErrSum / totalSqSum)) : 0;
  const accuracy = Math.max(0, Math.min(100, 100 - mape));

  return {
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    mape: Number(mape.toFixed(2)),
    r2: Number(r2.toFixed(3)),
    accuracy: Number(accuracy.toFixed(1)),
  };
}

// ---------------------------------------------------------------------------
// Model 1: Ordinary Least Squares Linear Regression
// ---------------------------------------------------------------------------
function fitLinearRegression(ys: number[]): { predict: (t: number) => number } {
  const n = ys.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);

  const meanX = (n + 1) / 2;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    num += dx * (ys[i] - meanY);
    den += dx * dx;
  }

  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  return {
    predict: (t: number) => Math.max(0, intercept + slope * t),
  };
}

// ---------------------------------------------------------------------------
// Model 2: Holt's Linear Exponential Smoothing (Level + Trend)
// ---------------------------------------------------------------------------
function fitHoltsExponential(ys: number[], alpha = 0.3, beta = 0.1): {
  inSample: number[];
  forecast: (futureSteps: number) => number[];
} {
  const n = ys.length;
  if (n < 2) {
    return {
      inSample: [...ys],
      forecast: (steps) => Array(steps).fill(ys[0] || 0),
    };
  }

  const levels: number[] = [ys[0]];
  const trends: number[] = [ys[1] - ys[0]];
  const inSample: number[] = [ys[0]];

  for (let t = 1; t < n; t++) {
    const prevL = levels[t - 1];
    const prevB = trends[t - 1];
    const currentY = ys[t];

    const currentL = alpha * currentY + (1 - alpha) * (prevL + prevB);
    const currentB = beta * (currentL - prevL) + (1 - beta) * prevB;

    levels.push(currentL);
    trends.push(currentB);
    inSample.push(Math.max(0, prevL + prevB));
  }

  const lastLevel = levels[n - 1];
  const lastTrend = trends[n - 1];

  return {
    inSample,
    forecast: (steps: number) => {
      const preds: number[] = [];
      for (let h = 1; h <= steps; h++) {
        // Damped future trend
        const damped = lastTrend * Math.pow(0.98, h);
        preds.push(Math.max(0, lastLevel + h * damped));
      }
      return preds;
    },
  };
}

// ---------------------------------------------------------------------------
// Model 3: Simple Moving Average with Trend Continuation
// ---------------------------------------------------------------------------
function fitMovingAverage(ys: number[], windowSize = 4): {
  inSample: number[];
  forecast: (steps: number) => number[];
} {
  const n = ys.length;
  const w = Math.max(2, Math.min(windowSize, Math.floor(n / 2)));
  const inSample: number[] = [];

  for (let i = 0; i < n; i++) {
    if (i < w) {
      inSample.push(ys[i]);
    } else {
      const slice = ys.slice(i - w, i);
      const avg = slice.reduce((a, b) => a + b, 0) / w;
      inSample.push(avg);
    }
  }

  // Calculate recent momentum
  const recentSlice = ys.slice(-w);
  const currentAvg = recentSlice.reduce((a, b) => a + b, 0) / w;
  const recentDiff = (ys[n - 1] - ys[Math.max(0, n - w)]) / w;

  return {
    inSample,
    forecast: (steps: number) => {
      const preds: number[] = [];
      let lastVal = currentAvg;
      for (let h = 1; h <= steps; h++) {
        lastVal += recentDiff * 0.9;
        preds.push(Math.max(0, lastVal));
      }
      return preds;
    },
  };
}

// ---------------------------------------------------------------------------
// Model 4: Polynomial Regression (Degree 2)
// ---------------------------------------------------------------------------
function fitPolynomialRegression(ys: number[]): { predict: (t: number) => number } {
  const n = ys.length;
  const xs = Array.from({ length: n }, (_, i) => i + 1);

  // Normal equations for quadratic fit: y = a*x^2 + b*x + c
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let sy = 0, sxy = 0, sx2y = 0;

  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const x2 = x * x;
    const y = ys[i];

    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;

    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  // Solve 3x3 linear system via Gaussian elimination
  const matrix = [
    [s4, s3, s2, sx2y],
    [s3, s2, s1, sxy],
    [s2, s1, s0, sy],
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = matrix[i];
    matrix[i] = matrix[maxRow];
    matrix[maxRow] = temp;

    if (Math.abs(matrix[i][i]) < 1e-12) continue;

    for (let k = i + 1; k < 3; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j <= 3; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }

  const coeffs = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = matrix[i][3];
    for (let j = i + 1; j < 3; j++) {
      sum -= matrix[i][j] * coeffs[j];
    }
    coeffs[i] = matrix[i][i] !== 0 ? sum / matrix[i][i] : 0;
  }

  const [a, b, c] = coeffs;

  // Damping guard: if quadratic coefficient causes wild extrapolation, fall back to linear
  const maxY = Math.max(...ys) * 3;
  return {
    predict: (t: number) => {
      const raw = a * t * t + b * t + c;
      return Math.max(0, Math.min(raw, maxY));
    },
  };
}

// ---------------------------------------------------------------------------
// Shared forecasting helpers
// ---------------------------------------------------------------------------
const MODEL_CATALOG: Record<ModelType, { name: string; description: string }> = {
  linear: {
    name: 'Linear Regression',
    description: 'Ordinary least-squares linear trendline. Robust baseline for steady growth.',
  },
  exponential: {
    name: 'Exponential Smoothing',
    description: "Holt's linear trend with recency weighting and momentum damping.",
  },
  moving_avg: {
    name: 'Moving Average',
    description: 'Rolling average smoothing with extrapolated recent rate of change.',
  },
  polynomial: {
    name: 'Polynomial Fit (Degree 2)',
    description: 'Quadratic curve fitting to capture acceleration or deceleration in sales.',
  },
};

const MODEL_ORDER: ModelType[] = ['linear', 'exponential', 'moving_avg', 'polynomial'];

/** Fit `type` on `history` and return the next `steps` forecasts. */
function forecastSteps(type: ModelType, history: number[], steps: number): number[] {
  const n = history.length;
  switch (type) {
    case 'linear': {
      const m = fitLinearRegression(history);
      return Array.from({ length: steps }, (_, i) => m.predict(n + i + 1));
    }
    case 'exponential':
      return fitHoltsExponential(history).forecast(steps);
    case 'moving_avg':
      return fitMovingAverage(history).forecast(steps);
    case 'polynomial': {
      const m = fitPolynomialRegression(history);
      return Array.from({ length: steps }, (_, i) => m.predict(n + i + 1));
    }
  }
}

/** Fit `type` on the full series: in-sample fitted values plus future forecasts. */
function fitFull(
  type: ModelType,
  ys: number[],
  futureDays: number
): { inSample: number[]; forecast: number[] } {
  const n = ys.length;
  switch (type) {
    case 'linear': {
      const m = fitLinearRegression(ys);
      return {
        inSample: Array.from({ length: n }, (_, i) => m.predict(i + 1)),
        forecast: Array.from({ length: futureDays }, (_, i) => m.predict(n + i + 1)),
      };
    }
    case 'exponential': {
      const m = fitHoltsExponential(ys);
      return { inSample: m.inSample, forecast: m.forecast(futureDays) };
    }
    case 'moving_avg': {
      const m = fitMovingAverage(ys);
      return { inSample: m.inSample, forecast: m.forecast(futureDays) };
    }
    case 'polynomial': {
      const m = fitPolynomialRegression(ys);
      return {
        inSample: Array.from({ length: n }, (_, i) => m.predict(i + 1)),
        forecast: Array.from({ length: futureDays }, (_, i) => m.predict(n + i + 1)),
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Rolling-origin (expanding window) backtest
//
// A single 80/20 split on ~45 points leaves ~9 test rows, which makes model
// selection noisy. Instead we repeatedly train on an expanding window and
// forecast the next `horizon` points, then pool every out-of-sample error.
// ---------------------------------------------------------------------------
export interface BacktestResult {
  metrics: ModelMetrics;
  folds: number;
  /** Out-of-sample errors (actual - predicted), pooled over all folds. */
  residuals: number[];
}

export function rollingOriginBacktest(ys: number[], type: ModelType): BacktestResult {
  const n = ys.length;
  const horizon = Math.max(1, Math.floor(n * 0.1));
  const minTrain = Math.max(3, Math.floor(n * 0.6));

  const actuals: number[] = [];
  const preds: number[] = [];
  let folds = 0;

  const runFold = (origin: number) => {
    const f = forecastSteps(type, ys.slice(0, origin), horizon);
    for (let h = 0; h < horizon && origin + h < n; h++) {
      actuals.push(ys[origin + h]);
      preds.push(f[h]);
    }
    folds++;
  };

  for (let origin = minTrain; origin + horizon <= n; origin += horizon) {
    runFold(origin);
  }
  // Very short series: fall back to a single train/test split.
  if (folds === 0) {
    runFold(Math.max(2, n - horizon));
  }

  return {
    metrics: calculateMetrics(actuals, preds),
    folds,
    residuals: actuals.map((a, i) => a - preds[i]),
  };
}

// ---------------------------------------------------------------------------
// Unified Runner & Evaluation Orchestrator
// ---------------------------------------------------------------------------
export function runForecastingEngine(
  data: SalesRow[],
  selectedModel: ModelType | 'auto',
  futureDays: number
): ForecastResult {
  const n = data.length;
  if (n < 3) {
    throw new Error('Dataset must contain at least 3 rows to generate a forecast.');
  }
  const ys = data.map((d) => d.sales);

  // 1. Benchmark every model with the rolling-origin backtest.
  const backtests = new Map<ModelType, BacktestResult>();
  const evaluations: ModelEvaluation[] = MODEL_ORDER.map((modelType) => {
    const bt = rollingOriginBacktest(ys, modelType);
    backtests.set(modelType, bt);
    return {
      modelType,
      name: MODEL_CATALOG[modelType].name,
      description: MODEL_CATALOG[modelType].description,
      metrics: bt.metrics,
    };
  });

  // 2. Best model = lowest out-of-sample MAE (ties keep the earlier, simpler model).
  let bestModel = evaluations[0];
  for (const ev of evaluations) {
    if (ev.metrics.mae < bestModel.metrics.mae) bestModel = ev;
  }
  bestModel.isBest = true;

  const chosenType: ModelType = selectedModel === 'auto' ? bestModel.modelType : selectedModel;

  // 3. Refit the chosen model on the FULL series for the final projection.
  const { inSample, forecast } = fitFull(chosenType, ys, futureDays);

  // 4. Approximate 95% prediction band.
  // sigma = RMSE of the chosen model's *out-of-sample* backtest errors (not in-sample
  // residuals, which understate real forecast error). The sqrt(1 + 0.04h) widening is a
  // heuristic, so this is an approximate band, not an exact statistical interval.
  const residuals = backtests.get(chosenType)!.residuals;
  const sigma = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, residuals.length));

  // 5. Build chart points.
  const chartData: ChartPoint[] = [];
  for (let i = 0; i < n; i++) {
    chartData.push({
      date: data[i].date,
      actual: data[i].sales,
      predicted: Math.round(inSample[i] * 10) / 10,
    });
  }

  const lastDate = new Date(data[n - 1].date);
  for (let i = 0; i < futureDays; i++) {
    const step = i + 1;
    const futureDate = new Date(lastDate);
    futureDate.setDate(lastDate.getDate() + step);

    const pred = forecast[i] || 0;
    const margin = 1.96 * sigma * Math.sqrt(1 + step * 0.04);

    chartData.push({
      date: futureDate.toISOString().slice(0, 10),
      predicted: Math.round(pred * 10) / 10,
      lowerBound: Math.round(Math.max(0, pred - margin) * 10) / 10,
      upperBound: Math.round((pred + margin) * 10) / 10,
    });
  }

  const activeEvaluation = evaluations.find((e) => e.modelType === chosenType) || evaluations[0];

  return {
    chartData,
    selectedMetrics: activeEvaluation.metrics,
    evaluations,
    bestModelType: bestModel.modelType,
    backtestFolds: backtests.get(chosenType)!.folds,
  };
}
