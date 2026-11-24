/**
 * Numeric confidence (Phase 1).
 *
 * One authoritative representation: a JSON number in 0.000–1.000 with three
 * decimals. Internally compared as integer basis points (0–1000) so ranking
 * and conflict comparisons never hit float drift. "high / medium / low" is a
 * UI-only hint and must never be stored.
 */
import type { ClaimMeta, ConfidenceBasis, ConfidenceSourceType } from './types.js';
import { applyCalibration } from './calibration.js';

/** Current schema version for claim metadata and migration bookkeeping. */
export const SCHEMA_VERSION = '0.8.0';

/** Basis points: the integer form used for comparisons (0–1000). */
export const CONFIDENCE_SCALE = 1000;

/** New/unknown claims must not pretend to be certain. */
export const CONFIDENCE_MIGRATION_DEFAULT = 0.5;

/** Below this, a memory may be shown but must not drive default behavior. */
export const CONFIDENCE_AUTO_APPLY_MIN = 0.7;

export const CONFIDENCE_SOURCES: ConfidenceSourceType[] = [
  'user_explicit',
  'user_correction',
  'multi_turn_inference',
  'model_inference',
  'imported',
  'migration_unknown',
];

/**
 * Initial priors by evidence source. They are starting points only: the
 * calibration phase replaces them with fitted values.
 */
export const INITIAL_PRIOR: Record<ConfidenceSourceType, number> = {
  user_explicit: 0.95,
  user_correction: 0.99,
  multi_turn_inference: 0.8,
  model_inference: 0.55,
  imported: 0.6,
  migration_unknown: 0.5,
};

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Round to the storage precision (three decimals). */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * The single normalization entry point for every write path.
 * NaN / Infinity fall back to the migration default instead of poisoning data.
 */
export function normalizeConfidence(value: unknown, fallback = CONFIDENCE_MIGRATION_DEFAULT): number {
  const numeric = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numeric)) return round3(clamp01(fallback));
  return round3(clamp01(numeric));
}

/** Integer basis points used for comparisons (never persisted). */
export function toBasisPoints(value: number): number {
  return Math.round(normalizeConfidence(value) * CONFIDENCE_SCALE);
}

export function fromBasisPoints(points: number): number {
  const numeric = Number.isFinite(points) ? points : 0;
  return round3(clamp01(numeric / CONFIDENCE_SCALE));
}

export function initialConfidence(sourceType: ConfidenceSourceType): number {
  return INITIAL_PRIOR[sourceType] ?? CONFIDENCE_MIGRATION_DEFAULT;
}

export function shouldAutoApply(confidence: number): boolean {
  return toBasisPoints(confidence) >= Math.round(CONFIDENCE_AUTO_APPLY_MIN * CONFIDENCE_SCALE);
}

