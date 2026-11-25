/**
 * Phase 3 — requirement timeline.
 *
 * Memories are not edited in place when a requirement changes: the old claim is
 * closed (`status=superseded`, `validTo=now`) and the new claim points back via
 * `supersedes`. A single new claim may replace several old ones, so this module
 * walks the lineage as a directed graph (both directions), reports orphans and
 * cycles, and sorts with an explicit time basis.
 */
import type { ClaimMeta } from './types.js';
import type { HoloStore } from './store.js';
export interface TimelineEntry {
    id: string;
    layer: string;
    text: string;
    status: ClaimMeta['status'] | 'unclaimed';
    from?: number;
    to?: number;
    confidence?: number;
    supersedes: string[];
    supersededBy?: string;
    createdAt: number;
    observedAt?: number;
    recordedAt?: number;
    /** Which timestamp was used for ordering. */
    timeBasis: 'validFrom' | 'observedAt' | 'createdAt' | 'recordedAt' | 'unknown';
}
export interface TimelineResult {
    entries: TimelineEntry[];
    /** Referenced ids that no longer resolve to a record. */
    orphans: string[];
    /** Cycle edges that were ignored while walking. */
    cycles: string[];
    /** True when the 200-node safety limit stopped the traversal. */
    truncated: boolean;
    /** Nodes still queued when the limit was reached. */
    frontier: number;
}
export declare function buildTimeline(store: HoloStore, id: string): TimelineResult;
export declare function formatTimeline(result: TimelineResult): string;
