#!/usr/bin/env node
/**
 * Phase 0.1 / 0.3 — offline retrieval evaluation.
 *
 * Modes
 *   metrics : run recall over eval/dataset.jsonl and write aggregate metrics
 *   label   : render a human labelling sheet (query + Top-K retrieved records)
 *
 * Channel switches (to replicate production and to ablate):
 *   --live-config <yml>   read inject quotas/thresholds/embedding from the DSH profile
 *   --vector              enable the embedding channel (network + local key)
 *   --neuron              enable the associative channel from dsh-neuron-memory graph
 *   --active              count active-window (resident) items as returned
 *
 * Never writes to the store.
 */
import fs from 'node:fs';
import path from 'node:path';

const { HoloStore, projectIdFor } = await import('../lib/store.js');
const { recall } = await import('../lib/retrieval.js');
const { DEFAULT_CONFIG, normalizeConfig } = await import('../lib/config.js');
const { EmbeddingClient } = await import('../lib/embeddings.js');
const { evidenceOf } = await import('../lib/source.js');
const { NeuronGraph } = await import('../neuron-memory/lib/graph.js');
const { normalizeConfig: normalizeNeuron } = await import('../neuron-memory/lib/config.js');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

const dataDir = arg('data', path.join(process.env.DSH_HOME || '', 'holo-memory'));
const k = Number(arg('k', '5'));
const limit = Number(arg('limit', '0'));
const outPath = arg('out', '');
const labelPath = arg('label', '');
const candidatesPath = arg('candidates', 'eval/candidates.jsonl');
const datasetPath = arg('dataset', 'eval/dataset.jsonl');
const liveConfigPath = arg('live-config', '');
const useVector = flag('vector');
const useNeuron = flag('neuron');
const useActive = flag('active');

if (!fs.existsSync(dataDir)) {
  console.error(`store dir not found: ${dataDir}`);
  process.exit(2);
}

/** Minimal YAML reader for the two plugin blocks in a DSH cordis.patch.yml. */
function readBlock(text, id) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `- id: ${id}`);
  if (start < 0) return {};
  const out = {};
  let inConfig = false;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*-\s+id:\s+/.test(line)) break;
    if (/^\s*config:\s*$/.test(line)) {
      inConfig = true;
      continue;
    }
    if (!inConfig) continue;
    const match = /^\s{4}([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!match) {
      if (/^\s{0,2}\S/.test(line) && line.trim().length > 0) inConfig = false;
      continue;
    }
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value === 'true') out[match[1]] = true;
    else if (value === 'false') out[match[1]] = false;
    else if (value !== '' && Number.isFinite(Number(value))) out[match[1]] = Number(value);
    else out[match[1]] = value;
  }
  return out;
}

let config = { ...DEFAULT_CONFIG };
let neuronConfig = normalizeNeuron({});
if (liveConfigPath && fs.existsSync(liveConfigPath)) {
  const text = fs.readFileSync(liveConfigPath, 'utf8');
  const holo = readBlock(text, 'holo-memory');
  const neuron = readBlock(text, 'neuron-memory');
  config = normalizeConfig({ ...DEFAULT_CONFIG, ...holo });
  neuronConfig = normalizeNeuron({ ...neuron });
  if (!useVector) config = { ...config, embeddingEnabled: false };
}

const embedder = new EmbeddingClient(config);
const store = new HoloStore(dataDir, config);
await store.whenReady();

let neuronGraph = null;
if (useNeuron) {
  neuronGraph = new NeuronGraph(neuronConfig.graphDir || path.join(path.dirname(dataDir), 'neuron-memory'), neuronConfig);
}

function textOf(record) {
  if (record.layer === 'l1') return `${record.summary} ${record.topics.join(' ')} ${record.intent ?? ''}`;
  if (record.layer === 'l2') return `${record.text} ${record.tags.join(' ')}`;
  return `${record.title} ${record.hologram} ${record.themes.join(' ')}`;
}

