import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CONFIDENCE_MIGRATION_DEFAULT,
  CONFIDENCE_SCALE,
  deriveConfidence,
  fromBasisPoints,
  initialConfidence,
  isActiveClaim,
  normalizeConfidence,
  round3,
  shouldAutoApply,
  toBasisPoints,
  createClaimMeta,
} from '../lib/confidence.js';

test('normalizeConfidence clamps, rounds to three decimals, rejects NaN', () => {
  assert.equal(normalizeConfidence(0.84249), 0.842);
  assert.equal(normalizeConfidence(0.8425), 0.843);
  assert.equal(normalizeConfidence(1.7), 1);
  assert.equal(normalizeConfidence(-0.3), 0);
  assert.equal(normalizeConfidence(Number.NaN), CONFIDENCE_MIGRATION_DEFAULT);
  assert.equal(normalizeConfidence(Number.POSITIVE_INFINITY), CONFIDENCE_MIGRATION_DEFAULT);
  assert.equal(normalizeConfidence('0.8'), CONFIDENCE_MIGRATION_DEFAULT, 'strings are not numbers');
});

test('basis points round-trip without float drift', () => {
  assert.equal(toBasisPoints(0.842), 842);
  assert.equal(toBasisPoints(0.8425), 843);
  assert.equal(fromBasisPoints(843), 0.843);
  assert.equal(toBasisPoints(fromBasisPoints(1)), 1);
  assert.equal(CONFIDENCE_SCALE, 1000);
});

test('priors follow the agreed initial table', () => {
  assert.equal(initialConfidence('user_explicit'), 0.95);
  assert.equal(initialConfidence('user_correction'), 0.99);
  assert.ok(initialConfidence('multi_turn_inference') >= 0.75);
  assert.ok(initialConfidence('model_inference') <= 0.65);
  assert.equal(initialConfidence('migration_unknown'), 0.5);
});

test('corroboration raises confidence only for independent evidence', () => {
  const base = deriveConfidence({ sourceType: 'model_inference' });
  const corroborated = deriveConfidence({ sourceType: 'model_inference', corroboration: 3 });
  assert.ok(corroborated > base, 'corroboration should raise confidence');
  assert.equal(round3(corroborated), corroborated, 'always three decimals');
});

test('contradictions lower confidence and verification raises it', () => {
  const base = deriveConfidence({ sourceType: 'user_explicit' });
  const contradicted = deriveConfidence({ sourceType: 'user_explicit', contradiction: 2 });
  const verified = deriveConfidence({ sourceType: 'user_explicit', verified: true });
  assert.ok(contradicted < base);
  assert.ok(verified >= base);
  assert.ok(deriveConfidence({ sourceType: 'user_correction' }) > deriveConfidence({ sourceType: 'model_inference' }));
});

test('deriveConfidence never leaves 0.000-1.000', () => {
  for (const sourceType of ['user_explicit', 'user_correction', 'multi_turn_inference', 'model_inference', 'imported', 'migration_unknown']) {
    for (const corroboration of [0, 1, 5, 50]) {
      for (const contradiction of [0, 1, 5, 50]) {
        const value = deriveConfidence({ sourceType, corroboration, contradiction, verified: corroboration > 0 });
        assert.ok(value >= 0 && value <= 1, `${sourceType} ${value}`);
        assert.equal(round3(value), value);
      }
    }
  }
});

test('shouldAutoApply uses the 0.700 threshold', () => {
  assert.equal(shouldAutoApply(0.699), false);
  assert.equal(shouldAutoApply(0.7), true, '0.700 is inclusive: basis points compare exactly');
  assert.equal(shouldAutoApply(0.7001), true);
  assert.equal(shouldAutoApply(0.9), true);
});

test('claim metadata starts active with honest recorded times', () => {
  const claim = createClaimMeta('migration_unknown');
  assert.equal(claim.status, 'active');
  assert.equal(claim.confidence, 0.5);
  assert.equal(claim.confidenceBasis.sourceType, 'migration_unknown');
  assert.equal(claim.confidenceBasis.calibrationVersion, 'heuristic-v1');
  assert.ok(claim.recordedAt > 0);
  assert.ok(isActiveClaim(claim));
});

test('isActiveClaim respects status and validity window', () => {
  const now = 1_000_000;
  const future = createClaimMeta('user_explicit', { observedAt: now, recordedAt: now });
  future.validFrom = now + 1000;
  assert.equal(isActiveClaim(future, now), false, 'not valid yet');
  const expired = createClaimMeta('user_explicit', { observedAt: now, recordedAt: now });
  expired.validTo = now - 1;
  assert.equal(isActiveClaim(expired, now), false, 'already expired');
  const superseded = createClaimMeta('user_explicit', { observedAt: now, recordedAt: now });
  superseded.status = 'superseded';
  assert.equal(isActiveClaim(superseded, now), false, 'superseded');
  assert.equal(isActiveClaim(undefined, now), true, 'legacy record without claim stays visible');
});
