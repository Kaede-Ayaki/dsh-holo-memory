export type Layer = 'l1' | 'l2' | 'l3';
export type Scope = 'user' | 'project';
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
            mode?: 'recall' | 'recent-fallback';
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
