import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripMarkdown, cleanLabel, cleanEntity, isJunkEntity } from '../lib/sanitize.js';

test('stripMarkdown removes headings, emphasis, links, code fences and HTML tags', () => {
  const input = [
    '# 标题 **粗体**',
    '',
    '> 引用 `inline` 与 [链接](https://example.com)',
    '',
    '| 项 | 值 |',
    '|---|---|',
    '| **姿势** | 鸭子坐 |',
    '',
    '```ts',
    'const x = 1 < 2;',
    '```',
    '<thinking>内部</thinking>',
  ].join('\n');
  const out = stripMarkdown(input);
  assert.doesNotMatch(out, /[#*`>|]|\[|\]|<thinking>/);
  assert.match(out, /标题 粗体/);
  assert.match(out, /引用 inline 与 链接/);
  assert.match(out, /姿势/);
  assert.doesNotMatch(out, /const x/);
  assert.match(out, /内部/);
});

test('cleanLabel returns a short display label without Markdown', () => {
  const label = cleanLabel('## 改了三点\n\n| 项 | **这一版** |\n|---|---|\n| 揉胸 | 删掉 |');
  assert.equal(label.includes('*'), false);
  assert.equal(label.includes('#'), false);
  assert.equal(label.includes('|'), false);
  assert.equal(label.length <= 120, true);
});

test('cleanEntity keeps technical names but drops Markdown and hash fragments', () => {
  assert.equal(cleanEntity('**MOSS-Image**'), 'moss-image');
  assert.equal(cleanEntity('comfyui_powershiftscheduler'), 'comfyui_powershiftscheduler');
  assert.equal(isJunkEntity('t_6aecf10ffd2c8191810e1357c5fa5613'), true);
  assert.equal(isJunkEntity('memory_open'), false);
});
