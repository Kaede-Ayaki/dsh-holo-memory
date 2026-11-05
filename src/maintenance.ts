/**
 * Daily maintenance: archive stale L1 dialogue summaries and record the run.
 *
 * L1 is an evidence layer, so archival is limited and reversible-by-file:
 * records are appended to `archive/l1-YYYY-MM.jsonl` before they are removed
 * from the active store. High-importance L1 survives until a hard max age.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import type { HoloConfig } from './config.js';
import type { HoloStore } from './store.js';
import type { L1Record } from './types.js';

export interface MaintenanceOptions {
  now?: number;
  dryRun?: boolean;
  /** Override `config.l1ArchiveAfterDays` for a manual aggressive pass. */
  olderThanDays?: number;
}

export interface MaintenanceResult {
  at: number;
  dryRun: boolean;
  olderThanDays: number;
  archived: number;
  kept: number;
  archiveFile: string;
  ids: string[];
}

export interface MaintenanceState {
  lastRunAt: number;
  lastArchived: number;
  lastArchiveFile: string;
}

let active: Promise<MaintenanceResult> | null = null;

function ageDays(record: L1Record, now: number): number {
  return Math.max(0, (now - record.createdAt) / 86_400_000);
}

export function selectL1ForArchive(
  records: L1Record[],
  config: HoloConfig,
  now: number,
  olderThanDays = config.l1ArchiveAfterDays,
): Array<{ record: L1Record; reason: 'stale-low-importance' | 'hard-max-age' }> {
  const after = Math.max(1, olderThanDays);
  const max = Math.max(after, config.l1ArchiveMaxDays);
  const keepImportance = Math.max(1, Math.min(10, config.l1ArchiveKeepImportance));
  const selected: Array<{ record: L1Record; reason: 'stale-low-importance' | 'hard-max-age' }> = [];
  for (const record of records) {
    const age = ageDays(record, now);
    if (age >= max) selected.push({ record, reason: 'hard-max-age' });
    else if (age >= after && record.importance < keepImportance) {
      selected.push({ record, reason: 'stale-low-importance' });
    }
  }
  return selected;
}

function monthStamp(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function statePath(store: HoloStore): string {
  return path.join(store.dir, 'maintenance.json');
}

export async function readMaintenanceState(store: HoloStore): Promise<MaintenanceState | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(statePath(store), 'utf8')) as Partial<MaintenanceState>;
    if (typeof parsed.lastRunAt !== 'number') return null;
    return {
      lastRunAt: parsed.lastRunAt,
      lastArchived: typeof parsed.lastArchived === 'number' ? parsed.lastArchived : 0,
      lastArchiveFile: typeof parsed.lastArchiveFile === 'string' ? parsed.lastArchiveFile : '',
    };
  } catch {
    return null;
  }
}

async function runMaintenance(
  store: HoloStore,
  config: HoloConfig,
  options: MaintenanceOptions,
): Promise<MaintenanceResult> {
  await store.whenReady();
  const now = options.now ?? Date.now();
  const olderThanDays = options.olderThanDays ?? config.l1ArchiveAfterDays;
  const selected = selectL1ForArchive(store.list('l1') as L1Record[], config, now, olderThanDays);
  const archiveFile = path.join(store.dir, 'archive', `l1-${monthStamp(now)}.jsonl`);
  const result: MaintenanceResult = {
    at: now,
    dryRun: options.dryRun === true,
    olderThanDays,
    archived: selected.length,
    kept: store.list('l1').length - selected.length,
    archiveFile,
    ids: selected.map((entry) => entry.record.id),
  };
  if (options.dryRun === true || selected.length === 0) {
    if (!result.dryRun) {
      await writeMaintenanceState(store, { lastRunAt: now, lastArchived: 0, lastArchiveFile: '' });
    }
    return result;
  }

  await fs.mkdir(path.dirname(archiveFile), { recursive: true, mode: 0o700 });
  const lines = selected.map((entry) =>
    JSON.stringify({
      archivedAt: now,
      reason: entry.reason,
      ageDays: Math.round(ageDays(entry.record, now) * 10) / 10,
      record: entry.record,
    }),
  );
  await fs.appendFile(archiveFile, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  for (const entry of selected) store.remove(entry.record.id);
  await store.flush();
  await writeMaintenanceState(store, {
    lastRunAt: now,
    lastArchived: selected.length,
    lastArchiveFile: archiveFile,
  });
  return result;
}

async function writeMaintenanceState(store: HoloStore, state: MaintenanceState): Promise<void> {
  await writeFileAtomic(statePath(store), `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
    dirMode: 0o700,
  });
}

/** Serialize concurrent manual/API/timer maintenance runs. */
export function maintainMemory(
  store: HoloStore,
  config: HoloConfig,
  options: MaintenanceOptions = {},
): Promise<MaintenanceResult> {
  if (active) return active;
  active = runMaintenance(store, config, options).finally(() => {
    active = null;
  });
  return active;
}

export function nextDailyDelay(now: number, hour: number, minute: number): number {
  const next = new Date(now);
  next.setHours(Math.max(0, Math.min(23, Math.floor(hour))), Math.max(0, Math.min(59, Math.floor(minute))), 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now;
}

export interface MaintenanceLogger {
  info?(message: string): void;
  warn(message: string): void;
}

/**
 * Start the daily timer. If the last recorded run is older than 20 hours
 * (or absent), run once shortly after startup to catch up, then resume the
 * normal daily slot.
 */
export function startMaintenanceSchedule(
  store: HoloStore,
  config: HoloConfig,
  logger: MaintenanceLogger,
): () => void {
  if (!config.maintenanceEnabled) return () => undefined;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const run = async (): Promise<void> => {
    try {
      const result = await maintainMemory(store, config);
      if (result.archived > 0) {
        logger.info?.(`[holo-memory] maintenance archived ${result.archived} L1 → ${result.archiveFile}`);
      }
    } catch (error) {
      logger.warn(`[holo-memory] maintenance failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const scheduleNext = (): void => {
    if (stopped) return;
    const delay = nextDailyDelay(Date.now(), config.maintenanceHour, config.maintenanceMinute);
    timer = setTimeout(() => {
      void run().finally(() => scheduleNext());
    }, delay);
    timer.unref?.();
  };

  void (async () => {
    const state = await readMaintenanceState(store);
    const stale = !state || Date.now() - state.lastRunAt > 20 * 3_600_000;
    if (stale) {
      timer = setTimeout(() => {
        void run().finally(() => scheduleNext());
      }, 30_000);
      timer.unref?.();
    } else {
      scheduleNext();
    }
  })();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
