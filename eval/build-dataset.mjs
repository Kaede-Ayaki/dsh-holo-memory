#!/usr/bin/env node
/**
 * Phase 0.2 — build an eval dataset from the real injection log.
 *
 * Input  : $DSH_HOME/holo-memory/injections.jsonl (one JSON per injected step)
 * Output : eval/dataset.jsonl      weak labels (what 0.7.0 actually injected)
 *          eval/candidates.jsonl   queries reserved for human labelling
 *
 * The injection log contains real user queries; both outputs are gitignored
 * and must never be committed.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const injectionsPath = arg('injections');
const outPath = arg('out', 'eval/dataset.jsonl');
const candidatesPath = arg('candidates-out', 'eval/candidates.jsonl');
const candidateCount = Number(arg('candidates', '120'));
const positiveCount = Number(arg('positives', '160'));
const negativeCount = Number(arg('negatives', '40'));

if (!injectionsPath) {
  console.error('missing --injections <path/to/injections.jsonl>');
  process.exit(2);
}

const lines = fs.readFileSync(injectionsPath, 'utf8').split('\n').filter(Boolean);
const rows = [];
for (const line of lines) {
  try {
    rows.push(JSON.parse(line));
  } catch {
    /* skip broken line */
  }
}

const seen = new Set();
const positives = [];
const negatives = [];
const NOISE = ['[用户画像', 'Your parent agent id', 'holo-memory context', '[长期记忆自动召回'];
for (const row of rows) {
  const query = typeof row.query === 'string' ? row.query.trim().replace(/\s+/g, ' ') : '';
  if (query.length < 8) continue;
  if (NOISE.some((marker) => query.includes(marker))) continue;
  const selected = Array.isArray(row.selected) ? row.selected : [];
  const ids = selected.map((s) => s && s.id).filter((id) => typeof id === 'string');
  const key = query.slice(0, 160);
  if (seen.has(key)) continue;
  seen.add(key);
  const item = {
    id: 'w-' + crypto.createHash('sha1').update(query).digest('hex').slice(0, 10),
    query: query.slice(0, 800),
    cwd: typeof row.cwd === 'string' ? row.cwd : '',
    expected: ids.slice(0, 6),
    distractors: [],
    k: 5,
    annotator: 'injection-weak',
    note: ids.length > 0 ? 'weak: ids injected by 0.7.0' : 'weak: injected nothing (negative sample)',
  };
  if (ids.length > 0) positives.push(item);
  else negatives.push(item);
}

// Deterministic, id-sorted sampling so diffs stay stable across runs.
const byId = (a, b) => a.id.localeCompare(b.id);
positives.sort(byId);
negatives.sort(byId);

const dataset = [...positives.slice(0, positiveCount), ...negatives.slice(0, negativeCount)];

// Candidates for human labelling: prefer queries whose recall is likely non-empty.
const candidates = [...positives.slice(0, candidateCount), ...negatives.slice(0, Math.max(0, Math.round(candidateCount * 0.15)))];

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, dataset.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');
fs.writeFileSync(candidatesPath, candidates.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf8');

console.log(
  JSON.stringify(
    {
      rows: rows.length,
      uniqueQueries: seen.size,
      positives: positives.length,
      negatives: negatives.length,
      dataset: dataset.length,
      candidates: candidates.length,
      out: outPath,
    },
    null,
    2,
  ),
);
