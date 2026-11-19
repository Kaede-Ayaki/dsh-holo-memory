import type { HoloStore } from './store.js';
export interface AProfile {
    id: string;
    title: string;
    summary: string;
    preferences: string[];
    habits: string[];
    personality: string[];
    workingStyle: string[];
    confirmFor: string[];
    autoApply: boolean;
    evidenceIds: string[];
    importance: number;
    createdAt: number;
    updatedAt: number;
    revision: number;
}
/**
 * Deterministic profile distillation from L1/L2/L3. This deliberately keeps
 * evidence ids instead of inventing a new fact source.
 */
export declare function buildAProfile(store: HoloStore, previous: AProfile | null): AProfile | null;
export declare class ProfileStore {
    readonly dir: string;
    private profile;
    private writeGuard;
    private chain;
    private readyPromise;
    constructor(dir: string);
    whenReady(): Promise<void>;
    setWriteGuard(guard: () => boolean): void;
    get(): AProfile | null;
    private save;
    refresh(store: HoloStore): Promise<AProfile | null>;
}
export declare function renderAProfile(profile: AProfile | null, maxChars?: number): string;
