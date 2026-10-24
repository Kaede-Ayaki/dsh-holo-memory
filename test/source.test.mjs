import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeConfig } from '../lib/config.js';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { applyExtraction } from '../lib/extract.js';
import { openRecord } from '../lib/open.js';
import { reviseRecord } from '../lib/revisions.js';
import {
  evidenceOf,
  evidenceTag,
  hashText,
  normalizeRecordSource,
  sourceFor,
  sourceFromTurn,
  verifySource,
} from '../lib/source.js';
import { runDoctor } from '../lib/doctor.js';

function capture(overrides = {}) {
  const project = projectIdFor('D:\\work\\demo');
  return {
    sessionId: 's-source',
    turn: 3,
    cwd: 'D:\\work\\demo',
    projectKey: project.key,
    projectLabel: project.label,
    userTexts: ['记住：部署目标是 Windows，测试命令是 pnpm test。'],
    assistantTexts: ['好的，已记录这个项目的部署与测试约定。'],
    startedAt: Date.now(),
    seqStart: 41,
    seqEnd: 57,
    ...overrides,
  };
}

test('turn source keeps a verbatim excerpt and verifiable hash', () => {
  const source = sourceFromTurn(capture());
  assert.equal(source.kind, 'turn');
  assert.equal(source.sessionId, 's-source');
  assert.equal(source.turn, 3);
  assert.equal(source.seqStart, 41);
  assert.match(source.excerpt, /\[user\]/);
  assert.match(source.excerpt, /pnpm test/);
  assert.equal(source.excerptHash, hashText(source.excerpt));
});

test('extraction attaches source pointers to L1/L2/L3', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-source-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  applyExtraction(store, config, capture(), {
    l1: { summary: '确认了部署与测试约定。', topics: ['部署'], importance: 5 },
    l2: [{ text: '项目部署目标是 Windows，测试命令是 pnpm test。', kind: 'decision', scope: 'project' }],
    l3: [{ title: '部署约定', hologram: '项目部署到 Windows，测试使用 pnpm test。', scope: 'project' }],
  });
  for (const layer of ['l1', 'l2', 'l3']) {
    const record = store.list(layer)[0];
    assert.equal(record.source.sessionId, 's-source', `${layer} source session`);
    assert.equal(record.source.turn, 3, `${layer} source turn`);
    assert.equal(record.source.seqStart, 41, `${layer} source seqStart`);
    assert.equal(record.source.seqEnd, 57, `${layer} source seqEnd`);
    assert.ok(record.source.excerpt.includes('pnpm test'), `${layer} verbatim excerpt`);
    assert.equal(verifySource(record).valid, true, `${layer} source hash`);
    assert.equal(evidenceOf(record), 'source');
    assert.equal(evidenceTag(record), '·源');
    assert.equal(record.revision, 1);
  }
  await fs.rm(dir, { recursive: true, force: true });
});

test('legacy records get an honest pointer, and openRecord never invents an excerpt', () => {
  const legacy = {
    id: newId('l2'),
    layer: 'l2',
    scope: 'project',
    projectKey: 'p-1',
    projectLabel: 'demo',
    importance: 5,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hash: contentHash('legacy'),
    text: '旧记录没有逐字片段。',
    kind: 'fact',
    tags: [],
    confidence: 0.8,
    sourceSessionId: 's-legacy',
    sourceTurn: 2,
  };
  const normalized = normalizeRecordSource(legacy);
  assert.equal(sourceFor(normalized).sessionId, 's-legacy');
  assert.equal(evidenceOf(normalized), 'pointer');
  const opened = openRecord(normalized);
  assert.match(opened, /session pointer only/);
  assert.match(opened, /no verbatim excerpt stored/);
  assert.doesNotMatch(opened, /source unavailable/);

  const missing = { ...legacy, sourceSessionId: undefined, sourceTurn: undefined };
  const openedMissing = openRecord(missing);
  assert.match(openedMissing, /source: unavailable/);
  assert.match(openedMissing, /Do not treat it as verified/);
  assert.equal(evidenceOf(missing), 'summary');
});

test('reviseRecord preserves previous content and openRecord exposes history', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-revision-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const turn = capture();
  applyExtraction(store, config, turn, {
    l1: { summary: '原始摘要。', topics: [] },
    l2: [{ text: '原始事实。', kind: 'fact' }],
    l3: [],
  });
  const fact = store.list('l2')[0];
  const patch = reviseRecord(fact, { text: '修正后的事实。', hash: contentHash('修正后的事实。') }, 'manual');
  store.update('l2', fact.id, patch);
  const revised = store.find(fact.id);
  assert.equal(revised.text, '修正后的事实。');
  assert.equal(revised.revision, 2);
  assert.equal(revised.history.length, 1);
  assert.equal(revised.history[0].snapshot.text, '原始事实。');
  const opened = openRecord(revised, { history: true });
  assert.match(opened, /history \(newest last\)/);
  assert.match(opened, /原始事实/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('doctor runs real source/open and retrieval probes', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-doctor-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  applyExtraction(store, config, capture(), {
    l1: { summary: '确认部署与测试约定。', topics: ['部署'] },
    l2: [{ text: '项目部署目标是 Windows，测试命令是 pnpm test。', kind: 'decision', scope: 'project' }],
    l3: [],
  });
  const report = await runDoctor({ store, config }, { deep: true });
  assert.equal(report.ok, true);
  const byId = new Map(report.checks.map((check) => [check.id, check]));
  assert.equal(byId.get('source:open').level, 'ok');
  assert.equal(byId.get('retrieval:probe').level, 'ok');
  assert.equal(byId.get('doctor:self').level, 'ok');
  assert.ok(report.summary.ok >= 3);
  await fs.rm(dir, { recursive: true, force: true });
});
