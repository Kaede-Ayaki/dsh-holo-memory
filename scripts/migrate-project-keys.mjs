#!/usr/bin/env node
/**
 * Migrate projectKey from the 0.8 cwd hash to the 0.9 git-root hash.
 *
 *   node scripts/migrate-project-keys.mjs --data <store> [--apply]
 *
 * The only reliable source of the old cwd is L1.cwd. A mapping oldKey -> newKey
 * is derived from L1 records, then applied to every record sharing that key.
 * L2/L3 records without a matching L1 are reported as unmapped instead of being
 * guessed. Default is a dry run; --apply backs the layer files up first.
 */
import fs from 'node:fs';
import path from 'node:path';

const { projectIdFor } = await import('../lib/store.js');

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

const layers = ['l1', 'l2', 'l3'];
const loaded = {};
for (const layer of layers) {
  const file = path.join(dataDir, `${layer}.json`);
  loaded[layer] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

const mapping = new Map(); // oldKey -> { newKey, label, sourceCwds:Set, conflicted:boolean }
const conflicts = [];
const keysFromL1 = new Set();
for (const record of loaded.l1) {
  if (!record || typeof record.cwd !== 'string' || record.cwd.trim().length === 0) continue;
  const oldKey = record.projectKey;
  if (typeof oldKey !== 'string' || oldKey.length === 0) continue;
  keysFromL1.add(oldKey);
  const next = projectIdFor(record.cwd);
  if (next.key === oldKey) continue;
  const existing = mapping.get(oldKey);
  if (!existing) {
    mapping.set(oldKey, { newKey: next.key, label: next.label, sourceCwds: new Set([record.cwd]), conflicted: false });
    continue;
  }
  existing.sourceCwds.add(record.cwd);
  if (existing.newKey !== next.key) {
    existing.conflicted = true;
    conflicts.push({ oldKey, first: existing.newKey, second: next.key });
  }
}

// Keys that exist but have no L1 cwd evidence cannot be migrated safely.
// Compute this BEFORE rewriting any record, while old keys are still present.
const unmapped = new Map();
for (const layer of layers) {
  for (const record of loaded[layer]) {
    if (!record || typeof record.projectKey !== 'string' || record.projectKey.length === 0) continue;
    if (record.scope === 'user') continue;
    if (keysFromL1.has(record.projectKey)) continue;
    unmapped.set(record.projectKey, (unmapped.get(record.projectKey) ?? 0) + 1);
  }
}

const perLayer = {};
let changed = 0;
const skippedConflicts = [];
for (const layer of layers) {
  perLayer[layer] = { records: loaded[layer].length, changed: 0 };
  for (const record of loaded[layer]) {
    if (!record || typeof record.projectKey !== 'string') continue;
    const entry = mapping.get(record.projectKey);
    if (!entry) continue;
    if (entry.conflicted) {
      if (!skippedConflicts.includes(record.projectKey)) skippedConflicts.push(record.projectKey);
      continue;
    }
    record.projectKey = entry.newKey;
    if (entry.label) record.projectLabel = entry.label;
    changed += 1;
    perLayer[layer].changed += 1;
  }
}

const report = {
  dryRun: !apply,
  mappings: [...mapping.entries()].map(([oldKey, entry]) => ({
    oldKey,
    newKey: entry.newKey,
    label: entry.label,
    cwds: [...entry.sourceCwds],
    conflicted: entry.conflicted,
  })),
  conflicts,
  skippedConflicts,
  unmapped: [...unmapped.entries()].map(([projectKey, records]) => ({ projectKey, records })),
  perLayer,
  changed,
};

if (!apply) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join(dataDir, 'backups', `pre-project-keys-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });
for (const layer of layers) fs.copyFileSync(path.join(dataDir, `${layer}.json`), path.join(backupDir, `${layer}.json`));
for (const layer of layers) {
  const file = path.join(dataDir, `${layer}.json`);
  if (!fs.existsSync(file)) continue;
  const tmp = `${file}.keys-${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(loaded[layer]), 'utf8');
  fs.renameSync(tmp, file);
}
fs.writeFileSync(path.join(dataDir, 'project-keys-migration.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
report.backup = backupDir;
console.log(JSON.stringify(report, null, 2));
