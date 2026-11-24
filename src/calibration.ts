/**
 * Phase 2 — confidence calibration.
 *
 * The stored number is a claim probability in 0.000–1.000. Heuristic priors
 * are only a starting point; once truth labels exist we fit a Platt mapping
 * (a, b) and write it to `calibration.json` next to the store. Retrieval and
 * note-taking then use the calibrated value.
 *
 * This module is intentionally self-contained (no import from confidence.ts)
 * so confidence.ts can import it without a cycle.
 */
import fs from 'node:fs';

export interface CalibrationSample {
  /** Raw (uncalibrated) confidence in 0.000–1.000. */
  confidence: number;
  /** Ground truth: was the claim correct? */
  correct: boolean;
}

export interface CalibrationParams {
  /** Slope applied in logit space. */
  a: number;
  /** Intercept applied in logit space. */
  b: number;
  version: string;
  fittedAt?: number;
  samples?: number;
}

export const IDENTITY_CALIBRATION: CalibrationParams = { a: 1, b: 0, version: 'identity' };

let current: CalibrationParams = { ...IDENTITY_CALIBRATION };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function logit(probability: number): number {
  const p = Math.min(0.999, Math.max(0.001, probability));
  return Math.log(p / (1 - p));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function getCalibration(): CalibrationParams {
  return current;
}

export function setCalibration(params: CalibrationParams | undefined): void {
  if (!params || !Number.isFinite(params.a) || !Number.isFinite(params.b)) {
    current = { ...IDENTITY_CALIBRATION };
    return;
  }
  current = { ...params, version: params.version || 'platt-v1' };
}

/** Read calibration.json; a missing or broken file keeps the identity map. */
export function loadCalibrationFile(file: string): CalibrationParams | undefined {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as CalibrationParams;
    if (!Number.isFinite(parsed.a) || !Number.isFinite(parsed.b)) return undefined;
    setCalibration(parsed);
    return parsed;
  } catch {
    return undefined;
  }
}

/** Apply the current (or given) calibration to a raw confidence. */
export function applyCalibration(confidence: number, params: CalibrationParams = current): number {
  const p = clamp01(Number.isFinite(confidence) ? confidence : 0.5);
  if (p <= 0 || p >= 1) return round3(p);
  const z = params.a * logit(p) + params.b;
  return round3(clamp01(sigmoid(z)));
}

/**
 * Fit Platt scaling by gradient descent on log loss.
 *
 *   p' = sigmoid(a * logit(p) + b)
 *
 * Returns the fitted parameters; callers decide whether to persist them.
 */
export function fitPlatt(
  samples: CalibrationSample[],
  options: { iterations?: number; learningRate?: number } = {},
): CalibrationParams {
  const usable = samples.filter((sample) => Number.isFinite(sample.confidence));
  if (usable.length < 2) return { ...IDENTITY_CALIBRATION, samples: usable.length, fittedAt: Date.now() };
  const xs = usable.map((sample) => logit(clamp01(sample.confidence)));
  const ys = usable.map((sample) => (sample.correct ? 1 : 0));
  const iterations = options.iterations ?? 400;
  const lr = options.learningRate ?? 0.15;

  let a = 1;
  let b = 0;
  for (let step = 0; step < iterations; step += 1) {
    let gradA = 0;
    let gradB = 0;
    for (let i = 0; i < xs.length; i += 1) {
      const p = sigmoid(a * xs[i] + b);
      const error = p - ys[i];
      gradA += error * xs[i];
      gradB += error;
    }
    gradA /= xs.length;
    gradB /= xs.length;
    a -= lr * gradA;
    b -= lr * gradB;
    if (Math.abs(gradA) < 1e-6 && Math.abs(gradB) < 1e-6) break;
  }
  // Guard against a degenerate fit flipping the ranking (a must stay positive).
  if (!Number.isFinite(a) || a <= 0.05) a = 1;
  if (!Number.isFinite(b)) b = 0;
  return {
    a: Math.round(a * 10000) / 10000,
    b: Math.round(b * 10000) / 10000,
    version: 'platt-v1',
    fittedAt: Date.now(),
    samples: usable.length,
  };
}

export function brierScore(samples: CalibrationSample[], params: CalibrationParams = current): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const sample of samples) {
    const p = applyCalibration(sample.confidence, params);
    total += (p - (sample.correct ? 1 : 0)) ** 2;
  }
  return Math.round((total / samples.length) * 10000) / 10000;
}

/** Expected calibration error over equal-width confidence bins. */
export function expectedCalibrationError(
  samples: CalibrationSample[],
  params: CalibrationParams = current,
  bins = 10,
): number {
  if (samples.length === 0) return 0;
  const buckets: Array<{ count: number; sumP: number; sumY: number }> = Array.from({ length: bins }, () => ({
    count: 0,
    sumP: 0,
    sumY: 0,
  }));
  for (const sample of samples) {
    const p = applyCalibration(sample.confidence, params);
    const index = Math.min(bins - 1, Math.floor(p * bins));
    buckets[index].count += 1;
    buckets[index].sumP += p;
    buckets[index].sumY += sample.correct ? 1 : 0;
  }
  let ece = 0;
  for (const bucket of buckets) {
    if (bucket.count === 0) continue;
    const avgP = bucket.sumP / bucket.count;
    const avgY = bucket.sumY / bucket.count;
    ece += (bucket.count / samples.length) * Math.abs(avgP - avgY);
  }
  return Math.round(ece * 10000) / 10000;
}

export function reliabilityCurve(
  samples: CalibrationSample[],
  params: CalibrationParams = current,
  bins = 10,
): Array<{ bucket: string; count: number; avgConfidence: number; accuracy: number }> {
  const buckets: Array<{ count: number; sumP: number; sumY: number }> = Array.from({ length: bins }, () => ({
    count: 0,
    sumP: 0,
    sumY: 0,
  }));
  for (const sample of samples) {
    const p = applyCalibration(sample.confidence, params);
    const index = Math.min(bins - 1, Math.floor(p * bins));
    buckets[index].count += 1;
    buckets[index].sumP += p;
    buckets[index].sumY += sample.correct ? 1 : 0;
  }
  return buckets.map((bucket, index) => ({
    bucket: `${(index / bins).toFixed(2)}-${((index + 1) / bins).toFixed(2)}`,
    count: bucket.count,
    avgConfidence: bucket.count === 0 ? 0 : Math.round((bucket.sumP / bucket.count) * 1000) / 1000,
    accuracy: bucket.count === 0 ? 0 : Math.round((bucket.sumY / bucket.count) * 1000) / 1000,
  }));
}
