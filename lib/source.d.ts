import type { AnyRecord, RecordSource, TurnCapture } from './types.js';
export type EvidenceLevel = 'source' | 'pointer' | 'manual' | 'summary';
export declare const MAX_EXCERPT_CHARS = 1600;
export declare function hashText(text: string): string;
/** Derive a pointer from legacy per-layer fields when `source` is absent. */
export declare function legacySourceFor(record: AnyRecord): RecordSource | undefined;
export declare function sourceFor(record: AnyRecord): RecordSource | undefined;
export declare function evidenceOf(record: AnyRecord): EvidenceLevel;
/** Short marker appended to injected/list lines. No marker = summary only. */
export declare function evidenceTag(record: AnyRecord): string;
export declare function evidenceLabel(record: AnyRecord): string;
/** Build the source for one completed turn, from already-captured text. */
export declare function sourceFromTurn(capture: TurnCapture, maxChars?: number): RecordSource;
export declare function sourceFromManual(text: string, sessionId?: string): RecordSource;
/**
 * Add a legacy pointer to records loaded from older versions. Do not fabricate
 * an excerpt: a pointer-only record is honest and still openable.
 */
export declare function normalizeRecordSource(record: AnyRecord): AnyRecord;
export interface SourceVerification {
    /** true = excerpt hash matches; false = mismatch; null = cannot verify. */
    valid: boolean | null;
    detail: string;
}
export declare function verifySource(record: AnyRecord): SourceVerification;
export declare function sourcePointerText(record: AnyRecord): string;