function logit(probability: number): number {
  const p = Math.min(0.999, Math.max(0.001, probability));
  return Math.log(p / (1 - p));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface ConfidenceEvidence {
  sourceType: ConfidenceSourceType;
  /** Independent corroborations (integer). Repetition of one claim is not corroboration. */
  corroboration?: number;
  /** Contradictions observed (integer). */
  contradiction?: number;
  verified?: boolean;
  /** Optional explicit prior override; defaults to INITIAL_PRIOR[sourceType]. */
  prior?: number;
}

/**
 * Heuristic confidence update (heuristic-v1).
 *
 *   logit(p) = logit(prior)
 *            + 0.25 * log1p(corroboration)
 *            + 0.50 * verified
 *            - 0.60 * contradiction
 *
 * Repeating the same claim does not raise confidence; only independent
 * corroboration, verification and contradictions move it. The weights are
 * intentionally simple and will be replaced by fitted calibration later.
 */
export function deriveConfidence(evidence: ConfidenceEvidence): number {
  const prior = normalizeConfidence(evidence.prior ?? initialConfidence(evidence.sourceType));
  const corroboration = Math.max(0, Math.floor(evidence.corroboration ?? 0));
  const contradiction = Math.max(0, Math.floor(evidence.contradiction ?? 0));
  let value = logit(prior);
  value += 0.25 * Math.log1p(corroboration);
  if (evidence.verified) value += 0.5;
  value -= 0.6 * contradiction;
  return round3(sigmoid(value));
}

export function createConfidenceBasis(
  sourceType: ConfidenceSourceType,
  options: { extractionQuality?: number; corroboration?: number; contradiction?: number; verified?: boolean; calibrationVersion?: string } = {},
): ConfidenceBasis {
  return {
    sourceType,
    extractionQuality: normalizeConfidence(options.extractionQuality ?? 0.7),
    corroboration: Math.max(0, Math.floor(options.corroboration ?? 0)),
    contradiction: Math.max(0, Math.floor(options.contradiction ?? 0)),
    verified: Boolean(options.verified),
    calibrationVersion: options.calibrationVersion ?? 'heuristic-v1',
  };
}

export function createClaimMeta(
  sourceType: ConfidenceSourceType,
  options: { confidence?: number; observedAt?: number; recordedAt?: number; extractionQuality?: number; verified?: boolean } = {},
): ClaimMeta {
  const now = Date.now();
  return {
    confidence: applyCalibration(normalizeConfidence(options.confidence ?? initialConfidence(sourceType))),
    confidenceBasis: createConfidenceBasis(sourceType, {
      extractionQuality: options.extractionQuality,
      verified: options.verified,
    }),
    observedAt: options.observedAt ?? now,
    recordedAt: options.recordedAt ?? now,
    status: 'active',
  };
}

/** How many confidence moves we keep per claim. */
export const MAX_CONFIDENCE_HISTORY = 10;

/**
 * Return a claim with a new confidence and one history entry. Used when a
 * correction or corroboration changes the number; the previous value is kept
 * in `confidenceHistory` so the move stays auditable.
 */
export function withConfidence(claim: ClaimMeta, nextConfidence: number, reason: string, at = Date.now()): ClaimMeta {
  const normalized = normalizeConfidence(nextConfidence);
  if (toBasisPoints(normalized) === toBasisPoints(claim.confidence)) return claim;
  const history = [...(claim.confidenceHistory ?? []), { at, confidence: claim.confidence, reason }].slice(-MAX_CONFIDENCE_HISTORY);
  return { ...claim, confidence: normalized, confidenceHistory: history };
}

/**
 * True when the claim is valid at `at`. Historical queries can therefore read a
 * superseded/expired claim as long as `at` falls inside [validFrom, validTo).
 */
export function isValidAt(claim: ClaimMeta | undefined, at = Date.now()): boolean {
  if (!claim) return true;
  if (claim.status === 'expired' || claim.status === 'disputed') return false;
  if (typeof claim.validFrom === 'number' && at < claim.validFrom) return false;
  if (typeof claim.validTo === 'number' && at >= claim.validTo) return false;
  if (claim.status === 'superseded' && typeof claim.validTo !== 'number') return false;
  return true;
}

/** True when a claim is currently valid and usable as a default. */
export function isActiveClaim(claim: ClaimMeta | undefined, now = Date.now()): boolean {
  if (!claim) return true;
  if (claim.status !== 'active') return false;
  return isValidAt(claim, now);
}

/**
 * Close a claim at `at` because a newer one replaced it. The old claim keeps its
 * window (so historical `asOf` queries still work) but stops being active.
 */
export function supersedeClaim(
  claim: ClaimMeta,
  options: { at?: number; byId?: string; reason?: string } = {},
): ClaimMeta {
  const at = options.at ?? Date.now();
  const history = [
    ...(claim.confidenceHistory ?? []),
    { at, confidence: claim.confidence, reason: options.reason ?? 'superseded' },
  ].slice(-MAX_CONFIDENCE_HISTORY);
  return {
    ...claim,
    status: 'superseded',
    validTo: at,
    ...(options.byId ? { supersededBy: options.byId } : {}),
    confidenceHistory: history,
  };
}

/** Mark a new claim as replacing earlier ids and starting now. */
export function linkSupersedes(claim: ClaimMeta, oldIds: string[], at = Date.now()): ClaimMeta {
  if (oldIds.length === 0) return claim;
  const supersedes = [...new Set([...(claim.supersedes ?? []), ...oldIds])];
  return { ...claim, supersedes, validFrom: claim.validFrom ?? at };
}
