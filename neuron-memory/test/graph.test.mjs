import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normalizeConfig } from '../lib/config.js';
import { NeuronGraph, readHoloRecords } from '../lib/graph.js';
import { apply } from '../lib/index.js';

async function seed() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-p0-'));
  const l2a = {
    id: 'l2_p0_alpha',
    layer: 'l2',
    text: 'MOSS-Image 使用 M1 样式基线。',
    tags: ['moss-image', 'M1'],
    kind: 'decision',
    importance: 8,
    updatedAt: 10,
  };
  const l2b = {
    id: 'l2_p0_beta',
    layer: 'l2',
    text: 'ComfyUI 需要 M1 模型。',
    tags: ['comfyui', 'M1'],
    kind: 'fact',
    importance: 6,
    updatedAt: 11,
  };
  const l3c = {
    id: 'l3_p0_gamma',
    layer: 'l3',
    title: 'MOSS 生产线状态',
    hologram: 'MOSS 生产线和 LoRA 状态。',
    themes: ['moss-image', 'lora'],
    entities: [],
    importance: 9,
    updatedAt: 12,
  };
  const l1d = {
    id: 'l1_p0_delta',
    layer: 'l1',
    summary: '与上面无关的桌面工具记录。',
    topics: ['desktop'],
    importance: 4,
    updatedAt: 13,
  };
  await fs.writeFile(path.join(dir, 'l1.json'), JSON.stringify([l1d]), 'utf8');
  await fs.writeFile(path.join(dir, 'l2.json'), JSON.stringify([l2a, l2b]), 'utf8');
  await fs.writeFile(path.join(dir, 'l3.json'), JSON.stringify([l3c]), 'utf8');
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: dir });
  const graph = new NeuronGraph(config.graphDir, config);
  return { dir, config, graph, l2a, l2b, l3c, l1d };
}

test('P0 graph builds a bipartite memory/entity index without copying canonical text', async () => {
  const { dir, graph, l2a } = await seed();
  const before = createHash('sha256').update(await fs.readFile(path.join(dir, 'l2.json'))).digest('hex');
  const records = await readHoloRecords(dir);
  assert.equal(records.length, 4);
  const result = await graph.ingest(records);
  assert.equal(result.memoryNodes, 4);
  assert.ok(result.entityNodes >= 5);
  assert.ok(result.edges >= 7);
  const after = createHash('sha256').update(await fs.readFile(path.join(dir, 'l2.json'))).digest('hex');
  assert.equal(after, before, 'holo source is read-only');

  const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'graph', 'graph.json'), 'utf8'));
  const memory = snapshot.nodes.find((node) => node.holoId === l2a.id);
  assert.ok(memory);
  assert.equal(memory.label, l2a.text);
  assert.ok(!('text' in memory), 'graph node stores refs/labels, not canonical body');
  assert.ok(snapshot.nodes.some((node) => node.kind === 'entity' && node.label === 'm1'));
  assert.ok(snapshot.edges.every((edge) => edge.kind === 'mentions'));
  await fs.rm(dir, { recursive: true, force: true });
});

test('spreading activation reaches related memories through shared entities', async () => {
  const { dir, graph, l2a, l1d } = await seed();
  await graph.ingest(await readHoloRecords(dir));
  const result = await graph.expand({ seedIds: [l2a.id], depth: 2, topK: 8 });
  const ids = result.hits.map((hit) => hit.holoId);
  assert.ok(ids.includes('l2_p0_beta'), 'M1 bridge reaches beta');
  assert.ok(ids.includes('l3_p0_gamma'), 'moss-image bridge reaches gamma');
  assert.ok(!ids.includes(l2a.id), 'seed excluded by default');
  assert.ok(!ids.includes(l1d.id), 'unrelated node is not activated');
  assert.ok(result.hits[0].activation >= result.hits[1].activation);
  assert.ok(result.hits[0].path.length >= 2);

  const query = await graph.expand({ query: 'ComfyUI', excludeSeed: false });
  assert.ok(query.hits.some((hit) => hit.holoId === 'l2_p0_beta'));
  const stats = await graph.stats();
  assert.equal(stats.memoryNodes, 4);
  assert.ok(stats.averageDegree > 0);
  await fs.rm(dir, { recursive: true, force: true });
});

