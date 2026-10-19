import type { HoloConfig } from './config.js';
declare const DEFAULT_KEY_NAME = "embedding.key";
export interface SavedEmbeddingConfig {
    version: 1;
    baseUrl: string;
    model: string;
    dimensions: number;
    baseline: number;
    keyFile: string;
}
export declare function embeddingSettingsPath(dir: string): string;
export declare function defaultEmbeddingKeyPath(dir: string): string;
/** Read the saved console config; malformed/missing files mean "not configured". */
export declare function loadEmbeddingConfig(dir: string): SavedEmbeddingConfig | null;
/** Overlay console-saved settings onto the loader config at plugin boot. */
export declare function applySavedEmbeddingConfig(config: HoloConfig, dir: string): void;
/** Read the key value for a probe; callers must never return it to the browser. */
export declare function readEmbeddingKey(config: HoloConfig): string;
/** Whether an API key is reachable (env or key file); never returns the value. */
export declare function hasEmbeddingKey(config: HoloConfig): boolean;
export interface SaveEmbeddingPatch {
    baseUrl: string;
    model: string;
    dimensions?: number;
    baseline?: number;
    apiKey?: string;
}
/** Persist provider/model/dimensions and (optionally) rotate the key file. */
export declare function saveEmbeddingConfig(dir: string, patch: SaveEmbeddingPatch): Promise<SavedEmbeddingConfig>;
export { DEFAULT_KEY_NAME };
