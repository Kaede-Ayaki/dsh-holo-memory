/**
 * Phase 3 — requirement timeline.
 *
 * Memories are not edited in place when a requirement changes: the old claim is
 * closed (`status=superseded`, `validTo=now`) and the new claim points back via
 * `supersedes`. A single new claim may replace several old ones, so this module
 * walks the lineage as a directed graph (both directions), reports orphans and
 * cycles, and sorts with an explicit time basis.
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
}

const MAX_NODES = 200;

function textOf(record: AnyRecord): string {
  if (record.layer === 'l1') return record.summary;
  if (record.layer === 'l2') return record.text;
  return record.title;
}

function supersedesOf(record: AnyRecord): string[] {
  return record.claim?.supersedes ?? [];
}

function supersededByOf(record: AnyRecord): string | undefined {
  return record.claim?.supersededBy ?? (record as { supersededBy?: string }).supersededBy;
}

function timeOf(entry: TimelineEntry): number | undefined {
  return entry.from ?? entry.observedAt ?? entry.createdAt ?? entry.recordedAt;
}

export function buildTimeline(store: HoloStore, id: string): TimelineResult {
  const start = store.find(id);
  const result: TimelineResult = { entries: [], orphans: [], cycles: [] };
  if (!start) {
    result.orphans.push(id);
    return result;
  }

  // Collect the whole connected component: ancestors (supersedes edges) and
  // descendants (records that point at any collected id).
  const collected = new Map<string, AnyRecord>();
  const queue: AnyRecord[] = [start];
  const seen = new Set<string>();
  const all = (): AnyRecord[] => [...store.list('l1'), ...store.list('l2'), ...store.list('l3')];

  while (queue.length > 0 && collected.size < MAX_NODES) {
    const node = queue.shift() as AnyRecord;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    collected.set(node.id, node);

    for (const parentId of supersedesOf(node)) {
      const parent = store.find(parentId);
      if (!parent) {
        if (!result.orphans.includes(parentId)) result.orphans.push(parentId);
        continue;
      }
      queue.push(parent);
    }
    for (const record of all()) {
      if (record.id === node.id) continue;
      const pointsAtNode = supersedesOf(record).includes(node.id) || supersededByOf(record) === node.id;
      if (pointsAtNode) queue.push(record);
    }
  }

  for (const record of collected.values()) {
    const claim = record.claim;
    const supersedes = supersedesOf(record);
    const entry: TimelineEntry = {
      id: record.id,
      layer: record.layer,
      text: textOf(record),
      status: claim?.status ?? 'unclaimed',
      from: claim?.validFrom,
      to: claim?.validTo,
      confidence: claim?.confidence,
      supersedes,
      supersededBy: supersededByOf(record),
      createdAt: record.createdAt,
      observedAt: claim?.observedAt,
      recordedAt: claim?.recordedAt,
      timeBasis: 'unknown',
    };
    if (typeof claim?.validFrom === 'number') entry.timeBasis = 'validFrom';
    else if (typeof claim?.observedAt === 'number') entry.timeBasis = 'observedAt';
    else if (typeof record.createdAt === 'number') entry.timeBasis = 'createdAt';
    else if (typeof claim?.recordedAt === 'number') entry.timeBasis = 'recordedAt';
    result.entries.push(entry);
  }

  result.entries.sort((a, b) => {
    const ta = timeOf(a);
    const tb = timeOf(b);
    if (ta !== undefined && tb !== undefined && ta !== tb) return ta - tb;
    if (ta === undefined && tb !== undefined) return 1;
    if (ta !== undefined && tb === undefined) return -1;
    return a.id.localeCompare(b.id);
  });

  // Cycle check: every id must not be its own transitive ancestor.
  const edges = new Map<string, string[]>();
  for (const entry of result.entries) edges.set(entry.id, entry.supersedes);
  const state = new Map<string, 'visiting' | 'done'>();
  const visit = (nodeId: string): boolean => {
    const current = state.get(nodeId);
    if (current === 'visiting') return true;
    if (current === 'done') return false;
    state.set(nodeId, 'visiting');
    for (const next of edges.get(nodeId) ?? []) {
      if (visit(next)) {
        if (!result.cycles.includes(nodeId)) result.cycles.push(nodeId);
        state.set(nodeId, 'done');
        return true;
      }
    }
    state.set(nodeId, 'done');
    return false;
  };
  for (const entryId of result.entries.map((entry) => entry.id)) visit(entryId);
  return result;
}

export function formatTimeline(result: TimelineResult): string {
  if (result.entries.length === 0) {
    return result.orphans.length > 0 ? `No timeline found; missing: ${result.orphans.join(', ')}` : 'No timeline found for that id.';
  }
  const lines = ['## 时间线（旧 → 新）'];
  const now = Date.now();
  result.entries.forEach((entry, index) => {
    const from = entry.from ? new Date(entry.from).toISOString().slice(0, 10) : '—';
    const to = entry.to ? new Date(entry.to).toISOString().slice(0, 10) : entry.status === 'active' ? '现在' : '—';
    const conf = typeof entry.confidence === 'number' ? ` conf=${entry.confidence.toFixed(3)}` : '';
    const marker = entry.status === 'active' && (entry.to === undefined || entry.to > now) ? '▲' : '·';
    const time = `[${entry.timeBasis}]`;
    lines.push(`${marker} ${time} [${entry.status}${conf}] ${from} → ${to} | ${entry.text.slice(0, 160)} (id:${entry.id.slice(-8)})`);
  });
  if (result.orphans.length > 0) lines.push('', `orphans: ${result.orphans.join(', ')}`);
  if (result.cycles.length > 0) lines.push('', `cycles detected: ${result.cycles.join(', ')}`);
  return lines.join('\n');
}
