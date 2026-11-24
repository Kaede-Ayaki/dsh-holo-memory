import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { EmbeddingClient } from '../lib/embeddings.js';
import { recall, recentFallback } from '../lib/retrieval.js';
import { applyCitationFeedback } from '../lib/feedback.js';
import { ngramCoverage } from '../lib/lexical.js';

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
  assert.ok(result.items.some((item) => item.channels.includes('lexical')), 'lexical channel contributes');
  assert.equal(result.activeCount, 0, 'active window is a fallback, not a prefix');
  assert.doesNotMatch(result.text, /主动携带/);
  assert.match(result.text, /\(id:[0-9a-f]{8}\)/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('ngram coverage is high for the matching document and low otherwise', () => {
  assert.ok(ngramCoverage('部署 Windows 测试', '这个项目的部署目标是 Windows，测试命令是 pnpm test。') > 0.5);
  assert.ok(ngramCoverage('明天天气', '这个项目的部署目标是 Windows，测试命令是 pnpm test。') < 0.2);
});

test('unrelated policy facts do not ride along with a task query, but still win their own query', async () => {
  const { dir, store, config, project } = await seed();
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
  const task = store.insert({
    ...base,
    id: newId('l1'),
    layer: 'l1',
    importance: 5,
    hash: contentHash('ppt-task'),
    sessionId: 's-ppt',
    turn: 1,
    cwd: 'D:\\work\\demo',
    summary: '重做介绍 PPT，配音示例先把文本和生成脚本做好。',
    topics: ['PPT', '配音', 'TTS'],
    intent: '重做介绍材料',
    outcome: '已给出 PPT 与音频示例',
  });
  const policy = store.insert({
    ...base,
    id: newId('l2'),
    layer: 'l2',
    importance: 10,
    hash: contentHash('prompt-fence'),
    text: '交付提示词时必须把成品放进可复制围栏代码块。',
    kind: 'preference',
    tags: ['提示词', '围栏', '交付格式'],
    confidence: 0.95,
  });
  const embedder = new EmbeddingClient(config);
  const taskResult = await recall(store, embedder, config, '重做介绍ppt，给我几段配音示例。', {
    projectKey: project.key,
    maxChars: 1200,
    minScore: 0.12,
    counts: { l1: 2, l2: 5, l3: 3 },
  });
  assert.ok(taskResult);
  assert.ok(taskResult.items.some((item) => item.record.id === task.id), 'task turn is retrieved');
  assert.ok(!taskResult.items.some((item) => item.record.id === policy.id), 'prompt policy is not a task hit');
  assert.equal(taskResult.activeCount, 0);

  const policyResult = await recall(store, embedder, config, '提示词交付时必须带可复制围栏吗？', {
    projectKey: project.key,
    maxChars: 1200,
    minScore: 0.12,
    counts: { l1: 2, l2: 5, l3: 3 },
  });
  assert.ok(policyResult);
  assert.ok(policyResult.items.some((item) => item.record.id === policy.id), 'explicit policy query still retrieves it');
  await fs.rm(dir, { recursive: true, force: true });
});


test('citation feedback records access and only counts a real suffix citation', async () => {
  const { dir, store, project } = await seed();
  const record = store.visible('l2', project.key)[0];
  const before = record.updatedAt;
  const cited = applyCitationFeedback(store, [record.id], `详见记忆 ${record.id.slice(-8)}。`);
  assert.equal(cited.touched, 1);
  assert.equal(cited.cited, 1);
  assert.equal(store.find(record.id).accessCount, 1);
  assert.equal(store.find(record.id).citedCount, 1);
  assert.equal(store.find(record.id).updatedAt, before, 'feedback must not shift content recency');
  const uncited = applyCitationFeedback(store, [record.id], '与记忆无关的回答。');
  assert.equal(uncited.cited, 0);
  assert.equal(store.find(record.id).accessCount, 2);
  assert.equal(store.find(record.id).citedCount, 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('a strong neuron hit opens the relevance gate, a weak one does not', async () => {
  const { dir, store, project } = await seed();
  const config = normalizeConfig({ activeWindowEnabled: false });
  const embedder = new EmbeddingClient(config);
  const record = store.visible('l2', project.key)[0];
  const base = {
    projectKey: project.key,
    currentSessionId: 's-new',
    maxChars: 1200,
    minScore: 0.12,
    counts: { l1: 2, l2: 1, l3: 3 },
  };

  const weak = await recall(store, embedder, config, '完全不相关的天气问题', {
    ...base,
    neuronHits: [{ id: record.id, activation: 0.6 }],
  });
  assert.equal(weak, null, 'a weak associative hint alone must not inject an unrelated memory');

  const strong = await recall(store, embedder, config, '完全不相关的天气问题', {
    ...base,
    neuronHits: [{ id: record.id, activation: 0.95 }],
  });
  assert.ok(strong, 'a strong neuron hit can open the gate');
  assert.ok(strong.items.some((item) => item.record.id === record.id));
  assert.ok(strong.items.some((item) => item.channels.includes('neuron')));
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

test('recall returns null when nothing clears the relevance bar and active window is off', async () => {
  const { dir, store, project } = await seed();
  const config = normalizeConfig({ activeWindowEnabled: false });
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

test('active window still injects resident memory when the query has no hit', async () => {
  const { dir, store, config, project } = await seed();
  const embedder = new EmbeddingClient(config);
  const result = await recall(store, embedder, config, '明天天气怎么样？', {
    projectKey: project.key,
    currentSessionId: 's-new',
    maxChars: 1200,
    minScore: 0.12,
    counts: { l1: 2, l2: 5, l3: 3 },
  });
  assert.ok(result);
  assert.ok(result.activeCount >= 1);
  assert.match(result.text, /主动携带/);
  await fs.rm(dir, { recursive: true, force: true });
});
