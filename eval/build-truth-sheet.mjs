#!/usr/bin/env node
/**
 * Build a truth-label sheet: for each claim, ask the owner "true / false /
 * unclear". This is different from the retrieval label sheet: relevance is
 * "should this be recalled", truth is "is this claim correct".
 *
 *   node eval/build-truth-sheet.mjs [--store .dsh/holo-memory] [--limit 30] [--out eval/truth-sheet-30.md]
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const store = arg('store', path.join(process.env.DSH_HOME || '', 'holo-memory'));
const limit = Number(arg('limit', '30'));
const outPath = arg('out', 'eval/truth-sheet-30.md');

const l2Path = path.join(store, 'l2.json');
if (!fs.existsSync(l2Path)) {
  console.error(`no l2.json under ${store}`);
  process.exit(2);
}

const records = JSON.parse(fs.readFileSync(l2Path, 'utf8'))
  .filter((record) => typeof record.text === 'string' && record.text.trim().length >= 20)
  .filter((record) => !record.supersededBy)
  .sort((a, b) => (b.importance || 0) - (a.importance || 0) || (b.updatedAt || 0) - (a.updatedAt || 0))
  .slice(0, limit);

const lines = [
  '# claim 真值标注',
  '',
  `共 ${records.length} 条。请在“真值”列填：真 / 假 / 说不清。`,
  '真 = 这条描述的事实成立；假 = 事实错误；说不清 = 无法判断或与上下文强相关。',
  '',
  '| 真值 | 置信度 | id | 内容 |',
  '|---|---|---|---|',
];
for (const record of records) {
  const conf = typeof record.claim?.confidence === 'number' ? record.claim.confidence.toFixed(3) : (typeof record.confidence === 'number' ? record.confidence.toFixed(3) : '—');
  const text = String(record.text).replace(/\s+/g, ' ').replace(/\|/g, '\\|').slice(0, 160);
  lines.push(`|  | ${conf} | ${record.id} | ${text} |`);
}
lines.push('');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(JSON.stringify({ store, records: records.length, out: outPath }, null, 2));
