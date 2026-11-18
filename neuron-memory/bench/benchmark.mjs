/**
 * P2 stress benchmark: real holo store + synthetic graph.
 * Read-only against holo JSON; all graph writes go to temp directories.
 */
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { NeuronGraph, readHoloRecords } from '../lib/graph.js';
import { normalizeConfig } from '../lib/config.js';

const REAL_HOLO = 'D:/Deepseek-harness/.dsh/holo-memory';

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;
  return {
    count: samples.length,
    min: Math.round(sorted[0] * 100) / 100,
    p50: Math.round(at(0.5) * 100) / 100,
    p95: Math.round(at(0.95) * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    mean: Math.round((samples.reduce((sum, value) => sum + value, 0) / samples.length) * 100) / 100,
  };
}

async function time(fn) {
  const start = performance.now();
  const value = await fn();
  return { ms: Math.round((performance.now() - start) * 100) / 100, value };
}

async function realBench() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-real-'));
  const records = await readHoloRecords(REAL_HOLO);
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: REAL_HOLO });
  const graph = new NeuronGraph(config.graphDir, config);
  const build = await time(() => graph.ingest(records, { rebuild: true }));
  const statsAfter = await graph.stats();

  const noChangeSamples = [];
  for (let i = 0; i < 10; i += 1) {
    const sample = await time(() => graph.ingest(records));
    noChangeSamples.push(sample.ms);
  }

  const queries = ['MOSS 当前 M1 基线', '八荣八耻 行为准则', 'LoRA 训练显存', '全息记忆 0.4.1', 'ComfyUI 二次确认'];
  const expandSamples = [];
  for (let i = 0; i < 100; i += 1) {
    const query = queries[i % queries.length];
    const sample = await time(() => graph.expand({ query, topK: 8 }));
    expandSamples.push(sample.ms);
  }

  const added = {
    id: 'l2_stress_real_new',
    layer: 'l2',
    text: 'stress test record about MOSS and LoRA',
    tags: ['MOSS', 'LoRA', 'stress'],
    importance: 5,
    updatedAt: Date.now(),
  };
  const add = await time(() => graph.ingest([...records, added]));
  const remove = await time(() => graph.ingest(records));
  await fs.rm(dir, { recursive: true, force: true });
  return {
    records: records.length,
    buildMs: build.ms,
    graph: statsAfter,
    noChangeSyncMs: stats(noChangeSamples),
    addOneMs: add.ms,
    removeOneMs: remove.ms,
    expandMs: stats(expandSamples),
  };
}

async function syntheticBench() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-synth-'));
  const records = Array.from({ length: 5000 }, (_, index) => ({
    id: `l2_synth_${index}`,
    layer: index % 10 === 0 ? 'l3' : 'l2',
    text: `synthetic record ${index} about topic ${index % 500}`,
    tags: [`topic-${index % 500}`, `group-${index % 37}`, index % 3 === 0 ? 'shared' : 'other'],
    importance: 5 + (index % 5),
    updatedAt: index,
  }));
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: dir });
  const graph = new NeuronGraph(config.graphDir, config);
  const build = await time(() => graph.ingest(records, { rebuild: true }));
  const statsAfter = await graph.stats();
  const queries = ['topic 42', 'shared group', 'synthetic record 1999', 'topic 499', 'other group'];
  const samples = [];
  for (let i = 0; i < 100; i += 1) {
    const sample = await time(() => graph.expand({ query: queries[i % queries.length], topK: 8 }));
    samples.push(sample.ms);
  }
  await fs.rm(dir, { recursive: true, force: true });
  return { records: records.length, buildMs: build.ms, graph: statsAfter, expandMs: stats(samples) };
}

const result = {
  real: await realBench(),
  synthetic: await syntheticBench(),
};
console.log(JSON.stringify(result, null, 2));
