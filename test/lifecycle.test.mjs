import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { EmbeddingClient } from '../lib/embeddings.js';
import { recall, recentFallback } from '../lib/retrieval.js';
import { buildAProfile } from '../lib/profile.js';
import { buildTimeline } from '../lib/timeline.js';
import { applyExtraction } from '../lib/extract.js';
import { registerTools } from '../lib/tools.js';
import { ProfileStore } from '../lib/profile.js';
import { createClaimMeta } from '../lib/confidence.js';

const DAY = 86_400_000;

function baseRecord(layer, project, extra) {
  const now = Date.now();
  return {
    layer,
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance: 8,
    createdAt: now,
    updatedAt: now,
    hash: contentHash(String(extra.id)),
    revision: 1,
    ...extra,
  };
}

test('short-input fallback obeys claim validity and returns injected ids', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-fallback-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();

  const activeClaim = createClaimMeta('user_explicit', { confidence: 0.95 });
  activeClaim.validFrom = now - DAY;
  store.insert(
    baseRecord('l3', project, {
      id: newId('l3'),
      title: '当前有效胶囊',
      hologram: '当前有效胶囊：测试用 pnpm。',
      themes: [],
      entities: [],
      openLoops: [],
      sourceSessions: [],
      claim: activeClaim,
    }),
  );

  const expiredClaim = createClaimMeta('user_explicit', { confidence: 0.95 });
  expiredClaim.validFrom = now - 10 * DAY;
  expiredClaim.validTo = now - DAY;
  store.insert(
    baseRecord('l3', project, {
      id: newId('l3'),
      title: '过期胶囊',
      hologram: '过期胶囊：旧的测试约定。',
      themes: [],
      entities: [],
      openLoops: [],
      sourceSessions: [],
      claim: expiredClaim,
    }),
  );

  const futureClaim = createClaimMeta('user_explicit', { confidence: 0.95 });
  futureClaim.validFrom = now + DAY;
  store.insert(
    baseRecord('l3', project, {
      id: newId('l3'),
      title: '未来胶囊',
      hologram: '未来胶囊：明天才生效的约定。',
      themes: [],
      entities: [],
      openLoops: [],
      sourceSessions: [],
      claim: futureClaim,
    }),
  );

  const result = await recentFallback(store, project.key, 2000);
  assert.ok(result);
  assert.match(result.text, /当前有效/);
  assert.doesNotMatch(result.text, /过期胶囊/);
  assert.doesNotMatch(result.text, /未来胶囊/);
  assert.ok(result.items.length >= 1);
  for (const item of result.items) assert.ok(item.record.id);
  await fs.rm(dir, { recursive: true, force: true });
});

test('profile drops superseded evidence and deletes an empty snapshot', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-profile-live-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');

  const record = {
    id: newId('l2'),
    layer: 'l2',
    scope: 'user',
    projectKey: '',
    projectLabel: 'global',
    importance: 9,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    hash: contentHash('pref'),
    text: '偏好：交付先给结论再给证据。',
    kind: 'preference',
    tags: ['style'],
    confidence: 0.95,
    revision: 1,
    claim: createClaimMeta('user_explicit', { confidence: 0.95 }),
  };
  store.insert(record);

  const profileStore = new ProfileStore(dir);
  const built = await profileStore.refresh(store, 'user');
  assert.ok(built, 'live evidence produces a profile');
  assert.ok(built.preferences.length > 0);
  assert.ok(await fs.stat(path.join(dir, 'a.json')).then(() => true).catch(() => false));

  store.update('l2', record.id, {
    claim: { ...record.claim, status: 'superseded', validTo: Date.now() },
  });
  const after = await profileStore.refresh(store, 'user');
  assert.equal(after, null, 'no live evidence means no profile');
  assert.equal(buildAProfile(store, null, 'user'), null);
  assert.equal(await fs.stat(path.join(dir, 'a.json')).then(() => true).catch(() => false), false, 'stale profile file removed');
  await fs.rm(dir, { recursive: true, force: true });
});