test('feedback strengthens cited edges and decays injected-but-uncited edges', async () => {
  const { dir, graph, l2a } = await seed();
  await graph.ingest(await readHoloRecords(dir));
  const snapshotBefore = JSON.parse(await fs.readFile(path.join(dir, 'graph', 'graph.json'), 'utf8'));
  const before = new Map(snapshotBefore.edges.map((edge) => [edge.id, edge.weight]));
  const result = await graph.applyFeedback([l2a.id], [l2a.id]);
  assert.ok(result.strengthened > 0);
  const snapshotAfter = JSON.parse(await fs.readFile(path.join(dir, 'graph', 'graph.json'), 'utf8'));
  const changed = snapshotAfter.edges.find((edge) => before.get(edge.id) !== edge.weight);
  assert.ok(changed, 'at least one edge weight changed');
  assert.ok(changed.fireCount >= 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('incremental sync adds, removes, and cascades orphans', async () => {
  const { dir, graph, l2a, l2b, l3c, l1d } = await seed();
  const base = await readHoloRecords(dir);
  await graph.ingest(base);
  const added = {
    id: 'l2_p0_epsilon',
    layer: 'l2',
    text: 'MOSS 和 M1 的新记录。',
    tags: ['MOSS', 'M1'],
    importance: 7,
    updatedAt: 20,
  };
  const addResult = await graph.ingest([...base, added]);
  assert.equal(addResult.added, 1);
  assert.equal(addResult.memoryNodes, 5);

  const removeResult = await graph.ingest([l2b, added, l1d]);
  assert.equal(removeResult.removed, 2, 'l2a and l3c removed');
  assert.equal(removeResult.entityNodes, 4);
  assert.equal(removeResult.memoryNodes, 3);
  const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'graph', 'graph.json'), 'utf8'));
  assert.ok(snapshot.nodes.filter((node) => node.kind === 'entity').every((node) => node.degree > 0));
  assert.ok(!snapshot.nodes.some((node) => node.kind === 'entity' && node.label === 'lora'));
  await fs.rm(dir, { recursive: true, force: true });
});

