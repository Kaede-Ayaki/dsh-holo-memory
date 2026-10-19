/**
 * Host-side HTTP API for the in-DSH memory console.
 *
 * Routes (all same-origin, mounted before the SPA fallback):
 *   GET  /holo-memory/stats
 *   GET  /holo-memory/list?layer=l1|l2|l3|all&limit=N
 *   POST /holo-memory/delete   { id }   (requires x-holo-memory: 1)
 *
 * The API never exposes embedding vectors: the console only needs counts,
 * metadata and human-readable text.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { HoloConfig } from './config.js';
import type { AnyRecord, L1Record, L2Record, L3Record, Layer } from './types.js';
import { HoloStore } from './store.js';
import type { EmbeddingClient } from './embeddings.js';
import { redactSecrets } from './sanitize.js';
import { readInjections } from './injections.js';
import {
  hasEmbeddingKey,
  loadEmbeddingConfig,
  readEmbeddingKey,
  saveEmbeddingConfig,
} from './embedding-config.js';
import { probeEmbedding } from './embedding-probe.js';

const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

interface LoggerLike {
  warn(message: string): void;
}

export interface ConsoleDeps {
  store: HoloStore;
  embedder: EmbeddingClient;
  config: HoloConfig;
  logger: LoggerLike;
  /** Queue all records for re-embedding after the model changed. */
  onConfigSaved?: () => void;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function textOf(record: AnyRecord): string {
  if (record.layer === 'l1') {
    const l1 = record as L1Record;
    return l1.summary;
  }
  if (record.layer === 'l2') return (record as L2Record).text;
  const l3 = record as L3Record;
  return `${l3.title}\n${l3.hologram}`;
}

function titleOf(record: AnyRecord): string {
  if (record.layer === 'l3') return (record as L3Record).title;
  if (record.layer === 'l2') {
    const l2 = record as L2Record;
    return `[${l2.kind}] ${l2.text.slice(0, 60)}`;
  }
  return (record as L1Record).summary.slice(0, 60);
}

function publicRecord(record: AnyRecord): Record<string, unknown> {
  const common = {
    id: record.id,
    layer: record.layer,
    scope: record.scope,
    projectKey: record.projectKey,
    projectLabel: record.projectLabel,
    importance: record.importance,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    embedded: Array.isArray(record.embedding) && record.embedding.length > 0,
    embeddingModel: record.embeddingModel ?? '',
    accessCount: record.accessCount ?? 0,
    citedCount: record.citedCount ?? 0,
    lastAccessedAt: record.lastAccessedAt ?? 0,
    title: titleOf(record),
    text: redactSecrets(textOf(record)),
  };
  if (record.layer === 'l1') {
    const l1 = record as L1Record;
    return {
      ...common,
      sessionId: l1.sessionId,
      turn: l1.turn,
      cwd: l1.cwd,
      summary: redactSecrets(l1.summary),
      topics: l1.topics.map(redactSecrets),
      intent: l1.intent ? redactSecrets(l1.intent) : '',
      outcome: l1.outcome ? redactSecrets(l1.outcome) : '',
    };
  }
  if (record.layer === 'l2') {
    const l2 = record as L2Record;
    return {
      ...common,
      text: redactSecrets(l2.text),
      kind: l2.kind,
      tags: l2.tags.map(redactSecrets),
      confidence: l2.confidence,
      sourceSessionId: l2.sourceSessionId ?? '',
      sourceTurn: l2.sourceTurn ?? 0,
    };
  }
  const l3 = record as L3Record;
  return {
    ...common,
    title: redactSecrets(l3.title),
    hologram: redactSecrets(l3.hologram),
    themes: l3.themes.map(redactSecrets),
    entities: l3.entities.map(redactSecrets),
    openLoops: l3.openLoops.map(redactSecrets),
    sourceSessions: l3.sourceSessions,
  };
}

function layerOf(value: string | null): Layer | 'all' {
  return value === 'l1' || value === 'l2' || value === 'l3' ? value : 'all';
}