test('timeline includes every parent when one claim replaces several', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-multi-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();

  const parents = [];
  for (const [index, text] of ['规则 A：每周一次。', '规则 B：每天一次。'].entries()) {
    const claim = createClaimMeta('user_explicit', { confidence: 0.9 });
    claim.validFrom = now - (index + 5) * DAY;
    claim.validTo = now - DAY;
    claim.status = 'superseded';
    const id = newId('l2');
    parents.push(id);
    store.insert(
      baseRecord('l2', project, {
        id,
        text,
        kind: 'preference',
        tags: [],
        confidence: 0.9,
        claim,
      }),
    );
  }

  const merged = createClaimMeta('user_explicit', { confidence: 0.95 });
  merged.validFrom = now - DAY;
  merged.supersedes = parents;
  const mergedId = newId('l2');
  store.insert(
    baseRecord('l2', project, {
      id: mergedId,
      text: '合并规则：按任务大小选择频率。',
      kind: 'preference',
      tags: [],
      confidence: 0.95,
      claim: merged,
    }),
  );
  for (const parentId of parents) {
    const parent = store.find(parentId);
    store.update('l2', parentId, { claim: { ...parent.claim, supersededBy: mergedId }, supersededBy: mergedId });
  }

  const timeline = buildTimeline(store, mergedId);
  assert.equal(timeline.entries.length, 3);
  const texts = timeline.entries.map((entry) => entry.text);
  assert.ok(texts.some((text) => text.includes('规则 A')));
  assert.ok(texts.some((text) => text.includes('规则 B')));
  assert.ok(timeline.entries.every((entry) => entry.timeBasis !== undefined));
  await fs.rm(dir, { recursive: true, force: true });
});

test('explicit supersedes is not swallowed by near-duplicate merging', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-sup-'));
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
    userTexts: ['以后过滤器改成每三周清洗。'],
    assistantTexts: ['好。'],
    startedAt: Date.now(),
  };

  applyExtraction(store, config, turn, {
    l1: { summary: '规定过滤器每周清洗。', topics: ['filter'], importance: 5 },
    l2: [{ text: '过滤器清洗周期为每周一次。', kind: 'preference', scope: 'project', tags: ['filter'], confidence: 0.9 }],
    l3: [],
  });
  const original = store.list('l2').find((record) => record.text.includes('每周一次'));
  assert.ok(original);

  applyExtraction(store, config, turn, {
    l1: { summary: '过滤器改为每三周。', topics: ['filter'], importance: 5 },
    l2: [
      {
        text: '过滤器清洗周期为每周一次，自本周起改为每三周一次。',
        kind: 'preference',
        scope: 'project',
        tags: ['filter'],
        confidence: 0.9,
        supersedes: [original.id],
      },
    ],
    l3: [],
  });

  const records = store.list('l2');
  assert.equal(records.length, 2, 'a declared supersede must create a new claim, not revise in place');
  const oldRecord = store.find(original.id);
  assert.equal(oldRecord.claim.status, 'superseded');
  const next = records.find((record) => record.id !== original.id);
  assert.ok(next.claim.supersedes.includes(original.id));
  await fs.rm(dir, { recursive: true, force: true });
});

test('recall still returns nothing for expired claims at the current time', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-expired-'));
  const config = normalizeConfig({ activeWindowEnabled: false });
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const claim = createClaimMeta('user_explicit', { confidence: 0.9 });
  claim.validFrom = now - 10 * DAY;
  claim.validTo = now - DAY;
  store.insert(
    baseRecord('l2', project, {
      id: newId('l2'),
      text: '水族箱过滤器清洗周期。',
      kind: 'preference',
      tags: [],
      confidence: 0.9,
      claim,
    }),
  );
  const embedder = new EmbeddingClient(config);
  const result = await recall(store, embedder, config, '水族箱过滤器 清洗 周期', {
    projectKey: project.key,
    maxChars: 2000,
    minScore: 0.05,
    counts: { l1: 0, l2: 5, l3: 0 },
  });
  assert.equal(result, null);
  await fs.rm(dir, { recursive: true, force: true });
});


