import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'holo-store-'));
}

function l2(projectKey, text, importance = 6) {
  const now = Date.now();
  return {
    id: newId('l2'),
    layer: 'l2',
    scope: 'project',
    projectKey,
    projectLabel: 'demo',
    importance,
    createdAt: now,
    updatedAt: now,
    hash: contentHash(text),
    text,
    kind: 'fact',
    tags: [],
    confidence: 0.8,
  };
}

test('store persists, reloads, filters by project and caps growth', async () => {
  const dir = await tempDir();
  const config = normalizeConfig({ maxL2: 3 });
  const project = projectIdFor('D:\\work\\demo');
  const other = projectIdFor('D:\\work\\other');
  const store = new HoloStore(dir, config);
  await store.whenReady();
  store.insert(l2(project.key, '项目使用 pnpm', 9));
  store.insert(l2(project.key, '测试命令是 pnpm test', 3));
  store.insert(l2(project.key, '部署目标是 Windows', 5));
  const userScope = l2('', '用户偏好 TypeScript');
  userScope.scope = 'user';
  store.insert(userScope);
  assert.equal(store.list('l2').length, 3, 'cap keeps the two project facts plus the user fact');

  await store.flush();
  const reloaded = new HoloStore(dir, config);
  await reloaded.whenReady();
  assert.equal(reloaded.list('l2').length, 3);
  assert.equal(reloaded.visible('l2', project.key).length, 3);
  assert.equal(reloaded.visible('l2', other.key).length, 1, 'only the user-scope fact crosses projects');
  const stats = await reloaded.stats();
  assert.equal(stats.l2, 3);
  assert.equal(stats.l1, 0);
  await fs.rm(dir, { recursive: true, force: true });
});
