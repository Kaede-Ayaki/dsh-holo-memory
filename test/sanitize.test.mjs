import { test } from "node:test";
import assert from "node:assert/strict";
import { looksSecret, redactSecrets } from "../lib/sanitize.js";
import { normalizeExtraction } from "../lib/extract.js";

test("secrets are detected and redacted", () => {
  const key = "sk-" + "a".repeat(40);
  assert.equal(looksSecret(`key=${key}`), true);
  assert.match(redactSecrets(`key=${key}`), /\[REDACTED\]/);
  assert.doesNotMatch(redactSecrets(`key=${key}`), /sk-aaa/);
});

test("L1 extraction redacts secrets", () => {
  const key = "sk-" + "b".repeat(40);
  const out = normalizeExtraction({ l1: { summary: `用户提供了 ${key}`, topics: [key] } });
  assert.ok(out?.l1);
  assert.doesNotMatch(out.l1.summary, /sk-bbb/);
  assert.match(out.l1.summary, /REDACTED/);
});
