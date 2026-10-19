/**
 * Hybrid recall: BM25 lexical scoring plus optional embedding cosine,
 * merged into one per-layer ranking and rendered under a hard character budget.
 */
import type { HoloConfig } from './config.js';
import type { AnyRecord, Layer } from './types.js';
import type { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
export interface RecallItem {
    record: AnyRecord;
    layer: Layer;
    score: number;
    lexical: number;
    vector: number;
}
export interface RecallResult {
    text: string;
    items: RecallItem[];
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
 * Retrieve and render relevant memory. Returns null when nothing clears the
 * threshold, so quiet sessions receive no injected tokens at all.
 */
export declare function recall(store: HoloStore, embedder: EmbeddingClient, config: HoloConfig, query: string, options: RecallOptions): Promise<RecallResult | null>;
/**
 * Query-independent fallback used when the new prompt is too short to search
 * (for example "继续"): surface the most important L3 capsules plus the most
 * recent L1 summaries so the agent still wakes up with context.
 */
export declare function recentFallback(store: HoloStore, projectKey: string, maxChars: number): Promise<string | null>;
