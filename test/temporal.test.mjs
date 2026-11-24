import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { EmbeddingClient } from '../lib/embeddings.js';
import { recall } from '../lib/retrieval.js';
import { createClaimMeta, normalizeConfidence } from '../lib/confidence.js';
import { buildTimeline, formatTimeline } from '../lib/timeline.js';

const DAY = 86_400_000;

async function seed() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-time-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const base = {
    layer: 'l2',
    projectKey: project.key,
    projectLabel: 'demo',
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    hash: contentHash('x'),
    importance: 8,
    kind: 'fact',
    tags: ['aquarium'],
    confidence: 0.9,
  };

  const active = createClaimMeta('user_explicit', { confidence: 0.9 });
  active.observedAt = now - 5 * DAY;
  active.recordedAt = now - 5 * DAY;
  active.validFrom = now - 2 * DAY;
  store.insert({ ...base, id: newId('l2'), text: '水族箱过滤器每三周清洗一次，当前使用中。', claim: active });

  const expired = createClaimMeta('user_explicit', { confidence: 0.8 });
  expired.observedAt = now - 30 * DAY;
  expired.validFrom = now - 30 * DAY;
  expired.validTo = now - 1 * DAY;
  store.insert({ ...base, id: newId('l2'), text: '水族箱过滤器每周清洗一次（旧习惯，已过期）。', claim: expired });

  const future = createClaimMeta('user_explicit', { confidence: 0.8 });
  future.observedAt = now + DAY;
  future.recordedAt = now;
  future.validFrom = now + 1 * DAY;
  store.insert({ ...base, id: newId('l2'), text: '水族箱过滤器每两周清洗一次（新习惯，明天起生效）。', claim: future });

  const superseded = createClaimMeta('user_explicit', { confidence: 0.7 });
  superseded.status = 'superseded';
  superseded.supersededBy = 'l2_newer';
  store.insert({ ...base, id: newId('l2'), text: '水族箱过滤器每两天清洗一次（已被替代）。', claim: superseded });

  store.insert({ ...base, id: newId('l2'), text: '水族箱过滤器换水时顺便清洗（无时间标注的旧记录）。' });

  return { dir, store, config, project, now };
}

async function idsAt(store, config, project, query, asOf) {
  const embedder = new EmbeddingClient(config);
  const result = await recall(store, embedder, config, query, {
    projectKey: project.key,
    maxChars: 6000,
    minScore: 0.05,
    counts: { l1: 0, l2: 10, l3: 0 },
    asOf,
  });
  return result ? result.items.map((item) => item.record.id) : [];
}

function textOfId(store, id) {
  return String(store.find(id)?.text ?? '');
}

test('asOf=now returns only currently valid claims plus legacy records', async () => {
  const { store, config, project, now } = await seed();
  const ids = await idsAt(store, config, project, '水族箱过滤器 清洗 周期', now);
  const texts = ids.map((id) => textOfId(store, id));
  assert.ok(texts.some((text) => text.includes('当前使用中')), 'active claim visible');
  assert.ok(texts.some((text) => text.includes('无时间标注')), 'legacy record without claim stays visible');
  assert.ok(!texts.some((text) => text.includes('已过期')), 'expired claim hidden');
  assert.ok(!texts.some((text) => text.includes('明天起生效')), 'future claim hidden');
  assert.ok(!texts.some((text) => text.includes('已被替代')), 'superseded claim hidden');
});

test('asOf in the future reveals claims that are not valid yet', async () => {
  const { store, config, project, now } = await seed();
  const ids = await idsAt(store, config, project, '水族箱过滤器 清洗 周期', now + 2 * DAY);
  const texts = ids.map((id) => textOfId(store, id));
  assert.ok(texts.some((text) => text.includes('明天起生效')), 'future claim becomes valid after validFrom');
  assert.ok(!texts.some((text) => text.includes('已过期')), 'expired claim stays hidden');
});

test('asOf in the past can read a claim that has since expired', async () => {
  const { store, config, project, now } = await seed();
  const ids = await idsAt(store, config, project, '水族箱过滤器 清洗 周期', now - 10 * DAY);
  const texts = ids.map((id) => textOfId(store, id));
  assert.ok(texts.some((text) => text.includes('已过期')), 'historical query sees the then-valid claim');
  assert.ok(!texts.some((text) => text.includes('明天起生效')), 'future claim hidden from the past');
});

