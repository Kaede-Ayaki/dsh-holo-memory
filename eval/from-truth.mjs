#!/usr/bin/env node
/**
 * Convert a marked truth sheet into eval/truth.jsonl (claim truth labels).
 *
 *   node eval/from-truth.mjs [--sheet eval/truth-sheet-30.md] [--out eval/truth.jsonl]
 *
 * Accepts 真/true/1 (correct), 假/false/0 (wrong) and skips 说不清/unclear.
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const sheetPath = arg('sheet', 'eval/truth-sheet-30.md');
const outPath = arg('out', 'eval/truth.jsonl');
const TRUE_MARKS = new Set(['真', 'true', 'TRUE', '1', '✓', '✔', 'y', 'Y', '是']);
const FALSE_MARKS = new Set(['假', 'false', 'FALSE', '0', 'x', 'X', 'n', 'N', '否']);

if (!fs.existsSync(sheetPath)) {
  console.error(`sheet not found: ${sheetPath}`);
  process.exit(2);
}

const rows = [];
let skipped = 0;
for (const line of fs.readFileSync(sheetPath, 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) continue;
  const cells = trimmed.split('|').map((cell) => cell.trim());
  if (cells.length < 5) continue;
  const mark = cells[1];
  const confidence = Number.parseFloat(cells[2]);
  const id = cells[3];
  if (!/^[a-z]\d*_/.test(id)) continue;
  if (!Number.isFinite(confidence)) {
    skipped += 1;
    continue;
  }
  const correct = TRUE_MARKS.has(mark) ? true : FALSE_MARKS.has(mark) ? false : undefined;
  if (correct === undefined) {
    skipped += 1;
    continue;
  }
  rows.push({ id, confidence, correct });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
console.log(JSON.stringify({ sheet: sheetPath, labelled: rows.length, skipped, out: outPath }, null, 2));
