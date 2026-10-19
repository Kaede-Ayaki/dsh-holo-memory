/**
 * Turn-end distillation: one model call turns a conversation turn into
 * L1 (summary), L2 (atomic facts) and L3 (holographic capsules), then merges
 * the result into the layered store with dedupe and supersede rules.
 */
import type { HoloConfig } from './config.js';
import type { AnyRecord, ExtractionResult, L2Record, L3Record, TurnCapture } from './types.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
export interface LlmLike {
    stream(options: unknown): AsyncIterable<unknown>;
}
export interface ExtractionRoute {
    provider: string;
    model: string;
}
export interface ExtractionDeps {
    store: HoloStore;
    config: HoloConfig;
    llm: LlmLike | undefined;
    route: ExtractionRoute | undefined;
    onRecords?: (records: AnyRecord[]) => void;
    signal?: AbortSignal;
    logger?: {
        warn(message: string): void;
    };
}
/** Extract the first complete JSON object from model output. */
export declare function parseJsonObject(raw: string): unknown | null;
/** Validate and bound one model-produced extraction payload. */
export declare function normalizeExtraction(value: unknown): ExtractionResult | null;
export declare function buildExtractionPrompt(capture: TurnCapture, existingL3: L3Record[], existingL2: L2Record[], config: HoloConfig): string;
/** Apply one validated extraction payload to the store. */
export declare function applyExtraction(store: HoloStore, config: HoloConfig, capture: TurnCapture, extraction: ExtractionResult): AnyRecord[];
/**
 * Distill one completed turn and merge it into memory.
 * Falls back to a deterministic L1 summary when no model route is available,
 * so dialogue recording never depends on a live LLM.
 */
export declare function extractTurn(deps: ExtractionDeps, capture: TurnCapture): Promise<ExtractionResult | null>;
export type { EmbeddingClient };
