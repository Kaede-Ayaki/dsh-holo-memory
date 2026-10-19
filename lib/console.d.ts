import type { HoloConfig } from './config.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
interface LoggerLike {
    warn(message: string): void;
}
export interface ConsoleDeps {
    store: HoloStore;
    embedder: EmbeddingClient;
    config: HoloConfig;
    logger: LoggerLike;
    /** Queue all records for re-embedding after the model changed. */
    onConfigSaved?: () => void;
}
/** Mount the console API on the host web server; returns its disposer. */
export declare function registerConsole(ctx: any, deps: ConsoleDeps): () => void;
export {};
