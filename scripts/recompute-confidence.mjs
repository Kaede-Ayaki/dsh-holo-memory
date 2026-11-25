#!/usr/bin/env node
/**
 * Recompute stored confidence from the evidence source instead of the model's
 * self-report (0.9.0).
 *
 * Older records carry `migration_unknown` or a model-invented 0.7/0.9. This
 * script resets every claim to its source prior:
 *   user_explicit 0.950 · user_correction 0.990 · multi_turn 0.800
 *   model_inference 0.550 · imported 0.600 · migration_unknown 0.500
 *
 *   node scripts/recompute-confidence.mjs --data <store> [--apply]
 *
 * Default is a dry run. --apply backs the three layer files up, then writes.
 */
import fs from 'node:fs';
import path from 'node:path';

const { initialConfidence, normalizeConfidence } = await import('../lib/confidence.js');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const dataDir = arg('data');
const apply = has('apply');
if (!dataDir || !fs.existsSync(dataDir)) {
  console.error('missing --data <holo-memory dir>');
  process.exit(2);
}

const HISTORY_REASON = 'recompute-source-prior';
const report = { dryRun: !apply, layers: {}, changed: 0, bySource: {} };

function recompute(record) {
  const claim = record.claim;
  if (!claim) return record;
  const sourceType = claim.confidenceBasis?.sourceType ?? 'migration_unknown';
  const next = normalizeConfidence(initialConfidence(sourceType));
  report.bySource[sourceType] = (report.bySource[sourceType] ?? 0) + 1;
  if (normalizeConfidence(claim.confidence) === next) return record;
  report.changed += 1;
  const history = [
    ...(claim.confidenceHistory ?? []),
    { at: Date.now(), confidence: claim.confidence, reason: HISTORY_REASON },
  ].slice(-10);
  return {
    ...record,
    confidence: next,
    claim: { ...claim, confidence: next, confidenceHistory: history },
  };
}

const pending = [];
for (const layer of ['l1', 'l2', 'l3']) {
  const file = path.join(dataDir, `${layer}.json`);
  if (!fs.existsSync(file)) continue;
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  const next = records.map(recompute);
  report.layers[layer] = { records: records.length };
  pending.push({ file, records, next });
}

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join(dataDir, 'backups', `pre-recompute-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const { file } of pending) fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
report.backup = backupDir;

for (const { file, next } of pending) {
  const tmp = `${file}.recompute-${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(next), 'utf8');
  fs.renameSync(tmp, file);
}

// verify: every claim uses a known prior
let illegal = 0;
for (const { next } of pending) {
  for (const record of next) {
    const claim = record.claim;
    if (!claim) continue;
    const expected = normalizeConfidence(initialConfidence(claim.confidenceBasis?.sourceType ?? 'migration_unknown'));
    if (claim.confidence !== expected) illegal += 1;
  }
}
report.illegal = illegal;
console.log(JSON.stringify(report, null, 2));
