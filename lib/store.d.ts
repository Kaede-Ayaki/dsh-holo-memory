import type { HoloConfig } from './config.js';
import type { AnyRecord, Layer } from './types.js';
export interface ProjectId {
    key: string;
    label: string;
}
/** Stable project identity derived from the session cwd. */
export declare function projectIdFor(cwd: string | undefined): ProjectId;
export declare function contentHash(text: string): string;
export declare function newId(layer: Layer): string;
export interface StoreStats {
    dir: string;
    l1: number;
    l2: number;
    l3: number;
    embedded: number;
    bytes: number;
    /** Records with a verbatim source excerpt. */
    sourceBacked: number;
    /** Records with a session/turn pointer but no excerpt. */
    sourcePointer: number;
    /** Legacy/manual records without any source pointer. */
    sourceNone: number;
    /** Records that have at least one stored revision snapshot. */
    revisioned: number;
    /** Records that were injected at least once. */
    injected: number;
    /** Records whose id was actually cited by the assistant at least once. */
    cited: number;
}
export declare class HoloStore {
    readonly dir: string;
    private readonly config;
    private readonly data;
    private readonly dirty;
    private readonly timers;
    private readonly saveChains;
    private readonly ready;
    private loaded;
    constructor(dir: string, config: HoloConfig);
    private init;
    private fileFor;
    private loadLayer;
    whenReady(): Promise<void>;
    /** All records of one layer (live array; callers must not mutate in place). */
    list(layer: Layer): AnyRecord[];
    find(id: string): AnyRecord | undefined;
    /** Records visible from one project: user scope plus the matching project. */
    visible(layer: Layer, projectKey: string): AnyRecord[];
    insert<T extends AnyRecord>(record: T): T;
    update(layer: Layer, id: string, patch: Partial<AnyRecord>, touch?: boolean): AnyRecord | undefined;
    remove(id: string): boolean;
    /** Drop the least valuable records when a layer exceeds its cap. */
    private trim;
    private scheduleSave;
    private saveLayer;
    /** Persist every dirty layer immediately. */
    flush(): Promise<void>;
    stats(): Promise<StoreStats>;
}
