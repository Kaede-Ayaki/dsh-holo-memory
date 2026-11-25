/**
 * Layered JSON store. One file per layer; atomic writes; capped growth.
 * Deliberately simple: every record is plain JSON and human-inspectable,
 * which makes the memory auditable with any text editor.
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import type { HoloConfig } from './config.js';
import type { AnyRecord, L1Record, L2Record, L3Record, Layer } from './types.js';
import { normalizeRecordSource, sourceFor } from './source.js';

export interface ProjectId {
  key: string;
  label: string;
}

/**
 * Walk up from `cwd` to the nearest git root so one repository keeps one
 * project identity even when a session starts in a subdirectory. Falls back to
 * the cwd itself when no `.git` marker is found.
 */
export function resolveProjectRoot(cwd: string): string {
  const start = path.resolve(cwd);
  let current = start;
  for (let depth = 0; depth < 12; depth += 1) {
    try {
      if (existsSync(path.join(current, '.git'))) return current;
    } catch {
      return start;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return start;
}

/** Stable project identity derived from the session cwd (git root when any). */
export function projectIdFor(cwd: string | undefined): ProjectId {
  if (!cwd || cwd.trim().length === 0) return { key: '', label: 'global' };
  const root = resolveProjectRoot(cwd.trim());
  const hash = createHash('sha1').update(root).digest('hex').slice(0, 12);
  const base = path.basename(root) || root;
  return { key: `p-${hash}`, label: base };
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function newId(layer: Layer): string {
  return `${layer}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}

const CLAIM_STATUSES = new Set(['active', 'superseded', 'expired', 'disputed']);

/** Return a reason string when a claim is structurally invalid. */
function validateClaim(claim: unknown): string | null {
  if (claim === undefined || claim === null) return null;
  if (typeof claim !== 'object') return 'claim is not an object';
  const value = claim as Record<string, unknown>;
  const confidence = value.confidence;
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return 'claim.confidence is not a number in 0..1';
  }
  if (typeof value.status !== 'string' || !CLAIM_STATUSES.has(value.status)) return 'claim.status is invalid';
  if (typeof value.confidenceBasis !== 'object' || value.confidenceBasis === null) return 'claim.confidenceBasis is missing';
  return null;
}

/** Validate one record against its layer schema; return a reason instead of throwing. */
function validateRecord(layer: Layer, value: unknown, seen: Set<string>): { record?: AnyRecord; reason?: string } {
  if (typeof value !== 'object' || value === null) return { reason: 'not an object' };
  const record = value as Partial<AnyRecord> & Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return { reason: 'id is missing' };
  if (seen.has(record.id)) return { reason: 'duplicate id' };
  if (record.layer !== layer) return { reason: `layer mismatch (expected ${layer})` };
  if (typeof record.createdAt !== 'number' || !Number.isFinite(record.createdAt)) return { reason: 'createdAt is missing' };

  if (layer === 'l1') {
    if (typeof record.summary !== 'string') return { reason: 'l1.summary is missing' };
    if (!Array.isArray(record.topics)) return { reason: 'l1.topics is not an array' };
    if (typeof record.sessionId !== 'string') return { reason: 'l1.sessionId is missing' };
  } else if (layer === 'l2') {
    if (typeof record.text !== 'string') return { reason: 'l2.text is missing' };
    if (!Array.isArray(record.tags)) return { reason: 'l2.tags is not an array' };
    if (typeof record.kind !== 'string') return { reason: 'l2.kind is missing' };
  } else {
    if (typeof record.title !== 'string') return { reason: 'l3.title is missing' };
    if (typeof record.hologram !== 'string') return { reason: 'l3.hologram is missing' };
    if (!Array.isArray(record.themes)) return { reason: 'l3.themes is not an array' };
  }

  const claimReason = validateClaim(record.claim);
  if (claimReason) return { reason: claimReason };
  seen.add(record.id);
  return { record: record as AnyRecord };
}

export interface StoreStats {
  dir: string;
  l1: number;
  l2: number;
  l3: number;
  embedded: number;
  bytes: number;
  /** Records with a verbatim source excerpt. */
  sourceBacked: number;
  /** Records with a session/turn pointer but no excerpt. */
  sourcePointer: number;
  /** Legacy/manual records without any source pointer. */
  sourceNone: number;
  /** Records that have at least one stored revision snapshot. */
  revisioned: number;
  /** Records that were injected at least once. */
  injected: number;
  /** Records whose id was actually cited by the assistant at least once. */
  cited: number;
}

export class HoloStore {
  readonly dir: string;
  private readonly config: HoloConfig;
  private readonly data: { l1: L1Record[]; l2: L2Record[]; l3: L3Record[] } = {
    l1: [],
    l2: [],
    l3: [],
  };
  private readonly dirty = new Set<Layer>();
  private readonly timers = new Map<Layer, NodeJS.Timeout>();
  private readonly saveChains = new Map<Layer, Promise<void>>();
  private readonly ready: Promise<void>;
  private loaded = false;
  /** Runtime write switch; canonical writes are refused while it is false. */
  private writeGuard: () => boolean = () => true;
  /** Records removed by delete/trim since the last drain (for index invalidation). */
  private removedRecords: AnyRecord[] = [];
  /** Records rejected at load time, written to quarantine files. */
  readonly quarantine: Array<{ layer: Layer; file: string; count: number }> = [];

  constructor(dir: string, config: HoloConfig) {
    this.dir = path.resolve(dir);
    this.config = config;
    this.ready = this.init();
  }

  /** Install the runtime write switch. */
  setWriteGuard(guard: () => boolean): void {
    this.writeGuard = guard;
  }

  writesAllowed(): boolean {
    return this.writeGuard();
  }

  private assertWritable(): void {
    if (!this.writeGuard()) {
      throw new Error('holo-memory writes are disabled by the runtime switch');
    }
  }

  private async init(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    await Promise.all([
      this.loadLayer('l1'),
      this.loadLayer('l2'),
      this.loadLayer('l3'),
    ]);
    this.loaded = true;
  }

  private fileFor(layer: Layer): string {
    return path.join(this.dir, `${layer}.json`);
  }

  private async loadLayer(layer: Layer): Promise<void> {
    try {
      const raw = await fs.readFile(this.fileFor(layer), 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const seen = new Set<string>();
      const valid: AnyRecord[] = [];
      const rejected: Array<{ reason: string; record: unknown }> = [];
      for (const entry of parsed) {
        const result = validateRecord(layer, entry, seen);
        if (result.record) valid.push(normalizeRecordSource(result.record));
        else rejected.push({ reason: result.reason ?? 'invalid record', record: entry });
      }
      if (rejected.length > 0) {
        // Never drop a bad row silently: keep it in quarantine for recovery.
        const file = path.join(this.dir, 'quarantine', `${layer}-${Date.now()}.jsonl`);
        try {
          await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
          await fs.appendFile(
            file,
            rejected.map((item) => JSON.stringify({ reason: item.reason, record: item.record })).join('\n') + '\n',
            { encoding: 'utf8', mode: 0o600 },
          );
          this.quarantine.push({ layer, file, count: rejected.length });
        } catch {
          // Quarantine is best-effort; the valid records must still load.
        }
      }
      const records = valid;
      if (layer === 'l1') this.data.l1 = records as L1Record[];
      else if (layer === 'l2') this.data.l2 = records as L2Record[];
      else this.data.l3 = records as L3Record[];
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }

  async whenReady(): Promise<void> {
    await this.ready;
    if (!this.loaded) throw new Error('holo-memory store failed to initialize');
  }

  /** All records of one layer (live array; callers must not mutate in place). */
  list(layer: Layer): AnyRecord[] {
    return this.data[layer] as AnyRecord[];
  }

  find(id: string): AnyRecord | undefined {
    for (const layer of ['l1', 'l2', 'l3'] as const) {
      const found = (this.data[layer] as AnyRecord[]).find((record) => record.id === id);
      if (found) return found;
    }
    return undefined;
  }

  /** Records visible from one project: user scope plus the matching project. */
  visible(layer: Layer, projectKey: string): AnyRecord[] {
    const records = this.data[layer] as AnyRecord[];
    return records.filter((record) => record.scope === 'user' || record.projectKey === projectKey);
  }

  insert<T extends AnyRecord>(record: T): T {
    this.assertWritable();
    if (record.layer === 'l1') this.data.l1.push(record as L1Record);
    else if (record.layer === 'l2') this.data.l2.push(record as L2Record);
    else this.data.l3.push(record as L3Record);
    this.trim(record.layer);
    this.scheduleSave(record.layer);
    return record;
  }

  update(layer: Layer, id: string, patch: Partial<AnyRecord>, touch = true): AnyRecord | undefined {
    this.assertWritable();
    const records = this.data[layer] as AnyRecord[];
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return undefined;
    const updated = {
      ...records[index],
      ...patch,
      id,
      layer,
      updatedAt: touch ? Date.now() : records[index].updatedAt,
    } as AnyRecord;
    records[index] = updated;
    this.scheduleSave(layer);
    return updated;
  }

  remove(id: string): boolean {
    this.assertWritable();
    for (const layer of ['l1', 'l2', 'l3'] as const) {
      const records = this.data[layer] as AnyRecord[];
      const index = records.findIndex((record) => record.id === id);
      if (index >= 0) {
        const [removed] = records.splice(index, 1);
        this.removedRecords.push(removed);
        this.scheduleSave(layer);
        return true;
      }
    }
    return false;
  }

  /** Drop the least valuable records when a layer exceeds its cap. */
  private trim(layer: Layer): void {
    const limit = layer === 'l1' ? this.config.maxL1 : layer === 'l2' ? this.config.maxL2 : this.config.maxL3;
    const records = this.data[layer] as AnyRecord[];
    if (records.length <= limit) return;
    records.sort((a, b) => {
      const importance = a.importance - b.importance;
      if (importance !== 0) return importance;
      return a.createdAt - b.createdAt;
    });
    const drop = records.length - limit;
    const dropped = records.splice(0, drop);
    this.removedRecords.push(...(dropped as AnyRecord[]));
  }

  /** Drain records removed by delete/trim so callers can invalidate indexes. */
  takeRemoved(): AnyRecord[] {
    const removed = this.removedRecords;
    this.removedRecords = [];
    return removed;
  }

  private scheduleSave(layer: Layer): void {
    this.dirty.add(layer);
    const existing = this.timers.get(layer);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      this.timers.delete(layer);
      void this.saveLayer(layer).catch(() => undefined);
    }, 250);
    timer.unref?.();
    this.timers.set(layer, timer);
  }

  private saveLayer(layer: Layer): Promise<void> {
    this.dirty.delete(layer);
    const previous = this.saveChains.get(layer) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const content = JSON.stringify(this.data[layer], null, 1);
        await writeFileAtomic(this.fileFor(layer), content, { mode: 0o600, dirMode: 0o700 });
      });
    this.saveChains.set(layer, next);
    return next;
  }

  /** Persist every dirty layer immediately. */
  async flush(): Promise<void> {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    const layers = [...this.dirty];
    this.dirty.clear();
    await Promise.all(layers.map((layer) => this.saveLayer(layer)));
  }

  async stats(): Promise<StoreStats> {
    await this.whenReady();
    let bytes = 0;
    for (const layer of ['l1', 'l2', 'l3'] as const) {
      try {
        const stat = await fs.stat(this.fileFor(layer));
        bytes += stat.size;
      } catch {
        // absent file counts as zero
      }
    }
    const all = [...this.data.l1, ...this.data.l2, ...this.data.l3];
    let sourceBacked = 0;
    let sourcePointer = 0;
    let sourceNone = 0;
    let revisioned = 0;
    for (const record of all) {
      const source = sourceFor(record);
      if (source?.excerpt && source.excerpt.trim().length > 0) sourceBacked += 1;
      else if (source) sourcePointer += 1;
      else sourceNone += 1;
      if ((record.history?.length ?? 0) > 0) revisioned += 1;
    }
    return {
      dir: this.dir,
      l1: this.data.l1.length,
      l2: this.data.l2.length,
      l3: this.data.l3.length,
      embedded: all.filter((record) => Array.isArray(record.embedding) && record.embedding.length > 0).length,
      bytes,
      sourceBacked,
      sourcePointer,
      sourceNone,
      revisioned,
      injected: all.filter((record) => (record.accessCount ?? 0) > 0).length,
      cited: all.filter((record) => (record.citedCount ?? 0) > 0).length,
    };
  }
}
