import type { HoloConfig } from './config.js';
import type { AnyRecord } from './types.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
interface ToolDeps {
    store: HoloStore;
    embedder: EmbeddingClient;
    config: HoloConfig;
    onRecords?: (records: AnyRecord[]) => void;
    logger?: {
        warn(message: string): void;
    };
}
export declare function registerTools(ctx: {
    tools: {
        register(tool: unknown): void;
    };
}, deps: ToolDeps): void;
export {};
