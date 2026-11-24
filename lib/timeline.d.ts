/**
 * Phase 3 — requirement timeline.
 *
 * Memories are not edited in place when a requirement changes: the old claim is
 * closed (`status=superseded`, `validTo=now`) and the new claim points back via
 * `supersedes`. This module walks that lineage in both directions so the console
 * and the `memory_timeline` tool can show "what changed when".
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
}
/** Walk the supersede lineage that contains `id` and return it oldest-first. */
export declare function buildTimeline(store: HoloStore, id: string): TimelineEntry[];
export declare function formatTimeline(entries: TimelineEntry[]): string;
