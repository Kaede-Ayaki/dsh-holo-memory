import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoloStore, contentHash, newId, projectIdFor } from '../lib/store.js';
import { normalizeConfig } from '../lib/config.js';
import { createClaimMeta, withConfidence } from '../lib/confidence.js';
import { setCalibration, IDENTITY_CALIBRATION } from '../lib/calibration.js';
import { shouldRefreshProfiles } from '../lib/refresh.js';
import { validateSupersedeTargets } from '../lib/relations.js';
import { compareMetrics } from '../eval/regression-lib.mjs';

const DAY = 86_400_000;

function record(project, extra) {
  const now = Date.now();
  return {
    layer: 'l2',
    scope: 'project',
    projectKey: project.key,
    projectLabel: project.label,
    importance: 6,
    createdAt: now,
    updatedAt: now,
    hash: contentHash(String(extra.id)),
    revision: 1,
    ...extra,
  };
}

test('user correction updates sourceType and calibration version even if the number is unchanged', () => {
  setCalibration(IDENTITY_CALIBRATION);
  const claim = createClaimMeta('model_inference', { confidence: 0.55 });
  const corrected = withConfidence(claim, 0.55, 'user_correction', Date.now(), { sourceType: 'user_correction' });
  assert.equal(corrected.confidenceBasis.sourceType, 'user_correction');
  assert.equal(corrected.confidenceBasis.calibrationVersion, 'identity');
  assert.equal(corrected.confidence, claim.confidence, 'same value, metadata still updated');
});

test('profile refresh policy separates extraction from invalidation', () => {
  const base = normalizeConfig({ aSeriesEnabled: true, aSeriesRefreshOnExtract: false });
  assert.equal(shouldRefreshProfiles(false, base, true), false);
  assert.equal(shouldRefreshProfiles(true, base, true), true, 'forget/supersede still refreshes');
  assert.equal(shouldRefreshProfiles(true, { ...base, aSeriesEnabled: false }, true), false);
  assert.equal(shouldRefreshProfiles(true, base, false), false);
  assert.equal(shouldRefreshProfiles(false, { ...base, aSeriesRefreshOnExtract: true }, true), true);
});

test('supersede validation fails closed when ancestry walking is truncated', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-chain-'));
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  const project = projectIdFor('D:\\work\\chain');
  let previous;
  let first;
  for (let index = 0; index < 105; index += 1) {
    const claim = createClaimMeta('user_explicit', { confidence: 0.8 });
    if (previous) claim.supersedes = [previous];
    const id = newId('l2');
    if (!first) first = id;
    store.insert(record(project, { id, text: `链 ${index}`, kind: 'preference', tags: [], confidence: 0.8, claim }));
    previous = id;
  }
  const check = validateSupersedeTargets(
    store,
    { id: first, layer: 'l2', scope: 'project', projectKey: project.key },
    [previous],
  );
  assert.equal(check.ok, false);
  assert.match(check.errors.join(';'), /ancestry check incomplete/);
  await fs.rm(dir, { recursive: true, force: true });
});

test('regression comparison fails on a metric drop beyond the margin', () => {
  const baseline = { query: { recallAtK: 0.8, hitRate: 0.9, quietRate: 0.7, ndcgAtK: 0.8 }, finalInjected: { expectedCoverage: 0.85 } };
  const within = { query: { recallAtK: 0.78, hitRate: 0.88, quietRate: 0.68, ndcgAtK: 0.78 }, finalInjected: { expectedCoverage: 0.83 } };
  assert.equal(compareMetrics(within, baseline, 0.05).ok, true);
  const dropped = { query: { recallAtK: 0.6, hitRate: 0.9, quietRate: 0.7, ndcgAtK: 0.8 }, finalInjected: { expectedCoverage: 0.85 } };
  const result = compareMetrics(dropped, baseline, 0.05);
  assert.equal(result.ok, false);
  assert.equal(result.metrics['query.recallAtK'].ok, false);
});

test('loader quarantines invalid projectKey and malformed claim history fields', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-schema2-'));
  const now = Date.now();
  const good = {
    id: 'l2_schema_ok',
    layer: 'l2',
    scope: 'project',
    projectKey: 'p-aaaaaaaaaaaa',
    projectLabel: 'x',
    importance: 5,
    createdAt: now,
    updatedAt: now,
    hash: 'h',
    text: 'ok',
    kind: 'fact',
    tags: [],
    confidence: 0.5,
  };
  const bad = [
    { ...good, id: 'l2_badkey', projectKey: '../escape' },
    {
      ...good,
      id: 'l2_badbasis2',
      claim: {
        confidence: 0.5,
        status: 'active',
        observedAt: now,
        recordedAt: now,
        supersededBy: 42,
        confidenceHistory: [{ at: now, confidence: 0.5 }],
        confidenceBasis: {
          sourceType: 'user_explicit',
          calibrationVersion: 'identity',
          extractionQuality: 0.5,
          corroboration: 1.5,
          contradiction: 0,
          verified: false,
        },
      },
    },
  ];
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify([good, ...bad]), 'utf8');
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  assert.equal(store.list('l2').length, 1);
  assert.equal(store.quarantine[0].count, 2);
  await fs.rm(dir, { recursive: true, force: true });
});

test('migration-related claim metadata survives a correction round trip', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-claim-'));
  const store = new HoloStore(dir, normalizeConfig({}));
  await store.whenReady();
  const project = projectIdFor('D:\\work\\demo');
  const claim = createClaimMeta('model_inference', { confidence: 0.55 });
  store.insert(record(project, { id: newId('l2'), text: '旧说法。', kind: 'fact', tags: [], confidence: 0.55, claim }));
  const stored = store.list('l2')[0];
  const updated = withConfidence(stored.claim, 0.99, 'user_correction', Date.now(), { sourceType: 'user_correction' });
  store.update('l2', stored.id, { claim: updated, confidence: updated.confidence });
  const reopened = store.find(stored.id);
  assert.equal(reopened.claim.confidenceBasis.sourceType, 'user_correction');
  assert.equal(reopened.confidence, reopened.claim.confidence);
  await fs.rm(dir, { recursive: true, force: true });
});