function limitOf(value: string | null): number {
  const parsed = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

async function stats(deps: ConsoleDeps): Promise<Record<string, unknown>> {
  const counts = await deps.store.stats();
  return {
    ok: true,
    stats: counts,
    total: counts.l1 + counts.l2 + counts.l3,
    embedding: {
      enabled: deps.embedder.enabled,
      model: deps.config.embeddingModel,
      baseline: deps.config.embeddingBaseline,
      reason: deps.embedder.reason ?? '',
    },
    extract: { enabled: deps.config.extractEnabled, provider: deps.config.extractProvider, model: deps.config.extractModel },
    inject: {
      enabled: deps.config.injectEnabled,
      maxChars: deps.config.injectMaxChars,
      l1: deps.config.injectL1,
      l2: deps.config.injectL2,
      l3: deps.config.injectL3,
      activeWindow: deps.config.activeWindowEnabled !== false,
      activeWindowMaxItems: deps.config.activeWindowMaxItems ?? 2,
    },
    storageDir: deps.store.dir,
  };
}

async function list(deps: ConsoleDeps, layer: Layer | 'all', limit: number): Promise<Record<string, unknown>> {
  await deps.store.whenReady();
  const layers: Layer[] = layer === 'all' ? ['l1', 'l2', 'l3'] : [layer];
  const records: AnyRecord[] = [];
  for (const name of layers) records.push(...deps.store.list(name));
  records.sort((a, b) => b.updatedAt - a.updatedAt);
  const counts = await deps.store.stats();
  return {
    ok: true,
    layer,
    shown: Math.min(records.length, limit),
    total: counts.l1 + counts.l2 + counts.l3,
    counts: { l1: counts.l1, l2: counts.l2, l3: counts.l3 },
    records: records.slice(0, limit).map(publicRecord),
  };
}

async function remove(deps: ConsoleDeps, id: string): Promise<Record<string, unknown>> {
  await deps.store.whenReady();
  const exact = deps.store.find(id);
  const match =
    exact ??
    [...deps.store.list('l1'), ...deps.store.list('l2'), ...deps.store.list('l3')].find((record) => record.id.endsWith(id));
  if (!match) return { ok: false, error: 'not found' };
  deps.store.remove(match.id);
  await deps.store.flush();
  return { ok: true, removed: publicRecord(match) };
}

function configPayload(deps: ConsoleDeps): Record<string, unknown> {
  return {
    baseUrl: deps.config.embeddingBaseUrl,
    model: deps.config.embeddingModel,
    dimensions: deps.config.embeddingDimensions,
    baseline: deps.config.embeddingBaseline,
    hasKey: hasEmbeddingKey(deps.config),
    keyFile: deps.config.embeddingApiKeyFile,
    enabled: deps.embedder.enabled,
    saved: loadEmbeddingConfig(deps.store.dir) !== null,
  };
}

function parseConfigBody(raw: unknown): {
  baseUrl: string;
  model: string;
  dimensions: number;
  baseline: number;
  apiKey: string;
} | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
  const model = typeof body.model === 'string' ? body.model.trim() : '';
  if (baseUrl.length === 0 || model.length === 0) return null;
  const dimensions = Number(body.dimensions);
  const baseline = Number(body.baseline);
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  return {
    baseUrl,
    model,
    dimensions: Number.isFinite(dimensions) ? Math.max(0, dimensions) : 0,
    baseline: Number.isFinite(baseline) ? Math.min(0.9, Math.max(0, baseline)) : 0.22,
    apiKey,
  };
}

