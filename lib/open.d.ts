/**
 * Render a record's source pointer and verbatim excerpt for `memory_open`.
 * This is the "open the door plate" operation: it returns what was actually
 * said, not another generated summary. When no verbatim excerpt exists it
 * reports that fact instead of inventing one.
 */
import type { AnyRecord } from './types.js';
export interface OpenOptions {
    maxChars?: number;
    history?: boolean;
}
export declare function openRecord(record: AnyRecord, options?: OpenOptions): string;
