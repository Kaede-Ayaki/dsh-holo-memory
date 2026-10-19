/**
 * Hybrid recall with independent lexical / character-ngram / embedding
 * channels, reciprocal-rank fusion, resident active-window memories, and a
 * band-aware character budget.
 */
import type { HoloConfig } from './config.js';
import type { AnyRecord, Layer } from './types.js';
import type { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
export type RecallBand = 'immediate' | 'working' | 'background';
export interface RecallItem {
    record: AnyRecord;
    layer: Layer;
    /** Normalized RRF score in 0..1, used for display and final trimming. */
    score: number;
    lexical: number;
    ngram: number;
    vector: number;
    /** Raw RRF score before per-layer normalization. */
    rrf: number;
    channels: string[];
    band: RecallBand;
    /** True for a resident active-window item rather than a query match. */
    active?: boolean;
}
export interface RecallResult {
    text: string;
    items: RecallItem[];
    /** Number of active-window items that survived the budget. */
    activeCount: number;
}
export interface RecallOptions {
    projectKey: string;
    currentSessionId?: string;
    maxChars: number;
    minScore: number;
    counts: {
        l1: number;
        l2: number;
        l3: number;
    };
    signal?: AbortSignal;
}
/**
 * Retrieve and render relevant memory. Returns null when no query channel
 * clears the relevance bar, so quiet sessions receive no injected tokens.
 */
export declare function recall(store: HoloStore, embedder: EmbeddingClient, config: HoloConfig, query: string, options: RecallOptions): Promise<RecallResult | null>;
/**
 * Query-independent fallback used when the new prompt is too short to search
 * (for example "继续"): surface the most important L3 capsules plus the most
 * recent L1 summaries so the agent still wakes up with context.
 */
export declare function recentFallback(store: HoloStore, projectKey: string, maxChars: number): Promise<string | null>;
