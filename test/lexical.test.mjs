import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bm25Index, jaccard, nearDuplicate, tokenize } from '../lib/lexical.js';

test('tokenize handles CJK bigrams and latin words', () => {
  const tokens = tokenize('用户偏好 TypeScript；项目使用 pnpm 与 SQLite');
  assert.ok(tokens.includes('用户'));
  assert.ok(tokens.includes('偏好'));
  assert.ok(tokens.includes('typescript'));
  assert.ok(tokens.includes('pnpm'));
  assert.ok(tokens.includes('sqlite'));
  assert.ok(tokens.includes('项目'));
});

test('jaccard and nearDuplicate', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['a', 'b'])), 1);
  assert.ok(nearDuplicate('用户喜欢 TypeScript 和 pnpm', '用户喜欢 typescript 和 pnpm', 0.8));
});

test('BM25 ranks the matching document first', () => {
  const docs = [
    { id: 'a', tokens: tokenize('用户喜欢 TypeScript 和 pnpm') },
    { id: 'b', tokens: tokenize('项目数据库使用 SQLite 全文检索') },
    { id: 'c', tokens: tokenize('明天天气不错') },
  ];
  const index = new Bm25Index(docs);
  const scores = index.normalized(tokenize('SQLite 检索'));
  assert.ok((scores.get('b') ?? 0) > (scores.get('a') ?? 0));
  assert.ok((scores.get('b') ?? 0) > 0);
});
