export const MAX_HISTORY = 20;
function snapshotOf(record) {
    const { embedding: _embedding, history: _history, ...rest } = record;
    return { ...rest };
}
/**
 * Build the patch for a content update. The caller merges the returned patch
 * through `store.update`, which preserves id/layer/updatedAt semantics.
 */
export function reviseRecord(record, patch, by = 'extraction') {
    const previous = {
        at: record.updatedAt,
        revision: record.revision ?? 0,
        by,
        snapshot: snapshotOf(record),
    };
    const history = [...(record.history ?? []), previous].slice(-MAX_HISTORY);
    return {
        ...patch,
        revision: (record.revision ?? 0) + 1,
        history,
    };
}
