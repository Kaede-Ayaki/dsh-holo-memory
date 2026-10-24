/**
 * Revision history for memory corrections. We never silently overwrite the
 * previous content: the old snapshot is kept (bounded) and the current record
 * carries a monotonically increasing revision number.
 */
import type { AnyRecord, RecordRevision } from './types.js';
export declare const MAX_HISTORY = 20;
/**
 * Build the patch for a content update. The caller merges the returned patch
 * through `store.update`, which preserves id/layer/updatedAt semantics.
 */
export declare function reviseRecord(record: AnyRecord, patch: Partial<AnyRecord>, by?: RecordRevision['by']): Partial<AnyRecord>;
