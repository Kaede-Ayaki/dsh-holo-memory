import type { HoloConfig } from './config.js';
export interface EmbeddingHit {
    id: string;
    similarity: number;
}
export type EmbeddingFetch = typeof fetch;
export declare function cosine(a: number[], b: number[]): number;
export declare class EmbeddingClient {
    private readonly config;
    private readonly fetcher;
    private readonly queryCache;
    private disabledReason;
    private retryAt;
    constructor(config: HoloConfig, fetcher?: EmbeddingFetch);
    get enabled(): boolean;
    get reason(): string | undefined;
    private fail;
    private endpoint;
    private apiKey;
    /** Embed a batch of texts. Returns null when disabled or on any failure. */
    embed(texts: string[], signal?: AbortSignal): Promise<number[][] | null>;
    /** Embed one query with a short budget; cached by query text. */
    query(text: string, signal?: AbortSignal, timeoutMs?: number): Promise<number[] | null>;
}
