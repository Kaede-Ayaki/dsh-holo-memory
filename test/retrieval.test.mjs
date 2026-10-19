import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { EmbeddingClient } from '../lib/embeddings.js';
import { recall, recentFallback } from '../lib/retrieval.js';

async function seed() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-recall-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const base = {
    projectKey: project.key,
    projectLabel: 'demo',
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    embeddingModel: undefined,
    embedding: undefined,
  };
  store.insert({
    ...base,
    id: newId('l3'),
    layer: 'l3',
    importance: 9,
    hash: contentHash('用户画像'),
    title: '用户画像：Python 后端工程师',
    hologram: '用户正在准备面试，偏好中文，喜欢先给结论再展开。',
    themes: ['用户', '面试'],
    entities: ['Python'],
    openLoops: ['准备面试'],
    sourceSessions: ['s1'],
  });
  store.insert({
    ...base,
    id: newId('l2'),
    layer: 'l2',
    importance: 8,
    hash: contentHash('部署'),
    text: '这个项目的部署目标是 Windows，测试命令是 pnpm test。',
    kind: 'decision',
    tags: ['deploy', 'test'],
    confidence: 0.9,
  });
  store.insert({
    ...base,
    id: newId('l1'),
    layer: 'l1',
    importance: 5,
    hash: contentHash('上次对话'),
    sessionId: 's-old',
    turn: 1,
    cwd: 'D:\\work\\demo',
    summary: '上次我们讨论了 SQLite 全文检索与索引方案。',
    topics: ['SQLite', '检索'],
    intent: '选型',
    outcome: '选 FTS5',
  });
  return { dir, store, config, project };
}

test('recall returns relevant L1/L2/L3 under the budget', async () => {
  const { dir, store, config, project } = await seed();
  const embedder = new EmbeddingClient(config);
  const result = await recall(store, embedder, config, '部署到 Windows 的测试命令是什么？', {
    projectKey: project.key,
    currentSessionId: 's-new',
    maxChars: 1200,
    minScore: 0.05,
    counts: { l1: 2, l2: 5, l3: 3 },
  });
  assert.ok(result);
  assert.match(result.text, /Windows/);
  assert.match(result.text, /holo-memory/);
  assert.ok(result.text.length <= 1200 + 20);
  await fs.rm(dir, { recursive: true, force: true });
});

test('recentFallback surfaces L3 and recent L1 without a query', async () => {
  const { dir, store, project } = await seed();
  const text = await recentFallback(store, project.key, 1000);
  assert.ok(text);
  assert.match(text, /Python 后端工程师/);
  assert.match(text, /SQLite/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('recall returns null when nothing clears the relevance bar', async () => {
  const { dir, store, config, project } = await seed();
  const embedder = new EmbeddingClient(config);
  const result = await recall(store, embedder, config, '明天天气怎么样？', {
    projectKey: project.key,
    currentSessionId: 's-new',
    maxChars: 1200,
    minScore: 0.12,
    counts: { l1: 2, l2: 5, l3: 3 },
  });
  assert.equal(result, null);
  await fs.rm(dir, { recursive: true, force: true });
});
