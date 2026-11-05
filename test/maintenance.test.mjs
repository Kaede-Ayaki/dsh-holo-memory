import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeConfig } from '../lib/config.js';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { maintainMemory, nextDailyDelay, readMaintenanceState, selectL1ForArchive } from '../lib/maintenance.js';

function l1(createdAt, importance, text) {
  const project = projectIdFor('D:\\work\\demo');
  return {
    id: newId('l1'),
    layer: 'l1',
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance,
    createdAt,
    updatedAt: createdAt,
    hash: contentHash(text),
    sessionId: 's-maint',
    turn: 1,
    cwd: 'D:\\work\\demo',
    summary: text,
    topics: [],
  };
}

test('maintenance archives stale L1, keeps recent and important ones, and records state', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-maint-'));
  const config = normalizeConfig({ l1ArchiveAfterDays: 14, l1ArchiveKeepImportance: 8, l1ArchiveMaxDays: 60 });
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const now = Date.now();
  store.insert(l1(now - 20 * 86_400_000, 4, '二十天前的低重要度旧摘要'));
  store.insert(l1(now - 20 * 86_400_000, 8, '二十天前的高重要度摘要'));
  store.insert(l1(now - 70 * 86_400_000, 10, '七十天前的高重要度摘要'));
  store.insert(l1(now - 1 * 86_400_000, 4, '昨天的新摘要'));
  await store.flush();

  const selected = selectL1ForArchive(store.list('l1'), config, now);
  assert.equal(selected.length, 2);
  assert.deepEqual(selected.map((entry) => entry.reason).sort(), ['hard-max-age', 'stale-low-importance']);

  const preview = await maintainMemory(store, config, { now, dryRun: true });
  assert.equal(preview.archived, 2);
  assert.equal(store.list('l1').length, 4, 'dry run must not remove records');

  const result = await maintainMemory(store, config, { now });
  assert.equal(result.archived, 2);
  assert.equal(store.list('l1').length, 2);
  const archived = (await fs.readFile(result.archiveFile, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(archived.length, 2);
  assert.equal(archived[0].record.layer, 'l1');
  assert.ok(archived.some((entry) => entry.record.summary.includes('二十天前的低重要度')));
  assert.ok(archived.some((entry) => entry.record.summary.includes('七十天前')));

  const state = await readMaintenanceState(store);
  assert.equal(state.lastArchived, 2);
  const again = await maintainMemory(store, config, { now });
  assert.equal(again.archived, 0);
  assert.ok(nextDailyDelay(now, 4, 30) > 0);
  assert.ok(nextDailyDelay(now, 4, 30) <= 24 * 3_600_000);
  await fs.rm(dir, { recursive: true, force: true });
});
