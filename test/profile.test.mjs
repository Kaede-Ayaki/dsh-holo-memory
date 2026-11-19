import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { ProfileStore, buildAProfile, renderAProfile } from '../lib/profile.js';

async function seed(dir) {
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const now = Date.now();
  const l2 = {
    id: newId('l2'),
    layer: 'l2',
    scope: 'user',
    projectKey: '',
    projectLabel: '',
    importance: 9,
    createdAt: now,
    updatedAt: now,
    hash: 'h',
    text: '用户偏好：先给结论，再给细节；中文回答，不要寒暄。',
    kind: 'preference',
    tags: ['偏好'],
    confidence: 0.9,
  };
  const l3 = {
    id: newId('l3'),
    layer: 'l3',
    scope: 'user',
    projectKey: '',
    projectLabel: '',
    importance: 9,
    createdAt: now,
    updatedAt: now,
    hash: 'h2',
    title: '用户行为准则',
    hologram: '用户重视直接、可验证的结果，讨厌空泛铺陈；重大操作要求先确认。',
    themes: ['偏好'],
    entities: [],
    openLoops: [],
    sourceSessions: [],
  };
  store.insert(l2);
  store.insert(l3);
  return store;
}

test('A-series distills preferences, habits and personality from L1-L3', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-a-'));
  const store = await seed(dir);
  const profileStore = new ProfileStore(dir);
  const profile = await profileStore.refresh(store);
  assert.ok(profile);
  assert.match(profile.preferences.join(' '), /先给结论/);
  assert.ok(profile.personality.some((item) => /直接|可验证/.test(item)));
  assert.ok(profile.evidenceIds.some((id) => id.startsWith('l2_')));
  const text = renderAProfile(profile, 1200);
  assert.match(text, /偏好偏向/);
  assert.match(text, /行为习惯/);
  assert.match(text, /重要/);
  assert.match(text, /询问/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('A-series render has an explicit high-stakes confirmation boundary', () => {
  const profile = {
    id: 'a_user_profile', title: 'A', summary: 'x', preferences: ['先给结论'], habits: [], personality: [],
    workingStyle: [], confirmFor: ['公开发布'], autoApply: true, evidenceIds: [], importance: 9,
    createdAt: 1, updatedAt: 1, revision: 1,
  };
  const text = renderAProfile(profile, 2000);
  assert.match(text, /低风险/);
  assert.match(text, /不可逆/);
  assert.match(text, /必须先询问用户/);
});

test('empty memory yields no invented A profile', () => {
  const dir = path.join(os.tmpdir(), 'holo-a-empty-' + Date.now());
  const store = new HoloStore(dir, normalizeConfig({}));
  assert.equal(buildAProfile(store, null), null);
});
