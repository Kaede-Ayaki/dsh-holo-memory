import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../lib/config.js';
import { thresholdAudit } from '../lib/thresholds.js';

test('every threshold names the concrete failure it prevents', () => {
  const notes = thresholdAudit(normalizeConfig({}));
  assert.ok(notes.length >= 8);
  const keys = new Set();
  for (const note of notes) {
    assert.ok(!keys.has(note.key), `duplicate threshold key ${note.key}`);
    keys.add(note.key);
    assert.equal(typeof note.value, 'number');
    assert.ok(Number.isFinite(note.value), `${note.key} has a finite value`);
    assert.ok(note.prevents.length >= 8, `${note.key} has a failure story`);
  }
});