test('confidence normalizes temporal claims to three decimals', async () => {
  const { store } = await seed();
  const record = store.list('l2').find((entry) => String(entry.text).includes('当前使用中'));
  assert.ok(record?.claim);
  assert.equal(record.claim.confidence, normalizeConfidence(record.claim.confidence));
  assert.equal(record.claim.status, 'active');
});


test('a superseded claim stays readable before validTo and disappears afterwards', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-super-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const changedAt = now - 2 * DAY;
  const base = {
    layer: 'l2',
    projectKey: project.key,
    projectLabel: 'demo',
    scope: 'project',
    createdAt: now - 10 * DAY,
    updatedAt: now,
    hash: contentHash('y'),
    importance: 8,
    kind: 'preference',
    tags: ['style'],
    confidence: 0.9,
  };
  const oldClaim = createClaimMeta('user_explicit', { confidence: 0.9 });
  oldClaim.validFrom = now - 10 * DAY;
  oldClaim.validTo = changedAt;
  oldClaim.status = 'superseded';
  oldClaim.supersededBy = 'l2_new';
  const oldId = newId('l2');
  store.insert({ ...base, id: oldId, text: '水族箱过滤器清洗：每周一次（旧要求）。', claim: oldClaim });

  const newClaim = createClaimMeta('user_explicit', { confidence: 0.95 });
  newClaim.validFrom = changedAt;
  newClaim.supersedes = [oldId];
  const newIdRecord = newId('l2');
  store.insert({
    ...base,
    id: newIdRecord,
    createdAt: now - 2 * DAY,
    text: '水族箱过滤器清洗：每三周一次（新要求，替代每周）。',
    claim: newClaim,
  });

  const past = await idsAt(store, config, project, '水族箱过滤器 清洗 周期', now - 5 * DAY);
  const pastTexts = past.map((id) => textOfId(store, id));
  assert.ok(pastTexts.some((text) => text.includes('旧要求')), 'historical view keeps the old requirement');
  assert.ok(!pastTexts.some((text) => text.includes('新要求')), 'historical view hides the future requirement');

  const current = await idsAt(store, config, project, '水族箱过滤器 清洗 周期', now);
  const currentTexts = current.map((id) => textOfId(store, id));
  assert.ok(currentTexts.some((text) => text.includes('新要求')), 'current view shows the new requirement');
  assert.ok(!currentTexts.some((text) => text.includes('旧要求')), 'current view hides the replaced requirement');
});


test('timeline walks the supersede chain oldest-first', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-line-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const base = {
    layer: 'l2',
    projectKey: project.key,
    projectLabel: 'demo',
    scope: 'project',
    createdAt: now,
    updatedAt: now,
    hash: contentHash('z'),
    importance: 7,
    kind: 'preference',
    tags: ['style'],
    confidence: 0.9,
  };
  const oldId = newId('l2');
  const oldClaim = createClaimMeta('user_explicit', { confidence: 0.9 });
  oldClaim.validFrom = now - 3 * DAY;
  store.insert({ ...base, id: oldId, text: '提示词交付：只用 tag 流。', claim: oldClaim });

  const newClaim = createClaimMeta('user_explicit', { confidence: 0.95 });
  newClaim.validFrom = now - DAY;
  newClaim.supersedes = [oldId];
  const newIdRecord = newId('l2');
  store.insert({ ...base, id: newIdRecord, text: '提示词交付：tag 流 + 英文长描述两段。', claim: newClaim });

  store.update('l2', oldId, {
    claim: { ...oldClaim, status: 'superseded', validTo: now - DAY, supersededBy: newIdRecord },
    supersededBy: newIdRecord,
  });

  const entries = buildTimeline(store, newIdRecord);
  assert.equal(entries.length, 2);
  assert.match(entries[0].text, /tag 流。/);
  assert.equal(entries[0].status, 'superseded');
  assert.match(entries[1].text, /英文长描述/);
  assert.equal(entries[1].status, 'active');
  const text = formatTimeline(entries);
  assert.match(text, /时间线（旧 → 新）/);
  assert.match(text, /superseded/);
});
