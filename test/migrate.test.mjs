import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { projectIdFor, contentHash } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';

const SCRIPT = path.resolve('scripts/migrate-project-keys.mjs');

function oldKeyFor(cwd) {
  return `p-${crypto.createHash('sha1').update(cwd).digest('hex').slice(0, 12)}`;
}

function l1(projectKey, cwd, now) {
  return {
    id: `l1_${Math.random().toString(36).slice(2, 8)}`,
    layer: 'l1',
    scope: 'project',
    projectKey,
    projectLabel: 'old',
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: contentHash(String(Math.random())),
    sessionId: 's1',
    turn: 1,
    cwd,
    summary: '摘要。',
    topics: [],
  };
}

async function writeStore(dir, l1s, l2s) {
  await fs.writeFile(path.join(dir, 'l1.json'), JSON.stringify(l1s), 'utf8');
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify(l2s), 'utf8');
  await fs.writeFile(path.join(dir, 'l3.json'), '[]', 'utf8');
}

function run(args) {
  return execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('project-key migration maps old cwd keys and updates the label', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-mig-'));
  await fs.mkdir(path.join(root, '.git'));
  const nested = path.join(root, 'packages', 'app');
  await fs.mkdir(nested, { recursive: true });
  const now = Date.now();
  const oldKey = oldKeyFor(nested);
  const l2 = {
    id: 'l2_mig1',
    layer: 'l2',
    scope: 'project',
    projectKey: oldKey,
    projectLabel: 'old',
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: 'h',
    text: '记录。',
    kind: 'fact',
    tags: [],
    confidence: 0.5,
  };
  const dir = path.join(root, 'store');
  await fs.mkdir(dir);
  await writeStore(dir, [l1(oldKey, nested, now)], [l2]);

  const out = JSON.parse(run(['--data', dir, '--apply']));
  assert.ok(out.changed >= 1, 'L1 and L2 records sharing the old key are updated');
  const migrated = JSON.parse(await fs.readFile(path.join(dir, 'l2.json'), 'utf8'))[0];
  assert.equal(migrated.projectKey, projectIdFor(nested).key);
  assert.equal(migrated.projectLabel, projectIdFor(nested).label);

  // idempotent: second run changes nothing
  const again = JSON.parse(run(['--data', dir, '--apply']));
  assert.equal(again.changed, 0);
  await fs.rm(root, { recursive: true, force: true });
});

test('conflicting mappings block that key and leave records untouched', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-mig-conflict-'));
  const a = path.join(root, 'repo-a');
  const b = path.join(root, 'repo-b');
  await fs.mkdir(path.join(a, '.git'), { recursive: true });
  await fs.mkdir(path.join(b, '.git'), { recursive: true });
  const now = Date.now();
  const oldKey = 'p-aaaaaaaaaaaa';
  const l2 = {
    id: 'l2_conf',
    layer: 'l2',
    scope: 'project',
    projectKey: oldKey,
    projectLabel: 'old',
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: 'h',
    text: '记录。',
    kind: 'fact',
    tags: [],
    confidence: 0.5,
  };
  const dir = path.join(root, 'store');
  await fs.mkdir(dir);
  await writeStore(dir, [l1(oldKey, a, now), l1(oldKey, b, now)], [l2]);

  const out = JSON.parse(run(['--data', dir, '--apply']));
  assert.ok(out.conflicts.length >= 1);
  assert.ok(out.skippedConflicts.includes(oldKey));
  assert.equal(out.changed, 0);
  const untouched = JSON.parse(await fs.readFile(path.join(dir, 'l2.json'), 'utf8'))[0];
  assert.equal(untouched.projectKey, oldKey);
  await fs.rm(root, { recursive: true, force: true });
});
