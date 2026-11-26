import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { applyExtraction } from '../lib/extract.js';
import { buildAProfile, ProfileStore } from '../lib/profile.js';
import { buildTimeline } from '../lib/timeline.js';
import { runDoctor } from '../lib/doctor.js';
import { createClaimMeta, normalizeConfidence } from '../lib/confidence.js';
import { setCalibration, getCalibration, IDENTITY_CALIBRATION } from '../lib/calibration.js';

const DAY = 86_400_000;

function l2Base(project, extra) {
  const now = Date.now();
  return {
    layer: 'l2',
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance: 7,
    createdAt: now,
    updatedAt: now,
    hash: contentHash(String(extra.id)),
    revision: 1,
    ...extra,
  };
}

test('extraction rejects an invalid supersede target set without touching old claims', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-sup-guard-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const projectA = projectIdFor('D:\\work\\a');
  const projectB = projectIdFor('D:\\work\\b');

  const other = createClaimMeta('user_explicit', { confidence: 0.9 });
  const otherId = newId('l2');
  store.insert(l2Base(projectB, { id: otherId, text: '另一个项目的约定。', kind: 'decision', tags: [], confidence: 0.9, claim: other }));

  const turn = {
    sessionId: 's-a',
    turn: 1,
    cwd: 'D:\\work\\a',
    projectKey: projectA.key,
    projectLabel: projectA.label,
    userTexts: ['改成每三周。'],
    assistantTexts: ['好。'],
    startedAt: Date.now(),
  };
  applyExtraction(store, config, turn, {
    l1: { summary: '调整清洗周期。', topics: ['filter'], importance: 4 },
    l2: [
      {
        text: '过滤器改为每三周一次。',
        kind: 'preference',
        scope: 'project',
        tags: ['filter'],
        confidence: 0.9,
        supersedes: [otherId, 'l2_missing000'],
      },
    ],
    l3: [],
  });

  const created = store.list('l2').find((record) => record.text.includes('每三周'));
  assert.ok(created);
  assert.deepEqual(created.claim.supersedes ?? [], [], 'invalid target set must not write a partial relation');
  const untouched = store.find(otherId);
  assert.equal(untouched.claim.status, 'active');
  assert.equal(untouched.claim.validTo, undefined);
  await fs.rm(dir, { recursive: true, force: true });
});

test('project profile ignores expired L1 sources', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-prof-l1-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();

  const expiredClaim = createClaimMeta('user_explicit', { confidence: 0.9 });
  expiredClaim.validFrom = now - 10 * DAY;
  expiredClaim.validTo = now - DAY;
  const expiredId = newId('l1');
  store.insert({
    id: expiredId,
    layer: 'l1',
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance: 5,
    createdAt: now - 10 * DAY,
    updatedAt: now - 10 * DAY,
    hash: contentHash('old'),
    sessionId: 's-old',
    turn: 1,
    cwd: 'D:\\work\\demo',
    summary: '旧风格：先解释再给结论。',
    topics: [],
    intent: '旧风格',
    claim: expiredClaim,
  });
  const liveId = newId('l1');
  store.insert({
    id: liveId,
    layer: 'l1',
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: contentHash('new'),
    sessionId: 's-new',
    turn: 2,
    cwd: 'D:\\work\\demo',
    summary: '新风格：先给结论再展开。',
    topics: [],
    intent: '新风格',
  });

  const profile = buildAProfile(store, null, 'project', project.key);
  assert.ok(profile);
  assert.ok(profile.workingStyle.includes('新风格'));
  assert.ok(!profile.workingStyle.includes('旧风格'), 'expired L1 intent must not reach the profile');
  assert.ok(!profile.evidenceIds.includes(expiredId));
  await fs.rm(dir, { recursive: true, force: true });
});

