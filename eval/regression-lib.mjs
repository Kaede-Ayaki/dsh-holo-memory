/**
 * Pure helpers for the retrieval regression gate, kept separate so they can be
 * unit-tested without a store or network calls.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function storeSnapshotHash(dir) {
  const layers = ['l1', 'l2', 'l3'].map((layer) => {
    const file = path.join(dir, `${layer}.json`);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  });
  return crypto.createHash('sha256').update(layers.join('\n')).digest('hex');
}

export function compareMetrics(current, baseline, maxDrop = 0.05) {
  const pick = (metrics, group, key) => metrics?.[group]?.[key] ?? metrics?.[key] ?? 0;
  const rows = [
    ['query.recallAtK', pick(current, 'query', 'recallAtK'), pick(baseline, 'query', 'recallAtK')],
    ['query.hitRate', pick(current, 'query', 'hitRate'), pick(baseline, 'query', 'hitRate')],
    ['query.quietRate', pick(current, 'query', 'quietRate'), pick(baseline, 'query', 'quietRate')],
    ['query.ndcgAtK', pick(current, 'query', 'ndcgAtK'), pick(baseline, 'query', 'ndcgAtK')],
    ['finalInjected.expectedCoverage', pick(current, 'finalInjected', 'expectedCoverage'), pick(baseline, 'finalInjected', 'expectedCoverage')],
  ];
  const metrics = {};
  let ok = true;
  for (const [name, actual, expected] of rows) {
    const limit = expected - maxDrop;
    const passed = actual + 1e-9 >= limit;
    metrics[name] = { actual, baseline: expected, limit, ok: passed };
    if (!passed) ok = false;
  }
  return { ok, metrics };
}
