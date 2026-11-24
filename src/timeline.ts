/**
 * Phase 3 — requirement timeline.
 *
 * Memories are not edited in place when a requirement changes: the old claim is
 * closed (`status=superseded`, `validTo=now`) and the new claim points back via
 * `supersedes`. This module walks that lineage in both directions so the console
 * and the `memory_timeline` tool can show "what changed when".
 */
import type { AnyRecord, ClaimMeta } from './types.js';
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

const MAX_ENTRIES = 50;

function textOf(record: AnyRecord): string {
  if (record.layer === 'l1') return record.summary;
  if (record.layer === 'l2') return record.text;
  return record.title;
}

function entryOf(record: AnyRecord): TimelineEntry {
  const claim = record.claim;
  return {
    id: record.id,
    layer: record.layer,
    text: textOf(record),
    status: claim?.status ?? 'unclaimed',
    from: claim?.validFrom,
    to: claim?.validTo,
    confidence: claim?.confidence,
    supersedes: claim?.supersedes ?? [],
    supersededBy: claim?.supersededBy ?? (record as { supersededBy?: string }).supersededBy,
  };
}

/** Walk the supersede lineage that contains `id` and return it oldest-first. */
export function buildTimeline(store: HoloStore, id: string): TimelineEntry[] {
  const start = store.find(id);
  if (!start) return [];
  const seen = new Set<string>();
  let cursor: AnyRecord | undefined = start;

  // Walk backwards to the oldest ancestor.
  for (let guard = 0; guard < MAX_ENTRIES; guard += 1) {
    if (!cursor) break;
    const parents = (cursor.claim?.supersedes ?? []).map((oldId) => store.find(oldId)).filter(Boolean) as AnyRecord[];
    if (parents.length === 0) break;
    const unseen = parents.filter((parent) => !seen.has(parent.id));
    if (unseen.length === 0) break;
    unseen.forEach((parent) => seen.add(parent.id));
    cursor = unseen[0];
  }

  const root = cursor ?? start;
  const ordered: TimelineEntry[] = [];
  const visited = new Set<string>();
  let node: AnyRecord | undefined = root;
  for (let guard = 0; guard < MAX_ENTRIES; guard += 1) {
    if (!node || visited.has(node.id)) break;
    visited.add(node.id);
    ordered.push(entryOf(node));
    const nextId: string | undefined = node.claim?.supersededBy ?? (node as { supersededBy?: string }).supersededBy;
    node = nextId ? store.find(nextId) : undefined;
  }

  // Fall back to created/observed time when no explicit validFrom exists.
  ordered.sort((a, b) => (a.from ?? Number(a.from ?? 0)) - (b.from ?? 0));
  return ordered;
}

export function formatTimeline(entries: TimelineEntry[]): string {
  if (entries.length === 0) return 'No timeline found for that id.';
  const lines = entries.map((entry, index) => {
    const from = entry.from ? new Date(entry.from).toISOString().slice(0, 10) : '—';
    const to = entry.to ? new Date(entry.to).toISOString().slice(0, 10) : '现在';
    const conf = typeof entry.confidence === 'number' ? ` conf=${entry.confidence.toFixed(3)}` : '';
    const marker = index === entries.length - 1 ? '▲' : '·';
    return `${marker} [${entry.status}${conf}] ${from} → ${to} | ${entry.text.slice(0, 160)} (id:${entry.id.slice(-8)})`;
  });
  return ['## 时间线（旧 → 新）', ...lines].join('\n');
}