/** Route handler. Returns nothing; writes the response itself. */
async function handle(deps: ConsoleDeps, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  try {
    if (req.method === 'GET' && path === '/holo-memory/stats') {
      sendJson(res, 200, await stats(deps));
      return;
    }
    if (req.method === 'GET' && path === '/holo-memory/list') {
      sendJson(res, 200, await list(deps, layerOf(url.searchParams.get('layer')), limitOf(url.searchParams.get('limit'))));
      return;
    }
    if (req.method === 'GET' && path === '/holo-memory/injections') {
      sendJson(res, 200, {
        ok: true,
        injections: await readInjections(deps.store.dir, limitOf(url.searchParams.get('limit'))),
      });
      return;
    }
    if (req.method === 'GET' && path === '/holo-memory/config') {
      sendJson(res, 200, { ok: true, config: configPayload(deps) });
      return;
    }
    if (req.method === 'POST' && path === '/holo-memory/config') {
      if (req.headers['x-holo-memory'] !== '1') {
        sendJson(res, 403, { ok: false, error: 'missing x-holo-memory header' });
        return;
      }
      let payload: unknown;
      try {
        payload = JSON.parse(await readBody(req)) as unknown;
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' });
        return;
      }
      const parsed = parseConfigBody(payload);
      if (!parsed) {
        sendJson(res, 400, { ok: false, error: 'baseUrl and model are required' });
        return;
      }
      if (!/^https?:\/\//i.test(parsed.baseUrl)) {
        sendJson(res, 400, { ok: false, error: 'baseUrl must start with http:// or https://' });
        return;
      }
      const saved = await saveEmbeddingConfig(deps.store.dir, parsed);
      deps.config.embeddingEnabled = true;
      deps.config.embeddingBaseUrl = saved.baseUrl;
      deps.config.embeddingModel = saved.model;
      deps.config.embeddingDimensions = saved.dimensions;
      deps.config.embeddingBaseline = saved.baseline;
      deps.config.embeddingApiKeyFile = saved.keyFile;
      deps.embedder.reset();
      deps.onConfigSaved?.();
      sendJson(res, 200, { ok: true, config: configPayload(deps) });
      return;
    }
    if (req.method === 'POST' && path === '/holo-memory/test-embedding') {
      if (req.headers['x-holo-memory'] !== '1') {
        sendJson(res, 403, { ok: false, error: 'missing x-holo-memory header' });
        return;
      }
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(await readBody(req)) as Record<string, unknown>;
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' });
        return;
      }
      const bodyKey = typeof payload.apiKey === 'string' ? payload.apiKey.trim() : '';
      const probe = await probeEmbedding({
        baseUrl: typeof payload.baseUrl === 'string' && payload.baseUrl.trim().length > 0 ? payload.baseUrl : deps.config.embeddingBaseUrl,
        model: typeof payload.model === 'string' && payload.model.trim().length > 0 ? payload.model : deps.config.embeddingModel,
        apiKey: bodyKey.length > 0 ? bodyKey : readEmbeddingKey(deps.config),
        dimensions: Number.isFinite(Number(payload.dimensions)) ? Number(payload.dimensions) : deps.config.embeddingDimensions,
        timeoutMs: 15000,
      });
      sendJson(res, 200, { ok: true, probe });
      return;
    }
    if (req.method === 'POST' && path === '/holo-memory/delete') {
      if (req.headers['x-holo-memory'] !== '1') {
        sendJson(res, 403, { ok: false, error: 'missing x-holo-memory header' });
        return;
      }
      const raw = await readBody(req);
      let payload: { id?: unknown };
      try {
        payload = JSON.parse(raw) as { id?: unknown };
      } catch {
        sendJson(res, 400, { ok: false, error: 'invalid JSON body' });
        return;
      }
      if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
        sendJson(res, 400, { ok: false, error: 'id is required' });
        return;
      }
      sendJson(res, 200, await remove(deps, payload.id.trim()));
      return;
    }
    sendJson(res, 404, { ok: false, error: 'unknown route' });
  } catch (error) {
    deps.logger.warn(`[holo-memory] console route failed: ${error instanceof Error ? error.message : String(error)}`);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'internal error' });
  }
}

/** Mount the console API on the host web server; returns its disposer. */
export function registerConsole(ctx: any, deps: ConsoleDeps): () => void {
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    void handle(deps, req, res);
  };
  return ctx.webServer.register({ kind: 'prefix', path: '/holo-memory', handler });
}