test('degree pruning caps hub fan-out', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-prune-'));
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: dir, maxDegree: 3 });
  const graph = new NeuronGraph(config.graphDir, config);
  const records = Array.from({ length: 12 }, (_, index) => ({
    id: `l2_prune_${index}`,
    layer: 'l2',
    text: `hub record ${index}`,
    tags: ['shared-hub'],
    importance: 5,
    updatedAt: index,
  }));
  const result = await graph.ingest(records, { rebuild: true });
  assert.equal(result.memoryNodes, 12);
  assert.equal(result.edges, 3);
  assert.ok(result.prunedEdges >= 9);
  const stats = await graph.stats();
  assert.ok(stats.averageDegree <= 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('concurrent syncs serialize writes and do not race graph temp files', async () => {
  const { dir, graph, l2a, l2b, l3c, l1d } = await seed();
  const base = await readHoloRecords(dir);
  await graph.ingest(base);
  await Promise.all(Array.from({ length: 8 }, () => graph.ingest(base)));
  const stats = await graph.stats();
  assert.equal(stats.memoryNodes, 4);
  const snapshot = JSON.parse(await fs.readFile(path.join(dir, 'graph', 'graph.json'), 'utf8'));
  assert.equal(snapshot.nodes.filter((node) => node.kind === 'memory').length, 4);
  const leftovers = (await fs.readdir(path.join(dir, 'graph'))).filter((name) => name.endsWith('.tmp'));
  assert.deepEqual(leftovers, []);
  await fs.rm(dir, { recursive: true, force: true });
});

test('query-seeded expansion is filtered to the requested project and query topic', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-scope-'));
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: dir });
  const graph = new NeuronGraph(config.graphDir, config);
  const records = [
    {
      id: 'l2_scope_a',
      layer: 'l2',
      text: 'alpha 部署在 Windows 上。',
      tags: ['alpha', 'shared'],
      projectKey: 'project-a',
      importance: 7,
      updatedAt: 1,
    },
    {
      id: 'l2_scope_b',
      layer: 'l2',
      text: 'beta 的内容。',
      tags: ['beta', 'shared'],
      projectKey: 'project-b',
      importance: 7,
      updatedAt: 2,
    },
    {
      id: 'l2_scope_user',
      layer: 'l2',
      text: 'alpha 是全局偏好。',
      tags: ['alpha', 'user'],
      projectKey: '',
      importance: 8,
      updatedAt: 3,
    },
  ];
  await graph.ingest(records, { rebuild: true });
  const result = await graph.expand({ query: 'alpha', projectKey: 'project-a', excludeSeed: false });
  const ids = result.hits.map((hit) => hit.holoId);
  assert.ok(ids.includes('l2_scope_a'));
  assert.ok(ids.includes('l2_scope_user'), 'user-scoped records remain visible');
  assert.ok(!ids.includes('l2_scope_b'), 'other project is filtered');

  const broad = await graph.expand({
    query: 'alpha',
    excludeSeed: false,
    requireQueryOverlap: false,
    minSignal: 0.001,
    depth: 3,
  });
  assert.ok(broad.hits.some((hit) => hit.holoId === 'l2_scope_b'), 'project/topic filters are opt-out');
  await fs.rm(dir, { recursive: true, force: true });
});

test('query overlap drops an associative bridge that shares only generic structure', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neuron-overlap-'));
  const config = normalizeConfig({ graphDir: path.join(dir, 'graph'), holoStoreDir: dir });
  const graph = new NeuronGraph(config.graphDir, config);
  await graph.ingest(
    [
      { id: 'l2_overlap_a', layer: 'l2', text: 'alpha 记录', tags: ['alpha', 'shared'], importance: 7, updatedAt: 1 },
      { id: 'l2_overlap_b', layer: 'l2', text: 'beta 记录', tags: ['beta', 'shared'], importance: 7, updatedAt: 2 },
    ],
    { rebuild: true },
  );
  const result = await graph.expand({ query: 'alpha', excludeSeed: false });
  const ids = result.hits.map((hit) => hit.holoId);
  assert.deepEqual(ids, ['l2_overlap_a']);
  await fs.rm(dir, { recursive: true, force: true });
});

test('config normalizes booleans and clamps unsafe numeric values', async () => {
  const config = normalizeConfig({
    requireQueryOverlap: false,
    defaultDepth: 99,
    damping: -1,
    topK: 0,
    maxDegree: 0,
    maxSeedEntities: 999,
  });
  assert.equal(config.requireQueryOverlap, false);
  assert.equal(config.defaultDepth, 3);
  assert.equal(config.damping, 0.1);
  assert.equal(config.topK, 1);
  assert.equal(config.maxDegree, 1);
  assert.equal(config.maxSeedEntities, 32);
});

test('plugin registers P0 tools and provides neuronMemory service', async () => {
  const { dir, config } = await seed();
  const registered = [];
  const service = {};
  const ctx = {
    tools: { register(tool) { registered.push(tool); } },
    provide(name, value) { service[name] = value; return () => {}; },
  };
  apply(ctx, { graphDir: config.graphDir, holoStoreDir: config.holoStoreDir });
  assert.deepEqual(registered.map((tool) => tool.name).sort(), ['neuron_expand', 'neuron_ingest', 'neuron_stats']);
  assert.equal(typeof service.neuronMemory.expand, 'function');
  const ingest = await service.neuronMemory.ingest({ rebuild: true });
  assert.equal(ingest.memoryNodes, 4);
  await fs.rm(dir, { recursive: true, force: true });
});
