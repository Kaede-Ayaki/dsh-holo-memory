#!/usr/bin/env node
/**
 * Convert a marked label sheet (eval/label-sheet*.md) into a human-labelled
 * dataset (eval/dataset-human.jsonl).
 *
 * Mark convention: put ✓ (or x / 1 / 是 / yes) in the first cell of a row to
 * mean "this record should be recalled for the query". Blank = not relevant.
 * A block with no marked rows becomes a negative sample (expected: []).
 *
 *   node eval/from-labels.mjs [--sheet eval/label-sheet-50.md] [--out eval/dataset-human.jsonl]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const sheetPath = arg('sheet', 'eval/label-sheet-50.md');
const outPath = arg('out', 'eval/dataset-human.jsonl');
const MARKS = new Set(['✓', '✔', 'x', 'X', '1', '是', 'yes', 'Y', 'y', '*']);

if (!fs.existsSync(sheetPath)) {
  console.error(`sheet not found: ${sheetPath}`);
  process.exit(2);
}

const text = fs.readFileSync(sheetPath, 'utf8');
const parts = text.split(/^(?=### \d+\. )/m).filter((part) => part.startsWith('### '));

const items = [];
for (const part of parts) {
  const lines = part.split(/\r?\n/);
  const title = lines[0].replace(/^### \d+\.\s*/, '').trim();
  if (title.length === 0) continue;
  const cwdLine = lines.find((line) => /^cwd:\s*/.test(line.trim()));
  const cwd = cwdLine ? cwdLine.trim().replace(/^cwd:\s*/, '') : '';
  const expected = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').map((cell) => cell.trim());
    // cells: ['', mark, layer, id, score, preview, '']
    if (cells.length < 5) continue;
    const mark = cells[1];
    const id = cells[3];
    if (MARKS.has(mark) && /^[a-z]\d*_/.test(id)) expected.push(id);
  }
  const id = 'h-' + crypto.createHash('sha1').update(title).digest('hex').slice(0, 10);
  items.push({
    id,
    query: title,
    cwd: cwd === '(global)' ? '' : cwd,
    expected: [...new Set(expected)],
    distractors: [],
    k: 5,
    annotator: 'human',
    note: expected.length > 0 ? `${expected.length} marked relevant` : 'marked: none relevant',
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, items.map((item) => JSON.stringify(item)).join('\n') + '\n', 'utf8');
const labelled = items.filter((item) => item.expected.length > 0).length;
console.log(JSON.stringify({ sheet: sheetPath, blocks: items.length, labelled, negative: items.length - labelled, out: outPath }, null, 2));
