import type { NeuronConfig } from './config.js';
import type { ExpandRequest, ExpandResult, GraphStats, HoloRecord, IngestResult, NeuronSummary } from './types.js';
export declare class NeuronGraph {
    readonly dir: string;
    readonly config: NeuronConfig;
    private snapshot;
    private loaded;
    /** Serialize graph mutations; sync can be triggered from many sessions. */
    private mutation;
    /** Serialize atomic writes; the old fixed .tmp name could collide. */
    private writeChain;
    constructor(dir: string, config: NeuronConfig);
    private file;
    private load;
    private save;
    private mutate;
    stats(): Promise<GraphStats>;
    summary(limit?: number): Promise<NeuronSummary>;
    /** Incremental sync: add/update/remove only what changed, then prune hubs. */
    private incremental;
    ingest(records: HoloRecord[], options?: {
        rebuild?: boolean;
    }): Promise<IngestResult>;
    private seedScores;
    applyFeedback(injectedIds: readonly string[], citedIds: readonly string[]): Promise<{
        strengthened: number;
        decayed: number;
    }>;
    private applyFeedbackUnlocked;
    expand(request?: ExpandRequest): Promise<ExpandResult>;
}
export declare function readHoloRecords(dir: string): Promise<HoloRecord[]>;
