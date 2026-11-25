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

const mapping = new Map();
const conflicts = [];
const keysFromL1 = new Set();
for (const record of loaded.l1) {
  if (!record || typeof record.cwd !== 'string' || record.cwd.trim().length === 0) continue;
  const oldKey = record.projectKey;
  if (typeof oldKey !== 'string' || oldKey.length === 0) continue;
  keysFromL1.add(oldKey);
  const next = projectIdFor(record.cwd);
  if (next.key === oldKey) continue;
  if (mapping.has(oldKey) && mapping.get(oldKey) !== next.key) {
    conflicts.push({ oldKey, first: mapping.get(oldKey), second: next.key });
    continue;
  }
  mapping.set(oldKey, next.key);
  mapping.set(`${oldKey}:label`, next.label);
}

const perLayer = {};
let changed = 0;
for (const layer of layers) {
  perLayer[layer] = { records: loaded[layer].length, changed: 0 };
  for (const record of loaded[layer]) {
    if (!record || typeof record.projectKey !== 'string') continue;
    const nextKey = mapping.get(record.projectKey);
    if (!nextKey) continue;
    record.projectKey = nextKey;
    const label = mapping.get(`${nextKey}:label`);
    if (label) record.projectLabel = label;
    changed += 1;
    perLayer[layer].changed += 1;
  }
}

// Keys that exist but have no L1 cwd evidence cannot be migrated safely.
const unmapped = new Map();
for (const layer of layers) {
  for (const record of loaded[layer]) {
    if (!record || typeof record.projectKey !== 'string' || record.projectKey.length === 0) continue;
    if (mapping.has(record.projectKey)) continue;
    if (record.scope === 'user') continue;
    // Keys that have L1 cwd evidence were already resolved (mapped or current);
    // only keys without any recoverable cwd are genuinely unmapped.
    if (keysFromL1.has(record.projectKey)) continue;
    unmapped.set(record.projectKey, (unmapped.get(record.projectKey) ?? 0) + 1);
  }
}

const report = {
  dryRun: !apply,
  mappings: [...mapping.entries()].filter(([key]) => !key.endsWith(':label')),
  conflicts,
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
