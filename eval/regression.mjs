#!/usr/bin/env node
/**
 * Retrieval regression gate.
 *
 * Verifies the private dataset identity, runs the evaluator against the current
 * store, and fails (exit 1) when a metric drops more than the allowed margin
 * versus the recorded baseline. It never prints query text.
 *
 *   node eval/regression.mjs                       # identity only + run
 *   node eval/regression.mjs --require-store       # also require the frozen store snapshot
 *   node eval/regression.mjs --baseline eval/baseline-1.0.2.json --max-drop 0.05
 *   node eval/regression.mjs --skip-run            # hash checks only
 */
import { execFileSync } from 'node:child_process';
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
const baselinePath = arg('baseline', 'eval/baseline-1.0.2.json');
const storeDir = arg('store', path.join(process.env.DSH_HOME || '', 'holo-memory'));
const maxDrop = Number(arg('max-drop', '0.05'));
const requireStore = has('require-store');
const skipRun = has('skip-run');

const { storeSnapshotHash, compareMetrics } = await import('./regression-lib.mjs');
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const report = { ok: true, requireStore, maxDrop, checks: {} };
try {
  const manifest = readJson(manifestPath);
  const datasetSha = sha256(fs.readFileSync(datasetPath));
  report.checks.dataset = { expected: manifest.datasetSha256, actual: datasetSha, ok: datasetSha === manifest.datasetSha256 };
  const storeSha = storeSnapshotHash(storeDir);
  report.checks.store = { expected: manifest.storeSnapshotSha256, actual: storeSha, ok: storeSha === manifest.storeSnapshotSha256 };

  if (!skipRun) {
    const outFile = path.join('eval', 'runs', `regression-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    execFileSync(process.execPath, ['eval/run.mjs', '--data', storeDir, '--dataset', datasetPath, '--k', '5', '--live-config', path.join(process.env.DSH_HOME || '', 'profiles/desktop/cordis.patch.yml'), '--vector', '--neuron', '--active', '--out', outFile], {
      stdio: 'inherit',
    });
    const current = readJson(outFile);
    const baseline = readJson(baselinePath);
    const compared = compareMetrics(current.metrics, baseline.metrics, maxDrop);
    report.metrics = compared.metrics;
    if (!compared.ok) report.ok = false;
  }
} catch (error) {
  report.ok = false;
  report.error = error instanceof Error ? error.message : String(error);
}

const datasetOk = report.checks.dataset?.ok !== false;
const storeOk = report.checks.store?.ok !== false;
report.ok = report.ok && datasetOk && (!requireStore || storeOk);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
