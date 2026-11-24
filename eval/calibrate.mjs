#!/usr/bin/env node
/**
 * Fit Platt calibration from eval/truth.jsonl and write <store>/calibration.json.
 *
 *   node eval/calibrate.mjs [--truth eval/truth.jsonl] [--store .dsh/holo-memory] [--dry-run]
 *
 * Prints before/after Brier + ECE and a reliability curve. Without --dry-run the
 * fitted parameters are written so the plugin picks them up on next start.
 */
import fs from 'node:fs';
import path from 'node:path';

const { fitPlatt, brierScore, expectedCalibrationError, reliabilityCurve, IDENTITY_CALIBRATION } = await import(
  '../lib/calibration.js'
);

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const truthPath = arg('truth', 'eval/truth.jsonl');
const store = arg('store', path.join(process.env.DSH_HOME || '', 'holo-memory'));
const dryRun = has('dry-run');

if (!fs.existsSync(truthPath)) {
  console.error(`truth labels not found: ${truthPath}`);
  process.exit(2);
}

const samples = fs
  .readFileSync(truthPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((row) => typeof row.confidence === 'number' && typeof row.correct === 'boolean');

if (samples.length < 5) {
  console.log(JSON.stringify({ labelled: samples.length, note: 'need at least 5 truth labels to fit' }, null, 2));
  process.exit(0);
}

const before = {
  brier: brierScore(samples, IDENTITY_CALIBRATION),
  ece: expectedCalibrationError(samples, IDENTITY_CALIBRATION),
};
const fitted = fitPlatt(samples);
const after = { brier: brierScore(samples, fitted), ece: expectedCalibrationError(samples, fitted) };
const report = {
  labelled: samples.length,
  fitted,
  before,
  after,
  reliability: reliabilityCurve(samples, fitted),
};

if (!dryRun) {
  const file = path.join(store, 'calibration.json');
  fs.mkdirSync(store, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(fitted, null, 2) + '\n', 'utf8');
  report.written = file;
}
console.log(JSON.stringify(report, null, 2));
