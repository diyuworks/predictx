import { describe, it, expect } from 'vitest';
import {
  calculateMetrics,
  rollingOriginBacktest,
  runForecastingEngine,
  type SalesRow,
} from '../ml';

function makeSeries(values: number[], start = '2024-01-01'): SalesRow[] {
  const d0 = new Date(start);
  return values.map((sales, i) => {
    const d = new Date(d0);
    d.setDate(d0.getDate() + i);
    return { date: d.toISOString().slice(0, 10), sales };
  });
}

const linear = Array.from({ length: 40 }, (_, i) => 100 + 5 * i);

describe('calculateMetrics', () => {
  it('returns zeros for empty input', () => {
    expect(calculateMetrics([], [])).toEqual({ mae: 0, rmse: 0, mape: 0, r2: 0, accuracy: 0 });
  });

  it('computes MAE / RMSE / MAPE on a hand-checked example', () => {
    // errors: +10, -10  -> MAE 10, RMSE 10, MAPE = (10/100 + 10/200)/2 = 7.5%
    const m = calculateMetrics([100, 200], [110, 190]);
    expect(m.mae).toBe(10);
    expect(m.rmse).toBe(10);
    expect(m.mape).toBe(7.5);
    expect(m.accuracy).toBe(92.5);
  });

  it('gives R2 = 1 for a perfect prediction', () => {
    expect(calculateMetrics([1, 2, 3, 4], [1, 2, 3, 4]).r2).toBe(1);
  });
});

describe('rollingOriginBacktest', () => {
  it('uses several folds on a 45-point series', () => {
    const bt = rollingOriginBacktest(Array.from({ length: 45 }, (_, i) => 100 + i), 'linear');
    expect(bt.folds).toBeGreaterThanOrEqual(3);
    expect(bt.residuals.length).toBeGreaterThan(5);
  });

  it('never uses future data: linear model is near-perfect on a straight line', () => {
    const bt = rollingOriginBacktest(linear, 'linear');
    expect(bt.metrics.mae).toBeLessThan(0.01);
  });

  it('falls back to a single split on a tiny series', () => {
    const bt = rollingOriginBacktest([10, 12, 14], 'linear');
    expect(bt.folds).toBe(1);
    expect(bt.residuals.length).toBeGreaterThan(0);
  });
});

describe('runForecastingEngine', () => {
  it('rejects fewer than 3 rows', () => {
    expect(() => runForecastingEngine(makeSeries([1, 2]), 'auto', 5)).toThrow();
  });

  it('returns history + horizon points with consecutive future dates', () => {
    const data = makeSeries(linear);
    const res = runForecastingEngine(data, 'auto', 14);
    expect(res.chartData).toHaveLength(data.length + 14);

    const future = res.chartData.slice(data.length);
    expect(future[0].date).toBe('2024-02-10'); // 2024-01-01 + 40 days
    expect(future[13].date).toBe('2024-02-23');
    expect(future.every((p) => p.actual === undefined)).toBe(true);
  });

  it('auto-selects a model and flags exactly one as best', () => {
    const res = runForecastingEngine(makeSeries(linear), 'auto', 7);
    expect(res.evaluations).toHaveLength(4);
    expect(res.evaluations.filter((e) => e.isBest)).toHaveLength(1);
    const best = res.evaluations.find((e) => e.isBest)!;
    expect(best.modelType).toBe(res.bestModelType);
    // On a perfectly linear series the best model must have ~zero error.
    expect(best.metrics.mae).toBeLessThan(0.5);
  });

  it('respects a manually chosen model', () => {
    const res = runForecastingEngine(makeSeries(linear), 'moving_avg', 7);
    expect(res.selectedMetrics).toEqual(
      res.evaluations.find((e) => e.modelType === 'moving_avg')!.metrics
    );
  });

  it('keeps bounds ordered, non-negative, and widening with the horizon', () => {
    // Noisy upward series so sigma > 0
    const noisy = Array.from({ length: 40 }, (_, i) => 100 + 3 * i + (i % 2 === 0 ? 8 : -8));
    const res = runForecastingEngine(makeSeries(noisy), 'linear', 30);
    const future = res.chartData.filter((p) => p.actual === undefined);

    for (const p of future) {
      expect(p.lowerBound!).toBeGreaterThanOrEqual(0);
      expect(p.lowerBound!).toBeLessThanOrEqual(p.predicted!);
      expect(p.upperBound!).toBeGreaterThanOrEqual(p.predicted!);
    }
    const width = (p: (typeof future)[number]) => p.upperBound! - p.lowerBound!;
    expect(width(future[29])).toBeGreaterThan(width(future[0]));
  });

  it('never predicts negative sales', () => {
    const falling = Array.from({ length: 30 }, (_, i) => Math.max(1, 200 - 7 * i));
    for (const model of ['linear', 'exponential', 'moving_avg', 'polynomial'] as const) {
      const res = runForecastingEngine(makeSeries(falling), model, 60);
      expect(res.chartData.every((p) => (p.predicted ?? 0) >= 0)).toBe(true);
    }
  });
});
