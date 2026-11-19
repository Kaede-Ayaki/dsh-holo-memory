/**
 * P0 associative index. Canonical text stays in dsh-holo-memory; this graph
 * stores only memory refs, entity nodes, and weighted mention edges.
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { NeuronConfig } from './config.js';
import type {
  EntityNode,
  ExpandRequest,
  ExpandResult,
  ExpansionHit,
  GraphEdge,
  GraphNode,
  GraphSnapshot,
  GraphStats,
  HoloRecord,
  IngestResult,
  Layer,
  MemoryNode,
  NeuronSummary,
} from './types.js';

const GRAPH_FILE = 'graph.json';
const POSITIVE = 1e-9;

/**
 * Universal bridge words. They are useful inside a memory, but as activation
 * seeds they light up unrelated corners of the graph ("2d", "1girl", "提示词").
 */
const GENERIC_SEED_LABELS = new Set([
  '---', '1girl', '2d', '改为', 'thinking', 'summary', 'tag', 'json', 'm1',
  'pov', 'solo', '新的', '可以', '什么', '这个', '那个', '项目', '用户',
  '任务', '问题', '内容', '状态', '版本', '当前', '记忆', '对话', '提示词',
  '主人令', '硬规则', '规则', 'the', 'and', 'for', 'with', 'that', 'this',
  'https', 'http', 'www', 'com', 'org', 'cn', 'zh', 'api', 'docs', 'guides',
]);

function hash(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

function normalizeEntity(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^[#@]+/, '')
    .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48);
}

function tokensOf(text: string): string[] {
  const lower = text.normalize('NFKC').toLowerCase();
  const latin = lower.match(/[a-z0-9_\-]{2,}/g) ?? [];
  const cjkRuns = lower.match(/[\u3400-\u9fff]{2,}/g) ?? [];
  const cjk = new Set<string>();
  for (const run of cjkRuns) {
    if (run.length <= 4) cjk.add(run);
    for (let size = 2; size <= 3; size += 1) {
      for (let i = 0; i + size <= run.length; i += 1) cjk.add(run.slice(i, i + size));
    }
  }
  return [...new Set([...latin, ...cjk])].filter((token) => token.length >= 2).slice(0, 40);
}

function labelOf(record: HoloRecord): string {
  const raw = record.title ?? record.summary ?? record.text ?? record.hologram ?? record.id;
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, 120);
}

function tagsOf(record: HoloRecord, maxTags: number): string[] {
  const raw = [
    ...(record.tags ?? []),
    ...(record.topics ?? []),
    ...(record.themes ?? []),
    ...(record.entities ?? []),
  ];
  if (raw.length === 0) raw.push(...tokensOf(labelOf(record)).slice(0, 6));
  const generic = new Set(['fact', 'decision', 'preference', 'entity', 'task', 'correction', 'reference', 'project', 'user', 'l1', 'l2', 'l3']);
  return [...new Set(raw.map((tag) => normalizeEntity(String(tag))).filter((tag) => tag.length >= 2 && !generic.has(tag)))].slice(
    0,
    maxTags,
  );
}

function memoryIdFor(holoId: string): string {
  return `m_${hash(holoId)}`;
}

function memoryFor(record: HoloRecord, maxTags: number): MemoryNode {
  return {
    id: memoryIdFor(record.id),
    kind: 'memory',
    holoId: record.id,
    layer: record.layer,
    label: labelOf(record),
    tags: tagsOf(record, maxTags),
    importance: typeof record.importance === 'number' ? record.importance : 5,
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
    projectKey: typeof record.projectKey === 'string' ? record.projectKey : '',
  };
}

function entityIdFor(label: string): string {
  return `e_${hash(label)}`;
}

function edgeIdFor(from: string, to: string): string {
  return `x_${hash(`${from}|${to}`)}`;
}

function emptyGraph(): GraphSnapshot {
  return { version: 1, updatedAt: Date.now(), nodes: [], edges: [] };
}

function normalizeQueryText(query: string): string {
  // URLs otherwise contribute "https", "com", "id" and make unrelated labels
  // look like topic matches.
  return query.replace(/https?:\/\/\S+/gi, ' ').replace(/\s+/g, ' ').trim();
}

