export function applyCitationFeedback(store, injectedIds, assistantText) {
    const text = assistantText ?? '';
    if (text.length === 0 || injectedIds.length === 0)
        return { touched: 0, cited: 0 };
    let touched = 0;
    let cited = 0;
    const seen = new Set();
    for (const id of injectedIds) {
        if (seen.has(id))
            continue;
        seen.add(id);
        const record = store.find(id);
        if (!record)
            continue;
        const suffix = id.slice(-8);
        const isCited = text.includes(id) || (suffix.length === 8 && text.includes(suffix));
        store.update(record.layer, record.id, {
            accessCount: (record.accessCount ?? 0) + 1,
            citedCount: (record.citedCount ?? 0) + (isCited ? 1 : 0),
            lastAccessedAt: Date.now(),
        }, false);
        touched += 1;
        if (isCited)
            cited += 1;
    }
    return { touched, cited };
}
