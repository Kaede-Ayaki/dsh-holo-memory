export type Layer = 'l1' | 'l2' | 'l3';
export type Scope = 'user' | 'project';
export type SourceKind = 'turn' | 'manual';
/**
 * A pointer back to the material a memory was distilled from. The excerpt is
 * verbatim (modulo secret redaction), never a second-generation summary.
 */
export interface RecordSource {
    kind: SourceKind;
    sessionId?: string;
    turn?: number;
    /** First DSH session-event seq belonging to the source turn. */
    seqStart?: number;
    /** The turn/end event seq (inclusive). */
    seqEnd?: number;
    /** Short verbatim excerpt captured at write time. */
    excerpt?: string;
    /** contentHash(excerpt), used to detect later tampering. */
    excerptHash?: string;
}
/** One previous version of a record, kept for correction history. */
export interface RecordRevision {
    at: number;
    revision: number;
    by: 'extraction' | 'manual' | 'migration';
    /** Content snapshot without embedding/history to avoid recursive growth. */
    snapshot: Record<string, unknown>;
}
/** Where a confidence value came from; never a substitute for the number. */
export type ConfidenceSourceType = 'user_explicit' | 'user_correction' | 'multi_turn_inference' | 'model_inference' | 'imported' | 'migration_unknown';
export interface ConfidenceBasis {
    sourceType: ConfidenceSourceType;
    /** 0.000–1.000 quality of the extraction that produced the claim. */
    extractionQuality: number;
    /** Independent corroborations (integer, not a repeat count of the same claim). */
    corroboration: number;
    /** Contradictions observed so far (integer). */
    contradiction: number;
    verified: boolean;
    /** heuristic-v1 / platt-v1 / isotonic-v1 … */
    calibrationVersion: string;
}
/**
 * Phase-1 claim metadata: one authoritative numeric confidence plus the time
 * and lifecycle fields needed by later phases (temporal, conflict, decay).
 */
export interface ClaimMeta {
    /** 0.000–1.000, three decimals; the only authoritative confidence. */
    confidence: number;
    confidenceBasis: ConfidenceBasis;
    /** When the claim starts to hold. */
    validFrom?: number;
    /** When it stops holding; empty means still valid. */
    validTo?: number;
    /** When the user said it / the event happened. */
    observedAt: number;
    /** When the system stored it. */
    recordedAt: number;
    status: 'active' | 'superseded' | 'expired' | 'disputed';
    supersedes?: string[];
    supersededBy?: string;
    /** Bounded audit trail of confidence changes (why it moved). */
    confidenceHistory?: Array<{
        at: number;
        confidence: number;
        reason: string;
    }>;
}
export interface BaseRecord {
    id: string;
    layer: Layer;
    /** 'user' = cross-project; 'project' = bound to projectKey. */
    scope: Scope;
    /** Short hash + basename of the session cwd; '' for user scope. */
    projectKey: string;
    /** Human-readable project label for display. */
    projectLabel: string;
    importance: number;
    createdAt: number;
    updatedAt: number;
    /** Content hash used to skip re-embedding unchanged text. */
    hash: string;
    embedding?: number[];
    embeddingModel?: string;
    /** How often this record was injected into a context. */
    accessCount?: number;
    /** How often the assistant actually cited this record's id. */
    citedCount?: number;
    /** Last time the record was injected/cited (not a content update). */
    lastAccessedAt?: number;
    /** Pointer to the verbatim source this record was distilled from. */
    source?: RecordSource;
    /** Current revision number; 0 for legacy records before history existed. */
    revision?: number;
    /** Previous content versions, capped and oldest-first. */
    history?: RecordRevision[];
    /**
     * Phase-1 claim metadata (confidence basis + validity window + lifecycle).
     * Optional so legacy records keep loading unchanged.
     */
    claim?: ClaimMeta;
}
export interface L1Record extends BaseRecord {
    layer: 'l1';
    sessionId: string;
    turn: number;
    cwd: string;
    summary: string;
    topics: string[];
    intent?: string;
    outcome?: string;
    /** Short, human-auditable excerpt of the turn (never full transcript). */
    excerpt?: string;
}
export type FactKind = 'preference' | 'decision' | 'fact' | 'entity' | 'task' | 'correction' | 'reference';
export interface L2Record extends BaseRecord {
    layer: 'l2';
    text: string;
    kind: FactKind;
    tags: string[];
    confidence: number;
    sourceSessionId?: string;
    sourceTurn?: number;
    supersededBy?: string;
}
export interface L3Record extends BaseRecord {
    layer: 'l3';
    title: string;
    hologram: string;
    themes: string[];
    entities: string[];
    openLoops: string[];
    sourceSessions: string[];
}
export type AnyRecord = L1Record | L2Record | L3Record;
export interface ExtractionResult {
    l1?: {
        summary: string;
        topics: string[];
        intent?: string;
        outcome?: string;
        importance?: number;
    };
    l2?: Array<{
        text: string;
        kind?: FactKind;
        scope?: Scope;
        tags?: string[];
        confidence?: number;
        importance?: number;
    }>;
    l3?: Array<{
        id?: string;
        title: string;
        hologram: string;
        themes?: string[];
        entities?: string[];
        openLoops?: string[];
        scope?: Scope;
        importance?: number;
    }>;
}
export interface TurnCapture {
    sessionId: string;
    turn: number;
    cwd: string;
    projectKey: string;
    projectLabel: string;
    userTexts: string[];
    assistantTexts: string[];
    startedAt: number;
    /** First session-event seq observed for this turn. */
    seqStart?: number;
    /** The turn/end event seq. */
    seqEnd?: number;
    /** Ids injected into this turn's context; filled by pre-step recall. */
    injectedIds?: string[];
    /** Provider/model captured from the live agent, used for the extraction call. */
    provider?: string;
    model?: string;
}
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        /** Auto-recalled long-term memory, injected as a user-role snapshot. */
        'holo-memory': {
            kind: 'holo-memory';
            form?: 'snapshot' | 'notice';
            sections?: ReadonlyArray<{
                name: string;
                text: string;
            }>;
            summary?: string;
            /** Question that triggered this recall. */
            query?: string;
            /** Injected characters, including headers and active-window rows. */
            chars?: number;
            /** Number of active-window memories included besides query matches. */
            active?: number;
            mode?: 'recall' | 'recent-fallback' | 'profile' | 'recall+profile';
            /** Number of user profile blocks included (0 or 1). */
            a?: number;
            layers?: {
                l1: number;
                l2: number;
                l3: number;
            };
            selected?: ReadonlyArray<{
                id: string;
                layer: string;
                score: number;
            }>;
        };
    }
}