function salientQueryTerms(query: string): string[] {
  return tokensOf(normalizeQueryText(query)).filter(
    (token) =>
      (token.length >= 3 || /^[a-z0-9]{3,}$/i.test(token)) &&
      !GENERIC_SEED_LABELS.has(token),
  );
}

export class NeuronGraph {
  readonly dir: string;
  readonly config: NeuronConfig;
  private snapshot: GraphSnapshot = emptyGraph();
  private loaded = false;
  /** Serialize graph mutations; sync can be triggered from many sessions. */
  private mutation: Promise<void> = Promise.resolve();
  /** Serialize atomic writes; the old fixed .tmp name could collide. */
  private writeChain: Promise<void> = Promise.resolve();

  constructor(dir: string, config: NeuronConfig) {
    this.dir = path.resolve(dir);
    this.config = config;
  }

  private file(): string {
    return path.join(this.dir, GRAPH_FILE);
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const parsed = JSON.parse(await fs.readFile(this.file(), 'utf8')) as GraphSnapshot;
      if (parsed?.version === 1 && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        this.snapshot = parsed;
      }
    } catch {
      this.snapshot = emptyGraph();
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    this.snapshot.updatedAt = Date.now();
    const payload = `${JSON.stringify(this.snapshot)}\n`;
    const write = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
        // A unique temp name per write: parallel syncs must not rename each
        // other's file (the crash was ENOENT on a shared graph.json.tmp).
        const tmp = `${this.file()}.${process.pid}.${randomUUID()}.tmp`;
        try {
          await fs.writeFile(tmp, payload, { encoding: 'utf8', mode: 0o600 });
          await fs.rename(tmp, this.file());
        } catch (error) {
          await fs.rm(tmp, { force: true }).catch(() => undefined);
          throw error;
        }
      });
    this.writeChain = write.then(
      () => undefined,
      () => undefined,
    );
    return write;
  }

  private async mutate<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.mutation.catch(() => undefined).then(fn);
    this.mutation = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async stats(): Promise<GraphStats> {
    await this.load();
    const memoryNodes = this.snapshot.nodes.filter((node) => node.kind === 'memory').length;
    const entityNodes = this.snapshot.nodes.filter((node) => node.kind === 'entity').length;
    return {
      memoryNodes,
      entityNodes,
      edges: this.snapshot.edges.length,
      averageDegree: memoryNodes === 0 ? 0 : Math.round((this.snapshot.edges.length / memoryNodes) * 10) / 10,
      updatedAt: this.snapshot.updatedAt,
    };
  }

  async summary(limit = 12): Promise<NeuronSummary> {
    await this.load();
    const memory = this.snapshot.nodes.filter((node): node is MemoryNode => node.kind === 'memory');
    const entities = this.snapshot.nodes.filter((node): node is EntityNode => node.kind === 'entity');
    const byLayer = { l1: 0, l2: 0, l3: 0 };
    for (const node of memory) byLayer[node.layer] += 1;
    return {
      stats: await this.stats(),
      byLayer,
      topEntities: [...entities]
        .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label))
        .slice(0, Math.max(1, Math.min(50, limit)))
        .map((node) => ({ label: node.label, degree: node.degree })),
      maxDegree: entities.reduce((max, node) => Math.max(max, node.degree), 0),
      sampleMemories: memory.slice(0, 8).map((node) => ({ holoId: node.holoId, layer: node.layer, label: node.label })),
    };
  }

  /** Incremental sync: add/update/remove only what changed, then prune hubs. */
  private async incremental(records: HoloRecord[]): Promise<IngestResult> {
    const incoming = new Map<string, MemoryNode>();
    for (const record of records) incoming.set(record.id, memoryFor(record, this.config.maxTagsPerRecord));

    const existingHolo = new Map<string, MemoryNode>();
    const nodeMap = new Map<string, GraphNode>();
    for (const node of this.snapshot.nodes) {
      nodeMap.set(node.id, node);
      if (node.kind === 'memory') existingHolo.set(node.holoId, node);
    }
    const edgeMap = new Map(this.snapshot.edges.map((edge) => [edge.id, edge]));

    let added = 0;
    let updated = 0;
    let removed = 0;
    const dirty = new Set<string>();
    for (const [holoId, old] of existingHolo) {
      if (incoming.has(holoId)) continue;
      removed += 1;
      dirty.add(old.id);
      nodeMap.delete(old.id);
    }
    for (const [holoId, memory] of incoming) {
      const old = existingHolo.get(holoId);
      if (!old) {
        added += 1;
        dirty.add(memory.id);
      } else {
        const changed =
          old.label !== memory.label ||
          old.layer !== memory.layer ||
          old.importance !== memory.importance ||
          old.updatedAt !== memory.updatedAt ||
          old.projectKey !== memory.projectKey ||
          old.tags.join('\u0000') !== memory.tags.join('\u0000');
        if (changed) {
          updated += 1;
          dirty.add(memory.id);
        }
      }
      nodeMap.set(memory.id, memory);
    }

    // Remove edges touching removed/changed memory nodes, then re-add changed ones.
    for (const [id, edge] of edgeMap) {
      if (dirty.has(edge.from) || dirty.has(edge.to)) edgeMap.delete(id);
    }
    const entityNodes = new Map<string, EntityNode>();
    for (const node of nodeMap.values()) if (node.kind === 'entity') entityNodes.set(node.id, node);
    for (const id of dirty) {
      const memory = nodeMap.get(id);
      if (!memory || memory.kind !== 'memory') continue;
      for (const tag of memory.tags) {
        const entityId = entityIdFor(tag);
        if (!entityNodes.has(entityId)) entityNodes.set(entityId, { id: entityId, kind: 'entity', label: tag, degree: 0 });
        edgeMap.set(edgeIdFor(memory.id, entityId), {
          id: edgeIdFor(memory.id, entityId),
          from: memory.id,
          to: entityId,
          kind: 'mentions',
          weight: Math.round((0.55 + Math.min(0.4, Math.max(0, memory.importance) / 25)) * 10000) / 10000,
          fireCount: 0,
        });
      }
    }

    // Prune entities above maxDegree, keeping the strongest edges.
    let prunedEdges = 0;
    const byEntity = new Map<string, GraphEdge[]>();
    for (const edge of edgeMap.values()) {
      const list = byEntity.get(edge.to) ?? [];
      list.push(edge);
      byEntity.set(edge.to, list);
    }
    for (const [entityId, list] of byEntity) {
      if (list.length <= this.config.maxDegree) continue;
      list.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
      for (const edge of list.slice(this.config.maxDegree)) {
        edgeMap.delete(edge.id);
        prunedEdges += 1;
      }
    }
    if (edgeMap.size > this.config.maxEdges) {
      const ranked = [...edgeMap.values()].sort((a, b) => b.weight - a.weight);
      for (const edge of ranked.slice(this.config.maxEdges)) {
        edgeMap.delete(edge.id);
        prunedEdges += 1;
      }
    }

    // Recompute degree and remove orphan entities.
    for (const entity of entityNodes.values()) entity.degree = 0;
    for (const edge of edgeMap.values()) {
      const entity = entityNodes.get(edge.to);
      if (entity) entity.degree += 1;
    }
    for (const [id, entity] of entityNodes) {
      if (entity.degree === 0) entityNodes.delete(id);
    }

    let memoryNodes = [...nodeMap.values()].filter((node): node is MemoryNode => node.kind === 'memory');
    if (memoryNodes.length + entityNodes.size > this.config.maxNodes) {
      const keep = new Set(
        memoryNodes
          .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)
          .slice(0, Math.max(1, this.config.maxNodes - entityNodes.size))
          .map((node) => node.id),
      );
      for (const id of [...nodeMap.keys()]) if (id.startsWith('m_') && !keep.has(id)) nodeMap.delete(id);
      memoryNodes = memoryNodes.filter((node) => keep.has(node.id));
      for (const [id, edge] of edgeMap) if (!keep.has(edge.from)) edgeMap.delete(id);
    }
    // Dropping memories above maxNodes can orphan entities; recompute degrees
    // and remove those nodes so stats/seed quality do not decay over time.
    for (const entity of entityNodes.values()) entity.degree = 0;
    for (const edge of edgeMap.values()) {
      const entity = entityNodes.get(edge.to);
      if (entity) entity.degree += 1;
    }
    for (const [id, entity] of entityNodes) {
      if (entity.degree === 0) entityNodes.delete(id);
    }

    this.snapshot = {
      version: 1,
      updatedAt: Date.now(),
      nodes: [...memoryNodes, ...entityNodes.values()],
      edges: [...edgeMap.values()],
    };
    await this.save();
    return {
      memoryNodes: memoryNodes.length,
      entityNodes: entityNodes.size,
      edges: this.snapshot.edges.length,
      added,
      updated,
      removed,
      prunedEdges,
    };
  }

  async ingest(records: HoloRecord[], options: { rebuild?: boolean } = {}): Promise<IngestResult> {
    return this.mutate(async () => {
      await this.load();
      if (options.rebuild) this.snapshot = emptyGraph();
      return this.incremental(records);
    });
  }

  private seedScores(request: ExpandRequest): {
    scores: Map<string, number>;
    seeds: string[];
    seedLabels: string[];
    seedNodeIds: string[];
  } {
    const memoryNodes = this.snapshot.nodes.filter((node): node is MemoryNode => node.kind === 'memory');
    const byHoloId = new Map(memoryNodes.map((node) => [node.holoId, node]));
    const scores = new Map<string, number>();
    const seeds: string[] = [];
    const seedLabels: string[] = [];
    const seedNodeIds: string[] = [];

    for (const raw of request.seedIds ?? []) {
      const key = String(raw).trim();
      const match =
        byHoloId.get(key) ?? memoryNodes.find((node) => node.holoId.endsWith(key));
      if (match && !scores.has(match.id)) {
        scores.set(match.id, 1);
        seeds.push(match.holoId);
        seedLabels.push(match.label);
        seedNodeIds.push(match.id);
      }
    }

    const query = normalizeQueryText(request.query ?? '');
    if (query.length > 0) {
      // Seed from entity nodes only. Seeding from every memory label made
      // common Chinese n-grams ("什么", "这个", "默认") light up half the graph.
      const queryLower = query.toLowerCase();
      const tokens = salientQueryTerms(query);
      const candidates = this.snapshot.nodes.filter((node) => {
        if (node.kind !== 'entity') return false;
        if (node.label.length < 3) return false;
        if (GENERIC_SEED_LABELS.has(node.label)) return false;
        if (queryLower.includes(node.label)) return true;
        return tokens.some((token) => node.label.includes(token) || token.includes(node.label));
      });
      for (const node of candidates.slice(0, this.config.maxSeedEntities)) {
        if (!scores.has(node.id)) {
          scores.set(node.id, 0.5);
          seedLabels.push(`entity:${node.label}`);
        }
      }
    }
    return { scores, seeds, seedLabels, seedNodeIds };
  }

  async applyFeedback(injectedIds: readonly string[], citedIds: readonly string[]): Promise<{ strengthened: number; decayed: number }> {
    return this.mutate(() => this.applyFeedbackUnlocked(injectedIds, citedIds));
  }

  private async applyFeedbackUnlocked(
    injectedIds: readonly string[],
    citedIds: readonly string[],
  ): Promise<{ strengthened: number; decayed: number }> {
    await this.load();
    const cited = new Set(citedIds);
    const injected = new Set(injectedIds);
    const memoryById = new Map(
      this.snapshot.nodes.filter((node): node is MemoryNode => node.kind === 'memory').map((node) => [node.id, node]),
    );
    const touchedMemoryIds = new Set(
      [...memoryById.values()].filter((node) => injected.has(node.holoId)).map((node) => node.id),
    );
    if (touchedMemoryIds.size === 0) return { strengthened: 0, decayed: 0 };
    let strengthened = 0;
    let decayed = 0;
    for (const edge of this.snapshot.edges) {
      const from = memoryById.get(edge.from);
      if (!from || !touchedMemoryIds.has(from.id)) continue;
      const citedEdge = cited.has(from.holoId);
      if (citedEdge) {
        edge.weight = Math.min(1, edge.weight + 0.02);
        edge.fireCount += 1;
        strengthened += 1;
      } else {
        edge.weight = Math.max(0.02, edge.weight * 0.997);
        decayed += 1;
      }
    }
    if (strengthened + decayed > 0) await this.save();
    return { strengthened, decayed };
  }

  async expand(request: ExpandRequest = {}): Promise<ExpandResult> {
    await this.load();
    const depth = Math.max(1, Math.min(3, Math.floor(request.depth ?? this.config.defaultDepth)));
    const damping = Math.max(0.1, Math.min(0.95, request.damping ?? this.config.damping));
    const minSignal = Math.max(0, request.minSignal ?? this.config.minSignal);
    const topK = Math.max(1, Math.min(30, Math.floor(request.topK ?? this.config.topK)));
    const { scores, seeds, seedLabels, seedNodeIds } = this.seedScores(request);
    const projectKey = (request.projectKey ?? '').trim();
    const requireOverlap =
      request.requireQueryOverlap ?? this.config.requireQueryOverlap;
    const overlapTerms = salientQueryTerms(request.query ?? '');
    const mustOverlap = requireOverlap && overlapTerms.length > 0 && (request.seedIds ?? []).length === 0;

    const nodeById = new Map(this.snapshot.nodes.map((node) => [node.id, node]));
    const adjacency = new Map<string, Array<{ to: string; weight: number }>>();
    for (const edge of this.snapshot.edges) {
      const fromNode = nodeById.get(edge.from);
      const toNode = nodeById.get(edge.to);
      const entityNode = fromNode?.kind === 'entity' ? fromNode : toNode?.kind === 'entity' ? toNode : undefined;
      const hubFactor = entityNode ? 1 / Math.sqrt(Math.max(1, entityNode.degree)) : 1;
      const weight = edge.weight * hubFactor;
      const a = adjacency.get(edge.from) ?? [];
      a.push({ to: edge.to, weight });
      adjacency.set(edge.from, a);
      const b = adjacency.get(edge.to) ?? [];
      b.push({ to: edge.from, weight });
      adjacency.set(edge.to, b);
    }

    const parent = new Map<string, string>();
    let frontier = new Map(scores);
    let visited = frontier.size;
    for (let step = 0; step < depth; step += 1) {
      const next = new Map<string, number>();
      for (const [nodeId, signal] of frontier) {
        for (const neighbor of adjacency.get(nodeId) ?? []) {
          const nextSignal = signal * damping * neighbor.weight;
          if (nextSignal < minSignal) continue;
          const old = scores.get(neighbor.to) ?? 0;
          if (nextSignal <= old + POSITIVE) continue;
          scores.set(neighbor.to, nextSignal);
          parent.set(neighbor.to, nodeId);
          next.set(neighbor.to, nextSignal);
          visited += 1;
        }
      }
      if (next.size === 0) break;
      frontier = next;
    }

    const seedSet = new Set(seedNodeIds);
    const excludeSeed = request.excludeSeed ?? ((request.seedIds ?? []).length > 0);
    const hits: ExpansionHit[] = [];
    for (const node of this.snapshot.nodes) {
      if (node.kind !== 'memory') continue;
      if (projectKey && node.projectKey !== undefined && node.projectKey !== '' && node.projectKey !== projectKey) continue;
      if (mustOverlap) {
        const haystack = `${node.label} ${node.tags.join(' ')}`.toLowerCase();
        if (!overlapTerms.some((term) => haystack.includes(term))) continue;
      }
      if (excludeSeed && seedSet.has(node.id)) continue;
      const activation = scores.get(node.id);
      if (!activation || activation < minSignal) continue;
      const pathNodes: string[] = [];
      let cursor: string | undefined = node.id;
      const guard = new Set<string>();
      while (cursor && !guard.has(cursor)) {
        guard.add(cursor);
        pathNodes.unshift(nodeById.get(cursor)?.kind === 'entity' ? `entity:${(nodeById.get(cursor) as EntityNode).label}` : cursor);
        cursor = parent.get(cursor);
      }
      hits.push({
        holoId: node.holoId,
        layer: node.layer,
        label: node.label,
        activation: Math.round(activation * 10000) / 10000,
        path: pathNodes,
      });
    }
    hits.sort((a, b) => b.activation - a.activation);
    return {
      query: request.query ?? '',
      seeds,
      seedLabels,
      hits: hits.slice(0, topK),
      depth,
      damping,
      nodesVisited: visited,
    };
  }
}

export async function readHoloRecords(dir: string): Promise<HoloRecord[]> {
  const records: HoloRecord[] = [];
  for (const layer of ['l1', 'l2', 'l3'] as Layer[]) {
    try {
      const parsed = JSON.parse(await fs.readFile(path.join(dir, `${layer}.json`), 'utf8')) as HoloRecord[];
      if (Array.isArray(parsed)) records.push(...parsed.filter((item) => item && item.id && item.layer === layer));
    } catch {
      // Missing layer is allowed.
    }
  }
  return records;
}
