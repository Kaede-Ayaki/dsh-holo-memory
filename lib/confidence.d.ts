/**
 * Numeric confidence (Phase 1).
 *
 * One authoritative representation: a JSON number in 0.000–1.000 with three
 * decimals. Internally compared as integer basis points (0–1000) so ranking
 * and conflict comparisons never hit float drift. "high / medium / low" is a
 * UI-only hint and must never be stored.
 */
import type { ClaimMeta, ConfidenceBasis, ConfidenceSourceType } from './types.js';
/** Current schema version for claim metadata and migration bookkeeping. */
export declare const SCHEMA_VERSION = "0.8.0";
/** Basis points: the integer form used for comparisons (0–1000). */
export declare const CONFIDENCE_SCALE = 1000;
/** New/unknown claims must not pretend to be certain. */
export declare const CONFIDENCE_MIGRATION_DEFAULT = 0.5;
/** Below this, a memory may be shown but must not drive default behavior. */
export declare const CONFIDENCE_AUTO_APPLY_MIN = 0.7;
export declare const CONFIDENCE_SOURCES: ConfidenceSourceType[];
/**
 * Initial priors by evidence source. They are starting points only: the
 * calibration phase replaces them with fitted values.
 */
export declare const INITIAL_PRIOR: Record<ConfidenceSourceType, number>;
export declare function clamp01(value: number): number;
/** Round to the storage precision (three decimals). */
export declare function round3(value: number): number;
/**
 * The single normalization entry point for every write path.
 * NaN / Infinity fall back to the migration default instead of poisoning data.
 */
export declare function normalizeConfidence(value: unknown, fallback?: number): number;
/** Integer basis points used for comparisons (never persisted). */
export declare function toBasisPoints(value: number): number;
export declare function fromBasisPoints(points: number): number;
export declare function initialConfidence(sourceType: ConfidenceSourceType): number;
export declare function shouldAutoApply(confidence: number): boolean;
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
export declare function deriveConfidence(evidence: ConfidenceEvidence): number;
export declare function createConfidenceBasis(sourceType: ConfidenceSourceType, options?: {
    extractionQuality?: number;
    corroboration?: number;
    contradiction?: number;
    verified?: boolean;
    calibrationVersion?: string;
}): ConfidenceBasis;
export declare function createClaimMeta(sourceType: ConfidenceSourceType, options?: {
    confidence?: number;
    observedAt?: number;
    recordedAt?: number;
    extractionQuality?: number;
    verified?: boolean;
}): ClaimMeta;
/** How many confidence moves we keep per claim. */
export declare const MAX_CONFIDENCE_HISTORY = 10;
/**
 * Return a claim with a new confidence and one history entry. Used when a
 * correction or corroboration changes the number; the previous value is kept
 * in `confidenceHistory` so the move stays auditable.
 */
export declare function withConfidence(claim: ClaimMeta, nextConfidence: number, reason: string, at?: number): ClaimMeta;
/** True when a claim is currently valid and usable as a default. */
export declare function isActiveClaim(claim: ClaimMeta | undefined, now?: number): boolean;
