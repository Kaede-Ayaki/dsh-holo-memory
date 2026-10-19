import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeConfig } from '../lib/config.js';
import { HoloStore, projectIdFor } from '../lib/store.js';
import { applyExtraction, extractTurn, normalizeExtraction, parseJsonObject } from '../lib/extract.js';

function capture(overrides = {}) {
  const project = projectIdFor('D:\\work\\demo');
  return {
    sessionId: 's-1',
    turn: 1,
    cwd: 'D:\\work\\demo',
    projectKey: project.key,
    projectLabel: project.label,
    userTexts: ['记住：这个项目用 pnpm，测试命令是 pnpm test。'],
    assistantTexts: ['好的，已记住。这个项目使用 pnpm，测试命令是 pnpm test。'],
    startedAt: Date.now(),
    ...overrides,
  };
}

test('parseJsonObject tolerates fences and trailing prose', () => {
  const parsed = parseJsonObject('```json\n{"l1":{"summary":"x"}}\n```');
  assert.deepEqual(parsed, { l1: { summary: 'x' } });
  const withProse = parseJsonObject('Here you go: {"a":1} hope it helps');
  assert.deepEqual(withProse, { a: 1 });
});

test('normalizeExtraction drops secrets and bounds fields', () => {
  const result = normalizeExtraction({
    l1: { summary: '  summary  ', topics: ['a', 'a', 'b'] },
    l2: [
      { text: '用户偏好 pnpm', kind: 'preference', scope: 'user', tags: ['x'], confidence: 2, importance: 30 },
      { text: 'sk-abcdefghijklmnop1234567890', kind: 'fact' },
    ],
    l3: [{ title: '用户画像', hologram: '用户是准备面试的 Python 后端工程师，偏好中文交流。', scope: 'user' }],
  });
  assert.equal(result.l1.summary, 'summary');
  assert.equal(result.l2.length, 1);
  assert.equal(result.l2[0].importance, 10);
  assert.equal(result.l2[0].confidence, 1);
  assert.equal(result.l3.length, 1);
});

test('applyExtraction dedupes facts and updates the same turn summary', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-extract-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const turn = capture();
  const payload = {
    l1: { summary: '用户说明了包管理器与测试命令。', topics: ['pnpm'], importance: 5 },
    l2: [{ text: '这个项目使用 pnpm，测试命令是 pnpm test。', kind: 'decision', scope: 'project', tags: ['pnpm'], confidence: 0.9 }],
    l3: [],
  };
  applyExtraction(store, config, turn, payload);
  applyExtraction(store, config, turn, payload);
  assert.equal(store.list('l1').length, 1, 'same session/turn updates the L1 record');
  assert.equal(store.list('l2').length, 1, 'near-duplicate fact updates instead of duplicating');
  await fs.rm(dir, { recursive: true, force: true });
});

test('extractTurn falls back to a deterministic L1 summary without an LLM', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-fallback-'));
  const config = normalizeConfig({ extractMinTurnChars: 1 });
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const result = await extractTurn({ store, config }, capture());
  assert.ok(result?.l1);
  assert.equal(store.list('l1').length, 1);
  assert.match(store.list('l1')[0].summary, /pnpm/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('extractTurn uses the LLM stream and stores L1/L2/L3', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-llm-'));
  const config = normalizeConfig({ extractMinTurnChars: 1 });
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const payload = {
    l1: { summary: '用户要求把项目包管理器统一为 pnpm。', topics: ['pnpm', '包管理器'], intent: '统一工具链', outcome: '已确认' },
    l2: [{ text: '项目包管理器使用 pnpm，不用 npm。', kind: 'decision', scope: 'project', tags: ['pnpm'], confidence: 0.95, importance: 8 }],
    l3: [{ title: '项目工具链约定', hologram: '这个项目的工具链以 pnpm 为核心，测试命令是 pnpm test，部署目标为 Windows。', themes: ['工具链'], entities: ['pnpm'], open_loops: [], scope: 'project', importance: 8 }],
  };
  const body = JSON.stringify(payload);
  const fakeLlm = {
    async *stream() {
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: body };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: body } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    },
  };
  const result = await extractTurn({ store, config, llm: fakeLlm, route: { provider: 'mock', model: 'mock' } }, capture());
  assert.ok(result);
  assert.equal(store.list('l1').length, 1);
  assert.equal(store.list('l2').length, 1);
  assert.equal(store.list('l3').length, 1);
  assert.match(store.list('l3')[0].hologram, /pnpm/);
  await fs.rm(dir, { recursive: true, force: true });
});
