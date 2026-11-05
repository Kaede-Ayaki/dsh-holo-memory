import type { HoloConfig } from './config.js';
import type { HoloStore } from './store.js';
import type { L1Record } from './types.js';
export interface MaintenanceOptions {
    now?: number;
    dryRun?: boolean;
    /** Override `config.l1ArchiveAfterDays` for a manual aggressive pass. */
    olderThanDays?: number;
}
export interface MaintenanceResult {
    at: number;
    dryRun: boolean;
    olderThanDays: number;
    archived: number;
    kept: number;
    archiveFile: string;
    ids: string[];
}
export interface MaintenanceState {
    lastRunAt: number;
    lastArchived: number;
    lastArchiveFile: string;
}
export declare function selectL1ForArchive(records: L1Record[], config: HoloConfig, now: number, olderThanDays?: number): Array<{
    record: L1Record;
    reason: 'stale-low-importance' | 'hard-max-age';
}>;
export declare function readMaintenanceState(store: HoloStore): Promise<MaintenanceState | null>;
/** Serialize concurrent manual/API/timer maintenance runs. */
export declare function maintainMemory(store: HoloStore, config: HoloConfig, options?: MaintenanceOptions): Promise<MaintenanceResult>;
export declare function nextDailyDelay(now: number, hour: number, minute: number): number;
export interface MaintenanceLogger {
    info?(message: string): void;
    warn(message: string): void;
}
/**
 * Start the daily timer. If the last recorded run is older than 20 hours
 * (or absent), run once shortly after startup to catch up, then resume the
 * normal daily slot.
 */
export declare function startMaintenanceSchedule(store: HoloStore, config: HoloConfig, logger: MaintenanceLogger): () => void;
