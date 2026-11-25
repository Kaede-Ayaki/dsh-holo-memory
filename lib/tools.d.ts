import type { HoloConfig } from './config.js';
import type { AnyRecord } from './types.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
import { ProfileStore } from './profile.js';
interface ToolDeps {
    store: HoloStore;
    embedder: EmbeddingClient;
    config: HoloConfig;
    profileStore: ProfileStore;
    onRecords?: (records: AnyRecord[]) => void;
    /** Lazily-created per-project profile stores (a-<projectKey>.json). */
    projectProfileStore?: (key: string) => ProfileStore;
    /** Called after delete/supersede so indexes and the profile stop using stale data. */
    onMutation?: () => void;
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
