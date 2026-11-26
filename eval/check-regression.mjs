#!/usr/bin/env node
/**
 * Verify that a local (private) regression dataset and optional frozen store
 * snapshot match the hashes recorded in eval/regression-manifest.json and a
 * committed baseline.
 *
 *   node eval/check-regression.mjs                     # dataset identity only
 *   node eval/check-regression.mjs --require-store     # also require the frozen snapshot
 *
 * The human query set is intentionally not committed (it contains real user
 * text); its SHA-256 is the stable identity that makes results reproducible for
 * anyone who has the private artifact.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const datasetPath = arg('dataset', 'eval/dataset-human.jsonl');
const manifestPath = arg('manifest', 'eval/regression-manifest.json');
const storeDir = arg('store', path.join(process.env.DSH_HOME || '', 'holo-memory'));
const baselinePath = arg('baseline', 'eval/baseline-1.0.2.json');
const requireStore = has('require-store');

const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

function storeSnapshotHash(dir) {
  const layers = ['l1', 'l2', 'l3'].map((layer) => {
    const file = path.join(dir, `${layer}.json`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  });
  return sha256(layers.join('\n'));
}

const result = { ok: true, requireStore, checks: {} };
try {
  const manifest = readJson(manifestPath);
  const datasetSha = sha256(fs.readFileSync(datasetPath));
  result.checks.dataset = { expected: manifest.datasetSha256, actual: datasetSha, ok: datasetSha === manifest.datasetSha256 };

  const liveStoreSha = storeSnapshotHash(storeDir);
  result.checks.store = {
    expected: manifest.storeSnapshotSha256,
    actual: liveStoreSha,
    ok: liveStoreSha === manifest.storeSnapshotSha256,
    note: 'live store drifts as sessions write; run --require-store only against a frozen snapshot',
  };

  if (fs.existsSync(baselinePath)) {
    const recorded = readJson(baselinePath).metrics?.reproducibility ?? {};
    result.checks.baselineDataset = {
      expected: recorded.datasetSha256,
      actual: datasetSha,
      ok: recorded.datasetSha256 === datasetSha,
    };
    result.checks.baselineStore = {
      expected: recorded.storeSha256,
      actual: liveStoreSha,
      ok: recorded.storeSha256 === liveStoreSha,
    };
  }
} catch (error) {
  result.ok = false;
  result.error = error instanceof Error ? error.message : String(error);
}

const datasetOk = result.checks.dataset?.ok !== false && result.checks.baselineDataset?.ok !== false;
const storeOk = result.checks.store?.ok !== false && result.checks.baselineStore?.ok !== false;
result.ok = result.ok && datasetOk && (requireStore ? storeOk : true);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
