/** P0 graph types: a bipartite memory/entity graph, not a copy of canonical facts. */
export type NodeKind = 'memory' | 'entity';
export type Layer = 'l1' | 'l2' | 'l3';

export interface MemoryNode {
  id: string;
  kind: 'memory';
  /** Canonical record id in dsh-holo-memory. */
  holoId: string;
  layer: Layer;
  label: string;
  tags: string[];
  importance: number;
  updatedAt: number;
  /** holo project scope; '' means user-scoped/global. Optional for legacy graphs. */
  projectKey?: string;
}

export interface EntityNode {
  id: string;
  kind: 'entity';
  label: string;
  /** Number of linked memory nodes; maintained for pruning/debug. */
  degree: number;
}

export type GraphNode = MemoryNode | EntityNode;

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: 'mentions';
  weight: number;
  fireCount: number;
}

export interface GraphSnapshot {
  version: 1;
  updatedAt: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Minimal canonical record shape read from holo-memory JSON. */
export interface HoloRecord {
  id: string;
  layer: Layer;
  summary?: string;
  text?: string;
  title?: string;
  hologram?: string;
  intent?: string;
  outcome?: string;
  topics?: string[];
  tags?: string[];
  themes?: string[];
  entities?: string[];
  kind?: string;
  importance?: number;
  updatedAt?: number;
  /** holo project scope; '' means user-scoped/global. */
  projectKey?: string;
}

export interface IngestRequest {
  records: HoloRecord[];
  rebuild?: boolean;
}

export interface IngestResult {
  memoryNodes: number;
  entityNodes: number;
  edges: number;
  added: number;
  updated: number;
  removed: number;
  prunedEdges?: number;
}

export interface ExpandRequest {
  query?: string;
  /** Full holo ids or 8-char suffixes used as seeds. */
  seedIds?: string[];
  depth?: number;
  damping?: number;
  minSignal?: number;
  topK?: number;
  excludeSeed?: boolean;
  /** Only return memory nodes from this holo project ('' = user-scoped). */
  projectKey?: string;
  /**
   * Query-seeded expansions must share at least one salient query term with
   * the candidate label/tags. Explicit seedIds bypass this check.
   */
  requireQueryOverlap?: boolean;
}

export interface ExpansionHit {
  holoId: string;
  layer: Layer;
  label: string;
  activation: number;
  path: string[];
}

export interface ExpandResult {
  query: string;
  seeds: string[];
  seedLabels?: string[];
  hits: ExpansionHit[];
  depth: number;
  damping: number;
  nodesVisited: number;
}

export interface GraphStats {
  memoryNodes: number;
  entityNodes: number;
  edges: number;
  averageDegree: number;
  updatedAt: number;
}

export interface NeuronSummary {
  stats: GraphStats;
  byLayer: Record<Layer, number>;
  topEntities: Array<{ label: string; degree: number }>;
  maxDegree: number;
  sampleMemories: Array<{ holoId: string; layer: Layer; label: string }>;
}
