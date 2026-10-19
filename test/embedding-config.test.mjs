import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { normalizeConfig } from '../lib/config.js';
import {
  applySavedEmbeddingConfig,
  defaultEmbeddingKeyPath,
  hasEmbeddingKey,
  loadEmbeddingConfig,
  readEmbeddingKey,
  saveEmbeddingConfig,
} from '../lib/embedding-config.js';

test('save/load embedding config keeps the key out of JSON', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'holo-cfg-'));
  await saveEmbeddingConfig(dir, {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen3-Embedding-8B',
    dimensions: 4096,
    baseline: 0.22,
    apiKey: 'sk-test-secret-value',
  });
  const json = await fs.readFile(path.join(dir, 'embedding.json'), 'utf8');
  assert.doesNotMatch(json, /sk-test-secret-value/);
  const saved = loadEmbeddingConfig(dir);
  assert.ok(saved);
  assert.equal(saved.model, 'Qwen/Qwen3-Embedding-8B');
  assert.equal(saved.dimensions, 4096);
  assert.equal(saved.keyFile, defaultEmbeddingKeyPath(dir));

  const key = readEmbeddingKey(normalizeConfig({ embeddingApiKeyFile: saved.keyFile }));
  assert.equal(key, 'sk-test-secret-value');
  const cfg = normalizeConfig({});
  applySavedEmbeddingConfig(cfg, dir);
  assert.equal(cfg.embeddingEnabled, true);
  assert.equal(cfg.embeddingModel, 'Qwen/Qwen3-Embedding-8B');
  assert.equal(hasEmbeddingKey(cfg), true);
  await fs.rm(dir, { recursive: true, force: true });
});
