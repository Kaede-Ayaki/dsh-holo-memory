#!/usr/bin/env node
/**
 * Phase 1.3 — migrate records to schema 0.8 (claim metadata).
 *
 *   node scripts/migrate-0.8.mjs --data <store> [--apply] [--backup]
 *
 * Default is a read-only dry run: it prints what would change and writes
 * nothing. --apply first copies the three layer files into
 * <store>/backups/pre-migrate-0.8-<ts>/, then writes atomically.
 *
 * Migration rules (agreed in session-2b00c63f):
 *   - L2 keeps its numeric confidence, normalized to three decimals;
 *   - L1 / L3 get the migration default 0.500;
 *   - provenance is marked `migration_unknown`; nothing pretends to be verified;
 *   - observedAt / recordedAt map from createdAt / updatedAt;
 *   - supersededBy => status 'superseded', otherwise 'active';
 *   - running twice changes nothing (idempotent).
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const dataDir = arg('data');
const apply = has('apply');
const doBackup = has('backup') || apply;

if (!dataDir || !fs.existsSync(dataDir)) {
  console.error('missing --data <holo-memory dir>');
  process.exit(2);
}

const SCHEMA_VERSION = '0.8.0';
const LAYERS = ['l1', 'l2', 'l3'];

const { normalizeConfidence, createConfidenceBasis } = await import('../lib/confidence.js');

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

function migrateRecord(record) {
  const layer = record.layer;
  const createdAt = Number.isFinite(record.createdAt) ? record.createdAt : Date.now();
  const updatedAt = Number.isFinite(record.updatedAt) ? record.updatedAt : createdAt;
  const existing = record.claim;

  const sourceConfidence = layer === 'l2' && typeof record.confidence === 'number' ? record.confidence : 0.5;
  const confidence = normalizeConfidence(existing?.confidence ?? sourceConfidence, 0.5);

  if (existing) {
    const basis = existing.confidenceBasis ?? createConfidenceBasis('migration_unknown');
    return {
      ...record,
      confidence: layer === 'l2' ? normalizeConfidence(record.confidence ?? confidence, confidence) : record.confidence,
      claim: {
        ...existing,
        confidence,
        confidenceBasis: {
          ...basis,
          extractionQuality: normalizeConfidence(basis.extractionQuality ?? 0.5, 0.5),
          corroboration: Number.isFinite(basis.corroboration) ? Math.max(0, Math.floor(basis.corroboration)) : 0,
          contradiction: Number.isFinite(basis.contradiction) ? Math.max(0, Math.floor(basis.contradiction)) : 0,
          verified: Boolean(basis.verified),
        },
        observedAt: Number.isFinite(existing.observedAt) ? existing.observedAt : createdAt,
        recordedAt: Number.isFinite(existing.recordedAt) ? existing.recordedAt : updatedAt,
        status: existing.status ?? (record.supersededBy ? 'superseded' : 'active'),
      },
    };
  }

  return {
    ...record,
    confidence: layer === 'l2' ? confidence : record.confidence,
    claim: {
      confidence,
      confidenceBasis: {
        ...createConfidenceBasis('migration_unknown', { extractionQuality: 0.5 }),
        calibrationVersion: 'migration-v1',
      },
      observedAt: createdAt,
      recordedAt: updatedAt,
      status: record.supersededBy ? 'superseded' : 'active',
      ...(record.supersededBy ? { supersededBy: record.supersededBy } : {}),
    },
  };
}

function summarize(layer, records, migrated) {
  const changed = records.reduce((count, record, index) => {
    const before = JSON.stringify(record);
    const after = JSON.stringify(migrated[index]);
    return count + (before === after ? 0 : 1);
  }, 0);
  const withClaimBefore = records.filter((r) => r.claim).length;
  const withClaimAfter = migrated.filter((r) => r.claim).length;
  return { layer, records: records.length, changed, withClaimBefore, withClaimAfter };
}

const report = { schemaVersion: SCHEMA_VERSION, dryRun: !apply, layers: [] };
const pending = [];

for (const layer of LAYERS) {
  const file = path.join(dataDir, `${layer}.json`);
  if (!fs.existsSync(file)) {
    report.layers.push({ layer, records: 0, changed: 0, withClaimBefore: 0, withClaimAfter: 0, missing: true });
    continue;
  }
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  const migrated = records.map(migrateRecord);
  report.layers.push(summarize(layer, records, migrated));
  pending.push({ layer, file, records, migrated });
}

if (!apply) {
  const samples = pending.flatMap(({ layer, records, migrated }) =>
    records.slice(0, 2).map((record, index) => ({
      layer,
      id: record.id,
      confidenceBefore: record.confidence ?? null,
      confidenceAfter: migrated[index].claim.confidence,
      status: migrated[index].claim.status,
      source: migrated[index].claim.confidenceBasis.sourceType,
    })),
  );
  report.samples = samples;
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join(dataDir, 'backups', `pre-migrate-0.8-${stamp}`);
if (doBackup) {
  fs.mkdirSync(backupDir, { recursive: true });
  for (const { file } of pending) {
    fs.copyFileSync(file, path.join(backupDir, path.basename(file)));
  }
  report.backup = backupDir;
}

for (const { file, migrated } of pending) {
  const tmp = `${file}.migrate-${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(migrated), 'utf8');
  fs.renameSync(tmp, file);
}

fs.writeFileSync(
  path.join(dataDir, 'schema.json'),
  JSON.stringify({ schemaVersion: SCHEMA_VERSION, migratedAt: Date.now(), stamp }, null, 2) + '\n',
  'utf8',
);

// verify idempotency and legality
const verify = [];
for (const layer of LAYERS) {
  const file = path.join(dataDir, `${layer}.json`);
  if (!fs.existsSync(file)) continue;
  const records = JSON.parse(fs.readFileSync(file, 'utf8'));
  const illegal = records.filter((r) => !r.claim || !Number.isFinite(r.claim.confidence) || r.claim.confidence < 0 || r.claim.confidence > 1);
  const drifted = records.filter((r) => round3(r.claim?.confidence ?? -1) !== r.claim?.confidence);
  verify.push({ layer, records: records.length, illegal: illegal.length, drifted: drifted.length });
}
report.verify = verify;
console.log(JSON.stringify(report, null, 2));