test('memory_supersede rejects a missing target and cross-project links', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-supersede-'));
  const config = normalizeConfig({});
  const store = new HoloStore(dir, config);
  await store.whenReady();
  const projectA = projectIdFor('D:\\work\\a');
  const projectB = projectIdFor('D:\\work\\b');
  const make = (project, text) => {
    const claim = createClaimMeta('user_explicit', { confidence: 0.9 });
    const id = newId('l2');
    store.insert(
      baseRecord('l2', project, {
        id,
        text,
        kind: 'preference',
        tags: [],
        confidence: 0.9,
        claim,
      }),
    );
    return id;
  };
  const oldId = make(projectA, '旧约定：每天跑一次。');
  const otherProjectId = make(projectB, '另一个项目的约定。');

  const tools = [];
  registerTools(
    { tools: { register(tool) { tools.push(tool); } } },
    { store, embedder: new EmbeddingClient(config), config, profileStore: new ProfileStore(dir) },
  );
  const tool = tools.find((entry) => entry.name === 'memory_supersede');
  assert.ok(tool, 'memory_supersede registered');

  const before = store.find(oldId).claim.status;
  const missing = await tool.execute({ oldId, newId: 'ffffffff' }, {});
  assert.match(missing, /Not found/);
  assert.equal(store.find(oldId).claim.status, before, 'invalid target must not change the old claim');

  const crossProject = await tool.execute({ oldId, newId: otherProjectId }, {});
  assert.match(crossProject, /project mismatch|different projects/);
  assert.equal(store.find(oldId).claim.status, before);

  const closed = await tool.execute({ oldId, reason: 'retired without replacement' }, {});
  assert.match(closed, /Superseded/);
  assert.equal(store.find(oldId).claim.status, 'superseded');
  await fs.rm(dir, { recursive: true, force: true });
});


test('project identity resolves to the git root for nested working directories', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-root-'));
  await fs.mkdir(path.join(root, '.git'));
  await fs.mkdir(path.join(root, 'packages', 'app'), { recursive: true });
  const other = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-other-'));
  await fs.mkdir(path.join(other, '.git'));

  const fromRoot = projectIdFor(root);
  const fromNested = projectIdFor(path.join(root, 'packages', 'app'));
  const fromOther = projectIdFor(other);
  assert.equal(fromNested.key, fromRoot.key, 'subdirectory shares the repository identity');
  assert.notEqual(fromOther.key, fromRoot.key, 'different repositories stay isolated');
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(other, { recursive: true, force: true });
});


test('loader quarantines malformed records instead of crashing', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-quarantine-'));
  const now = Date.now();
  const valid = {
    id: 'l2_valid01',
    layer: 'l2',
    scope: 'project',
    projectKey: 'p-x',
    projectLabel: 'x',
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: 'h',
    text: '合法记录。',
    kind: 'fact',
    tags: [],
    confidence: 0.5,
  };
  const bad = [
    { ...valid, id: 'l2_bad01', text: undefined },
    { ...valid, id: 'l2_bad02', tags: 'not-array' },
    { ...valid, id: 'l2_bad03', claim: { confidence: 2, status: 'active', confidenceBasis: {} } },
    { ...valid, id: 'l2_valid01' },
  ];
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify([valid, ...bad]), 'utf8');
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  assert.equal(store.list('l2').length, 1);
  assert.equal(store.quarantine.length, 1);
  assert.equal(store.quarantine[0].count, 4);
  assert.ok(await fs.stat(store.quarantine[0].file).then(() => true).catch(() => false));
  await fs.rm(dir, { recursive: true, force: true });
});
