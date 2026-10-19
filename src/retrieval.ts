/**
 * Hybrid recall: BM25 lexical scoring plus optional embedding cosine,
 * merged into one per-layer ranking and rendered under a hard character budget.
 */
import type { HoloConfig } from './config.js';
import type { AnyRecord, L1Record, L2Record, L3Record, Layer } from './types.js';
import type { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
import { cosine } from './embeddings.js';
import { Bm25Index, tokenize } from './lexical.js';
import { redactSecrets } from './sanitize.js';
import { localDate } from './time.js';

export interface RecallItem {
  record: AnyRecord;
  layer: Layer;
  score: number;
  lexical: number;
  vector: number;
}

export interface RecallResult {
  text: string;
  items: RecallItem[];
}

function textOf(record: AnyRecord): string {
  if (record.layer === 'l1') {
    return `${record.summary}\n${record.topics.join(' ')}\n${record.intent ?? ''}\n${record.outcome ?? ''}`;
  }
  if (record.layer === 'l2') return `${record.text}\n${record.tags.join(' ')} ${record.kind}`;
  return `${record.title}\n${record.hologram}\n${record.themes.join(' ')}\n${record.entities.join(' ')}`;
}

function ageDays(record: AnyRecord): number {
  return Math.max(0, (Date.now() - record.createdAt) / 86_400_000);
}

function recencyBoost(record: AnyRecord): number {
  return Math.exp(-ageDays(record) / 45);
}

function importanceNorm(record: AnyRecord): number {
  return Math.max(0, Math.min(1, (record.importance || 5) / 10));
}

function lineFor(item: RecallItem): string {
  const record = item.record;
  const id = record.id.slice(-8);
  if (record.layer === 'l3') {
    const l3 = record as L3Record;
    const loops = l3.openLoops.length > 0 ? ` | 待续: ${redactSecrets(l3.openLoops.slice(0, 3).join('；'))}` : '';
    return `- [L3] ${redactSecrets(l3.title)}: ${redactSecrets(l3.hologram)}${loops}`;
  }
  if (record.layer === 'l2') {
    const l2 = record as L2Record;
    const tags = l2.tags.length > 0 ? ` [${redactSecrets(l2.tags.slice(0, 4).join(','))}]` : '';
    return `- [L2] ${redactSecrets(l2.text)}${tags}`;
  }
  const l1 = record as L1Record;
  const date = localDate(l1.createdAt);
  return `- [L1 ${date}] ${redactSecrets(l1.summary)}`;
}

const LAYER_ORDER: Layer[] = ['l3', 'l2', 'l1'];
const LAYER_TITLE: Record<Layer, string> = {
  l3: 'L3 · 全息记忆（跨会话整体印象）',
  l2: 'L2 · 事实层（原子事实）',
  l1: 'L1 · 对话层（历史会话摘要）',
};

export interface RecallOptions {
  projectKey: string;
  currentSessionId?: string;
  maxChars: number;
  minScore: number;
  counts: { l1: number; l2: number; l3: number };
  signal?: AbortSignal;
}

/**
 * Retrieve and render relevant memory. Returns null when nothing clears the
 * threshold, so quiet sessions receive no injected tokens at all.
 */
export async function recall(
  store: HoloStore,
  embedder: EmbeddingClient,
  config: HoloConfig,
  query: string,
  options: RecallOptions,
): Promise<RecallResult | null> {
  await store.whenReady();
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 4) return null;
  const queryTokens = tokenize(trimmedQuery);
  if (queryTokens.length === 0) return null;

  const queryVector = await embedder.query(trimmedQuery, options.signal, config.queryEmbeddingTimeoutMs);
  const useVectors = embedder.enabled && queryVector !== null;
  const items: RecallItem[] = [];

  for (const layer of LAYER_ORDER) {
    const candidates = store.visible(layer, options.projectKey).filter((record) => {
      if (layer === 'l2' && (record as L2Record).supersededBy) return false;
      return true;
    });
    if (candidates.length === 0) continue;

    const index = new Bm25Index(candidates.map((record) => ({ id: record.id, tokens: tokenize(textOf(record)) })));
    const lexical = index.normalized(queryTokens);

    const scored: RecallItem[] = [];
    const baseline = Math.max(0, Math.min(0.9, config.embeddingBaseline));
    const span = Math.max(0.1, 1 - baseline);
    for (const record of candidates) {
      const lex = lexical.get(record.id) ?? 0;
      // Dialogue summaries are keyword-anchored: without direct term overlap a
      // summary is usually the wrong context, even when the embedding is close.
      if (layer === 'l1' && lex < 0.2) continue;
      const hasVector =
        useVectors && Array.isArray(record.embedding) && record.embedding.length > 0 && record.embeddingModel === config.embeddingModel;
      const rawVec = hasVector && queryVector !== null ? Math.max(0, cosine(queryVector, record.embedding!)) : 0;
      // Qwen/e5-style embeddings have a high similarity floor even for
      // unrelated text. Subtract the model's baseline so the vector channel
      // measures relevance above noise instead of raw cosine.
      const vec = hasVector ? Math.max(0, (rawVec - baseline) / span) : 0;
      const base = hasVector
        ? 0.62 * vec + 0.28 * lex + 0.10 * importanceNorm(record)
        : 0.80 * lex + 0.20 * importanceNorm(record);
      // Threshold the relevance portion only: importance must not let an
      // unrelated memory clear the bar on its own.
      const relevance = hasVector ? 0.62 * vec + 0.28 * lex : 0.80 * lex;
      if (relevance < options.minScore) continue;
      const score = base + (layer === 'l1' ? 0.04 * recencyBoost(record) : 0.02 * recencyBoost(record));
      scored.push({ record, layer, score, lexical: lex, vector: rawVec });
    }
    scored.sort((a, b) => b.score - a.score);
    const quota = options.counts[layer] ?? 0;
    items.push(...scored.slice(0, Math.max(0, quota)));
  }

  if (items.length === 0) return null;

  const byLayer = new Map<Layer, RecallItem[]>();
  for (const item of items) {
    const list = byLayer.get(item.layer) ?? [];
    list.push(item);
    byLayer.set(item.layer, list);
  }

  const header =
    '[长期记忆自动召回 | holo-memory]\n' +
    '以下是与当前请求可能相关的三层长期记忆。把它当作背景事实；若与当前代码/对话冲突，以现况为准。\n';
  const trailer =
    '\n（需要更多用 memory_recall(query, layers)；主动保存用 memory_note；纠错用 memory_forget(id)。）';

  const lines: string[] = [];
  const lineScores: number[] = [];
  for (const layer of LAYER_ORDER) {
    const group = byLayer.get(layer);
    if (!group || group.length === 0) continue;
    lines.push(`\n${LAYER_TITLE[layer]}`);
    lineScores.push(Number.POSITIVE_INFINITY);
    for (const item of group) {
      lines.push(lineFor(item));
      lineScores.push(item.score);
    }
  }

  let budget = Math.max(200, options.maxChars) - header.length - trailer.length;
  const keep = lines.map(() => true);
  let used = lines.reduce((sum, line) => sum + line.length, 0);
  while (used > budget) {
    let weakest = -1;
    let weakestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < lines.length; i++) {
      if (!keep[i]) continue;
      if (lineScores[i] < weakestScore) {
        weakestScore = lineScores[i];
        weakest = i;
      }
    }
    if (weakest < 0) break;
    keep[weakest] = false;
    used -= lines[weakest].length;
  }
  const body = lines.filter((_line, i) => keep[i]).join('\n').trimEnd();
  if (body.length === 0) return null;

  const text = `${header}${body}${trailer}`;
  return { text, items };
}