async function neuronHitsFor(query, projectKey) {
  if (!neuronGraph) return undefined;
  try {
    const expanded = await neuronGraph.expand({ query, projectKey, depth: neuronConfig.defaultDepth, topK: neuronConfig.topK });
    return expanded.hits.map((hit) => ({ id: hit.holoId, activation: hit.activation }));
  } catch {
    return undefined;
  }
}

async function retrieve(item) {
  const projectKey = projectIdFor(item.cwd).key;
  const neuronHits = await neuronHitsFor(item.query, projectKey);
  const result = await recall(store, embedder, config, item.query, {
    projectKey,
    maxChars: config.injectMaxChars,
    minScore: config.injectMinScore,
    counts: { l1: config.injectL1, l2: config.injectL2, l3: config.injectL3 },
    neuronHits,
  });
  const items = result ? result.items : [];
  const queryItems = items.filter((entry) => entry.active !== true);
  return {
    items,
    queryItems,
    residentItems: items.filter((entry) => entry.active === true),
    returnedIds: useActive ? items.map((entry) => entry.record.id) : queryItems.map((entry) => entry.record.id),
  };
}

function ndcg(returned, expected, kk) {
  const gains = returned.slice(0, kk).map((id) => (expected.has(id) ? 1 : 0));
  const ideal = Math.min(expected.size, kk);
  if (ideal === 0) return 0;
  let dcg = 0;
  gains.forEach((gain, index) => {
    if (gain) dcg += 1 / Math.log2(index + 2);
  });
  let idcg = 0;
  for (let i = 0; i < ideal; i += 1) idcg += 1 / Math.log2(i + 2);
  return idcg === 0 ? 0 : dcg / idcg;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function readJsonl(file) {
  if (!fs.existsSync(file)) {
    console.error(`file not found: ${file}`);
    process.exit(2);
  }
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

if (labelPath) {
  const candidates = readJsonl(candidatesPath);
  const rows = limit > 0 ? candidates.slice(0, limit) : candidates;
  const chunks = [`# 检索标注清单`, '', `共 ${rows.length} 条 query。对每个 query，在“命中”列填 ✓ 表示该条记忆确实应该被召回；都不命中就留空。`, ''];
  for (let index = 0; index < rows.length; index += 1) {
    const item = rows[index];
    const { queryItems } = await retrieve(item);
    chunks.push(`### ${index + 1}. ${String(item.query).replace(/\n/g, ' ').slice(0, 160)}`);
    chunks.push('');
    chunks.push('```text');
    chunks.push(`cwd: ${item.cwd || '(global)'}`);
    chunks.push('```');
    if (queryItems.length === 0) {
      chunks.push('*无命中*');
    } else {
      chunks.push('| 命中 | 层 | id | 分数 | 预览 |');
      chunks.push('|---|---|---|---|---|');
      for (const entry of queryItems.slice(0, k)) {
        const preview = textOf(entry.record).replace(/\s+/g, ' ').replace(/\|/g, '\\|').slice(0, 72);
        chunks.push(`|  | ${entry.layer} | ${entry.record.id} | ${entry.score.toFixed(3)} | ${preview} |`);
      }
    }
    chunks.push('');
  }
  fs.mkdirSync(path.dirname(labelPath), { recursive: true });
  fs.writeFileSync(labelPath, chunks.join('\n'), 'utf8');
  console.log(`label sheet: ${labelPath} (${rows.length} queries)`);
  process.exit(0);
}

const dataset = readJsonl(datasetPath);
const rows = limit > 0 ? dataset.slice(0, limit) : dataset;
const perItem = [];
let returnedTotal = 0;
let staleCount = 0;
let evidenceCount = 0;
const recalls = [];
const precisions = [];
const mrrs = [];
const ndcgs = [];
let hitCount = 0;
let expectedTotal = 0;
let expectedMissing = 0;
let evaporatedItems = 0;
let positiveItems = 0;
let negativeItems = 0;
let quietItems = 0;

for (const item of rows) {
  const { items, returnedIds, queryItems, residentItems } = await retrieve(item);
  const returned = returnedIds;
  const expectedAll = Array.isArray(item.expected) ? item.expected : [];
  const expected = new Set(expectedAll.filter((id) => store.find(id) !== undefined));
  expectedTotal += expectedAll.length;
  expectedMissing += expectedAll.length - expected.size;
  returnedTotal += returned.length;
  for (const entry of queryItems) {
    if (entry.record.supersededBy) staleCount += 1;
    if (evidenceOf(entry.record) !== 'none') evidenceCount += 1;
  }
  let recallValue = null;
  let precisionValue = null;
  let mrrValue = null;
  let ndcgValue = null;
  if (expectedAll.length > 0 && expected.size === 0) {
    evaporatedItems += 1;
  } else if (expected.size > 0) {
    positiveItems += 1;
    const top = returned.slice(0, k);
    const hits = top.filter((id) => expected.has(id)).length;
    recallValue = hits / expected.size;
    precisionValue = hits / k;
    recalls.push(recallValue);
    precisions.push(precisionValue);
    if (hits > 0) {
      hitCount += 1;
      const firstIndex = top.findIndex((id) => expected.has(id));
      mrrValue = 1 / (firstIndex + 1);
    } else {
      mrrValue = 0;
    }
    mrrs.push(mrrValue);
    ndcgValue = ndcg(returned, expected, k);
    ndcgs.push(ndcgValue);
  } else {
    negativeItems += 1;
    if (returned.length === 0) quietItems += 1;
  }
  perItem.push({
    id: item.id,
    expected: expected.size,
    returned: returned.length,
    resident: residentItems.length,
    hit: expected.size > 0 ? returned.slice(0, k).some((id) => expected.has(id)) : null,
    recall: recallValue,
    precision: precisionValue,
    mrr: mrrValue,
    ndcg: ndcgValue,
  });
}

const mean = (values) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);
const metrics = {
  items: rows.length,
  positives: positiveItems,
  negatives: negativeItems,
  evaporated: evaporatedItems,
  k,
  recallAtK: Number(mean(recalls).toFixed(4)),
  precisionAtK: Number(mean(precisions).toFixed(4)),
  mrr: Number(mean(mrrs).toFixed(4)),
  ndcgAtK: Number(mean(ndcgs).toFixed(4)),
  hitRate: positiveItems === 0 ? 0 : Number((hitCount / positiveItems).toFixed(4)),
  quietRate: negativeItems === 0 ? 0 : Number((quietItems / negativeItems).toFixed(4)),
  recallP10: Number(percentile(recalls, 10).toFixed(4)),
  recallP50: Number(percentile(recalls, 50).toFixed(4)),
  recallP90: Number(percentile(recalls, 90).toFixed(4)),
  avgReturned: Number((returnedTotal / Math.max(1, rows.length)).toFixed(3)),
  expectedSurvival: expectedTotal === 0 ? 0 : Number(((expectedTotal - expectedMissing) / expectedTotal).toFixed(4)),
  staleHitRate: returnedTotal === 0 ? 0 : Number((staleCount / returnedTotal).toFixed(4)),
  evidenceRate: returnedTotal === 0 ? 0 : Number((evidenceCount / returnedTotal).toFixed(4)),
  embeddingReason: embedder.reason ?? null,
};

const report = {
  generatedAt: new Date().toISOString(),
  store: dataDir,
  dataset: datasetPath,
  datasetAnnotator: dataset[0] ? dataset[0].annotator : 'unknown',
  channels: {
    vector: useVector && embedder.enabled,
    neuron: Boolean(neuronGraph),
    active: useActive,
  },
  config: {
    injectMaxChars: config.injectMaxChars,
    injectMinScore: config.injectMinScore,
    injectMinEvidence: config.injectMinEvidence,
    injectL1: config.injectL1,
    injectL2: config.injectL2,
    injectL3: config.injectL3,
    activeWindowFallbackOnly: config.activeWindowFallbackOnly,
  },
  metrics,
  perItem,
};

if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
}

console.log(JSON.stringify(metrics, null, 2));
if (outPath) console.log(`wrote ${outPath}`);
process.exit(0);
