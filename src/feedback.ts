/**
 * Post-turn citation feedback.
 *
 * The injected block labels every memory with an 8-char id suffix. When the
 * assistant answer repeats that suffix (or the full id), we record a citation;
 * every injected record gets an access bump. This is deliberately conservative:
 * absence of a citation never demotes a record.
 */
import type { AnyRecord } from './types.js';
import type { HoloStore } from './store.js';

export interface CitationFeedbackResult {
  touched: number;
  cited: number;
}

export function applyCitationFeedback(
  store: HoloStore,
  injectedIds: readonly string[],
  assistantText: string,
): CitationFeedbackResult {
  const text = assistantText ?? '';
  if (text.length === 0 || injectedIds.length === 0) return { touched: 0, cited: 0 };
  let touched = 0;
  let cited = 0;
  const seen = new Set<string>();
  for (const id of injectedIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const record: AnyRecord | undefined = store.find(id);
    if (!record) continue;
    const suffix = id.slice(-8);
    const isCited = text.includes(id) || (suffix.length === 8 && text.includes(suffix));
    store.update(
      record.layer,
      record.id,
      {
        accessCount: (record.accessCount ?? 0) + 1,
        citedCount: (record.citedCount ?? 0) + (isCited ? 1 : 0),
        lastAccessedAt: Date.now(),
      },
      false,
    );
    touched += 1;
    if (isCited) cited += 1;
  }
  return { touched, cited };
}