/**
 * Query-independent fallback used when the new prompt is too short to search
 * (for example "继续"): surface the most important L3 capsules plus the most
 * recent L1 summaries so the agent still wakes up with context.
 */
export async function recentFallback(
  store: HoloStore,
  projectKey: string,
  maxChars: number,
): Promise<string | null> {
  await store.whenReady();
  const l3 = store
    .visible('l3', projectKey)
    .filter((record): record is L3Record => record.layer === 'l3')
    .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)
    .slice(0, 3);
  const l1 = store
    .visible('l1', projectKey)
    .filter((record): record is L1Record => record.layer === 'l1')
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 2);
  if (l3.length === 0 && l1.length === 0) return null;
  const lines: string[] = ['[长期记忆自动召回 | holo-memory]'];
  if (l3.length > 0) {
    lines.push('', LAYER_TITLE.l3);
    for (const record of l3) lines.push(lineFor({ record, layer: 'l3', score: 0, lexical: 0, vector: 0 }));
  }
  if (l1.length > 0) {
    lines.push('', LAYER_TITLE.l1);
    for (const record of l1) lines.push(lineFor({ record, layer: 'l1', score: 0, lexical: 0, vector: 0 }));
  }
  lines.push('', '（需要更多用 memory_recall；这只是最近/最重要的背景。）');
  const text = lines.join('\n');
  return text.length > maxChars ? `${text.slice(0, Math.max(200, maxChars - 1))}…` : text;
}
