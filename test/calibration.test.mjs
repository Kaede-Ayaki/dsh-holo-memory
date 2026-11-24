import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  IDENTITY_CALIBRATION,
  applyCalibration,
  brierScore,
  expectedCalibrationError,
  fitPlatt,
  getCalibration,
  reliabilityCurve,
  setCalibration,
} from '../lib/calibration.js';

function samplesOverconfident(n = 40) {
  // Stated 0.95 but only half are true: a textbook over-confidence curve.
  const rows = [];
  for (let i = 0; i < n; i += 1) {
    rows.push({ confidence: 0.95, correct: i % 2 === 0 });
  }
  return rows;
}

test('identity calibration leaves confidence unchanged', () => {
  setCalibration(IDENTITY_CALIBRATION);
  assert.equal(applyCalibration(0.8), 0.8);
  assert.equal(applyCalibration(0.5), 0.5);
  assert.equal(applyCalibration(0), 0);
  assert.equal(applyCalibration(1), 1);
});

test('fitPlatt reduces ECE and Brier for overconfident labels', () => {
  const rows = samplesOverconfident();
  const before = { ece: expectedCalibrationError(rows, IDENTITY_CALIBRATION), brier: brierScore(rows, IDENTITY_CALIBRATION) };
  const fitted = fitPlatt(rows);
  assert.ok(fitted.a > 0, 'slope stays positive so ranking is preserved');
  const after = { ece: expectedCalibrationError(rows, fitted), brier: brierScore(rows, fitted) };
  assert.ok(after.ece < before.ece, `ECE should drop: ${before.ece} -> ${after.ece}`);
  assert.ok(after.brier < before.brier, `Brier should drop: ${before.brier} -> ${after.brier}`);
  assert.ok(applyCalibration(0.95, fitted) < 0.95, 'calibrated overconfidence is pulled down');
});

test('fitPlatt returns the identity map when there is nothing to learn', () => {
  const one = fitPlatt([{ confidence: 0.9, correct: true }]);
  assert.equal(one.version, 'identity');
  const empty = fitPlatt([]);
  assert.equal(empty.version, 'identity');
});

test('setCalibration takes effect globally and rejects broken params', () => {
  setCalibration({ a: 1, b: -0.5, version: 'platt-test' });
  assert.equal(getCalibration().version, 'platt-test');
  assert.ok(applyCalibration(0.8) < 0.8, 'b < 0 pulls confidence down');
  assert.ok(applyCalibration(0.8) > 0.5, 'but stays above chance for a confident claim');
  setCalibration({ a: Number.NaN, b: 0, version: 'broken' });
  assert.equal(getCalibration().version, 'identity');
  setCalibration(IDENTITY_CALIBRATION);
});

test('reliability curve buckets cover 0.00-1.00', () => {
  const rows = samplesOverconfident(20);
  const curve = reliabilityCurve(rows, IDENTITY_CALIBRATION);
  assert.equal(curve.length, 10);
  assert.equal(curve[0].bucket, '0.00-0.10');
  assert.equal(curve[9].bucket, '0.90-1.00');
  const top = curve[9];
  assert.ok(top.count > 0, '0.95 confidence lands in the top bucket');
  assert.ok(Math.abs(top.accuracy - 0.5) < 0.01);
});
