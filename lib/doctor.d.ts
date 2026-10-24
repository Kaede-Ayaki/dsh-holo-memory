/**
 * Memory doctor: fast checks always; deep checks actually open a source and
 * run a retrieval probe. Configuration is never accepted as evidence — a
 * check that only reads config can stay green while the chain is broken.
 */
import type { HoloConfig } from './config.js';
import type { HoloStore, StoreStats } from './store.js';
import { EmbeddingClient } from './embeddings.js';
export type DoctorLevel = 'ok' | 'warn' | 'error' | 'skip';
export interface DoctorCheck {
    id: string;
    level: DoctorLevel;
    title: string;
    detail: string;
}
export interface DoctorReport {
    ok: boolean;
    deep: boolean;
    authority: string;
    generatedAt: number;
    checks: DoctorCheck[];
    summary: {
        ok: number;
        warn: number;
        error: number;
        skip: number;
    };
    stats?: StoreStats;
}
export interface DoctorDeps {
    store: HoloStore;
    config: HoloConfig;
    embedder?: EmbeddingClient;
}
export declare function runDoctor(deps: DoctorDeps, options?: {
    deep?: boolean;
}): Promise<DoctorReport>;
