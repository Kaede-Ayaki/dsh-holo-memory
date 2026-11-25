import type { HoloConfig } from './config.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
import type { RuntimeToggles } from './runtime.js';
import { type ProfileStore } from './profile.js';
interface LoggerLike {
    warn(message: string): void;
}
export interface ConsoleDeps {
    store: HoloStore;
    embedder: EmbeddingClient;
    config: HoloConfig;
    logger: LoggerLike;
    runtime: RuntimeToggles;
    profileStore: ProfileStore;
    /** Queue all records for re-embedding after the model changed. */
    onConfigSaved?: () => void;
    /** Called after a console delete so indexes/profile refresh immediately. */
    onMutation?: () => void;
    /** Optional associative index; absent when dsh-neuron-memory is not loaded. */
    getNeuron?: () => NeuronConsoleService | undefined;
}
export interface NeuronConsoleService {
    summary(limit?: number): Promise<{
        stats: {
            memoryNodes: number;
            entityNodes: number;
            edges: number;
            averageDegree: number;
            updatedAt: number;
        };
        byLayer: {
            l1: number;
            l2: number;
            l3: number;
        };
        topEntities: Array<{
            label: string;
            degree: number;
        }>;
        maxDegree: number;
        sampleMemories: Array<{
            holoId: string;
            layer: string;
            label: string;
        }>;
    }>;
}
/** Mount the console API on the host web server; returns its disposer. */
export declare function registerConsole(ctx: any, deps: ConsoleDeps): () => void;
export {};
