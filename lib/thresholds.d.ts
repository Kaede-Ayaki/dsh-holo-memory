/**
 * Every tunable threshold names the concrete failure it prevents. A number
 * without a failure story is a future misfire nobody can explain.
 */
import type { HoloConfig } from './config.js';
export interface ThresholdNote {
    key: string;
    value: number;
    prevents: string;
}
export declare function thresholdAudit(config: HoloConfig): ThresholdNote[];
