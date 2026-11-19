import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RuntimeToggles } from '../lib/runtime.js';
import { normalizeConfig } from '../lib/config.js';
import { HoloStore } from '../lib/store.js';

test('runtime toggles default on, persist, and reload from disk', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-toggles-'));
  const a = new RuntimeToggles(dir);
  assert.deepEqual({ read: a.get().read, write: a.get().write }, { read: true, write: true });

  await a.set({ read: false });
  assert.equal(a.get().read, false);
  assert.equal(a.get().write, true);

  const b = new RuntimeToggles(dir);
  assert.equal(b.get().read, false);
  assert.equal(b.get().write, true);

  await b.set({ write: false });
  assert.deepEqual({ read: b.get().read, write: b.get().write }, { read: false, write: false });
  const raw = JSON.parse(readFileSync(path.join(dir, 'runtime-toggles.json'), 'utf8'));
  assert.equal(raw.read, false);
  assert.equal(raw.write, false);
  await fs.rm(dir, { recursive: true, force: true });
});

test('malformed runtime state falls back to both switches on', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-toggles-bad-'));
  await fs.writeFile(path.join(dir, 'runtime-toggles.json'), '{"read":"no"}', 'utf8');
  const toggles = new RuntimeToggles(dir);
  assert.deepEqual({ read: toggles.get().read, write: toggles.get().write }, { read: true, write: true });
  await fs.rm(dir, { recursive: true, force: true });
});

test('store write guard refuses insert/update/remove while writes are off', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-write-guard-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  let writes = false;
  store.setWriteGuard(() => writes);
  const record = {
    id: 'l2_guard_test',
    layer: 'l2',
    scope: 'project',
    projectKey: 'p',
    projectLabel: 'p',
    importance: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hash: 'h',
    text: 'guard',
    kind: 'fact',
    tags: [],
    confidence: 0.5,
    revision: 1,
  };
  assert.throws(() => store.insert(record), /writes are disabled/);
  writes = true;
  store.insert(record);
  writes = false;
  assert.throws(() => store.update('l2', record.id, { importance: 6 }), /writes are disabled/);
  assert.throws(() => store.remove(record.id), /writes are disabled/);
  writes = true;
  assert.equal(store.update('l2', record.id, { importance: 6 })?.importance, 6);
  assert.equal(store.remove(record.id), true);
  await fs.rm(dir, { recursive: true, force: true });
});