test('ProfileStore refuses a file name that escapes the storage dir', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-path-'));
  assert.throws(() => new ProfileStore(dir, '../evil.json'), /inside the storage dir/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('nonexistent cwds stay distinct (no accidental .git walk)', () => {
  const a = projectIdFor('D:\\work\\a');
  const b = projectIdFor('D:\\work\\b');
  assert.notEqual(a.key, b.key);
});

test('confidence authority: claim and top-level field match after extraction', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-conf-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const turn = {
    sessionId: 's-1',
    turn: 1,
    cwd: 'D:\\work\\demo',
    projectKey: project.key,
    projectLabel: project.label,
    userTexts: ['记住这条约定。'],
    assistantTexts: ['好。'],
    startedAt: Date.now(),
  };
  applyExtraction(store, config, turn, {
    l1: { summary: '约定。', topics: [], importance: 4 },
    l2: [{ text: '项目使用 pnpm。', kind: 'decision', scope: 'project', tags: [], confidence: 0.9 }],
    l3: [],
  });
  const record = store.list('l2')[0];
  assert.equal(record.confidence, record.claim.confidence);
  assert.equal(normalizeConfidence(record.confidence), record.confidence);
  setCalibration({ a: 1, b: -0.2, version: 'platt-test' });
  try {
    const claim = createClaimMeta('user_explicit', { confidence: 0.9 });
    assert.equal(claim.confidenceBasis.calibrationVersion, 'platt-test');
    assert.ok(claim.confidence < 0.9, 'non-identity calibration actually applies');
  } finally {
    setCalibration(IDENTITY_CALIBRATION);
    assert.equal(getCalibration().version, 'identity');
  }
  await fs.rm(dir, { recursive: true, force: true });
});

test('loader quarantines shallowly-invalid arrays and claim basis', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-shallow-'));
  const now = Date.now();
  const good = { id: 'l2_ok', layer: 'l2', scope: 'project', projectKey: 'p-aaaaaaaaaaaa', projectLabel: 'x', importance: 5, createdAt: now, updatedAt: now, hash: 'h', text: 'ok', kind: 'fact', tags: [], confidence: 0.5 };
  const bad = [
    { ...good, id: 'l2_badtag', tags: [123] },
    { ...good, id: 'l2_badbasis', claim: { confidence: 0.5, status: 'active', observedAt: now, recordedAt: now, confidenceBasis: {} } },
  ];
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify([good, ...bad]), 'utf8');
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  assert.equal(store.list('l2').length, 1);
  assert.equal(store.quarantine[0].count, 2);
  await fs.rm(dir, { recursive: true, force: true });
});

test('timeline reports truncation instead of silently cutting a long chain', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-long-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  let previous;
  for (let index = 0; index < 205; index += 1) {
    const claim = createClaimMeta('user_explicit', { confidence: 0.8 });
    claim.validFrom = now - (205 - index) * DAY;
    if (previous) claim.supersedes = [previous];
    const id = newId('l2');
    store.insert(
      l2Base(project, {
        id,
        text: `规则第 ${index} 版。`,
        kind: 'preference',
        tags: [],
        confidence: 0.8,
        claim,
      }),
    );
    if (previous) {
      const old = store.find(previous);
      store.update('l2', previous, { claim: { ...old.claim, status: 'superseded', validTo: now - (205 - index) * DAY } });
    }
    previous = id;
  }
  const timeline = buildTimeline(store, previous);
  assert.equal(timeline.truncated, true);
  assert.equal(timeline.entries.length, 200);
  await fs.rm(dir, { recursive: true, force: true });
});


test('doctor surfaces quarantined records', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-doctor-q-'));
  const now = Date.now();
  const good = { id: 'l2_doc_ok', layer: 'l2', scope: 'project', projectKey: 'p-aaaaaaaaaaaa', projectLabel: 'x', importance: 5, createdAt: now, updatedAt: now, hash: 'h', text: 'ok', kind: 'fact', tags: [], confidence: 0.5 };
  const bad = { ...good, id: 'l2_doc_bad', tags: [1] };
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify([good, bad]), 'utf8');
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const report = await runDoctor({ store, config });
  const check = report.checks.find((entry) => entry.id === 'schema:quarantine');
  assert.ok(check, 'doctor reports quarantine');
  assert.equal(check.level, 'warn');
  await fs.rm(dir, { recursive: true, force: true });
});
