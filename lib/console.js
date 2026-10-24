import { redactSecrets } from './sanitize.js';
import { readInjections } from './injections.js';
import { evidenceOf, sourceFor } from './source.js';
import { openRecord } from './open.js';
import { runDoctor } from './doctor.js';
import { AUTHORITY_NOTE, EVIDENCE_NOTE, MEMORY_AUTHORITY } from './authority.js';
import { thresholdAudit } from './thresholds.js';
import { hasEmbeddingKey, loadEmbeddingConfig, readEmbeddingKey, saveEmbeddingConfig, } from './embedding-config.js';
import { probeEmbedding } from './embedding-probe.js';
const MAX_BODY_BYTES = 16 * 1024;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
    });
    res.end(body);
}
function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
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
function textOf(record) {
    if (record.layer === 'l1') {
        const l1 = record;
        return l1.summary;
    }
    if (record.layer === 'l2')
        return record.text;
    const l3 = record;
    return `${l3.title}\n${l3.hologram}`;
}
function titleOf(record) {
    if (record.layer === 'l3')
        return record.title;
    if (record.layer === 'l2') {
        const l2 = record;
        return `[${l2.kind}] ${l2.text.slice(0, 60)}`;
    }
    return record.summary.slice(0, 60);
}
function publicRecord(record) {
    const source = sourceFor(record);
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
        revision: record.revision ?? 0,
        historyCount: record.history?.length ?? 0,
        evidence: evidenceOf(record),
        source: source
            ? {
                kind: source.kind,
                sessionId: source.sessionId ?? '',
                turn: source.turn ?? 0,
                seqStart: source.seqStart ?? 0,
                seqEnd: source.seqEnd ?? 0,
                hasExcerpt: Boolean(source.excerpt && source.excerpt.trim().length > 0),
            }
            : null,
        title: titleOf(record),
        text: redactSecrets(textOf(record)),
    };
    if (record.layer === 'l1') {
        const l1 = record;
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
        const l2 = record;
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
    const l3 = record;
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
function layerOf(value) {
    return value === 'l1' || value === 'l2' || value === 'l3' ? value : 'all';
}
function limitOf(value) {
    const parsed = Number(value ?? DEFAULT_LIMIT);
    if (!Number.isFinite(parsed))
        return DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}
function maxCharsOf(value) {
    const parsed = Number(value ?? 4000);
    if (!Number.isFinite(parsed))
        return 4000;
    return Math.max(200, Math.min(8000, Math.floor(parsed)));
}
async function stats(deps) {
    const counts = await deps.store.stats();
    const total = counts.l1 + counts.l2 + counts.l3;
    const covered = counts.sourceBacked + counts.sourcePointer;
    return {
        ok: true,
        stats: counts,
        total,
        authority: MEMORY_AUTHORITY,
        authorityNote: AUTHORITY_NOTE,
        evidenceNote: EVIDENCE_NOTE,
        source: {
            backed: counts.sourceBacked,
            pointer: counts.sourcePointer,
            none: counts.sourceNone,
            coverage: total > 0 ? Math.round((covered / total) * 100) : 0,
        },
        citation: {
            injected: counts.injected,
            cited: counts.cited,
        },
        thresholds: thresholdAudit(deps.config),
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
async function list(deps, layer, limit) {
    await deps.store.whenReady();
    const layers = layer === 'all' ? ['l1', 'l2', 'l3'] : [layer];
    const records = [];
    for (const name of layers)
        records.push(...deps.store.list(name));
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
async function remove(deps, id) {
    await deps.store.whenReady();
    const exact = deps.store.find(id);
    const match = exact ??
        [...deps.store.list('l1'), ...deps.store.list('l2'), ...deps.store.list('l3')].find((record) => record.id.endsWith(id));
    if (!match)
        return { ok: false, error: 'not found' };
    deps.store.remove(match.id);
    await deps.store.flush();
    return { ok: true, removed: publicRecord(match) };
}
function configPayload(deps) {
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
function parseConfigBody(raw) {
    if (typeof raw !== 'object' || raw === null)
        return null;
    const body = raw;
    const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : '';
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    if (baseUrl.length === 0 || model.length === 0)
        return null;
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
async function handle(deps, req, res) {
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
        if (req.method === 'GET' && path === '/holo-memory/doctor') {
            sendJson(res, 200, await runDoctor({ store: deps.store, config: deps.config, embedder: deps.embedder }, { deep: url.searchParams.get('deep') === '1' }));
            return;
        }
        if (req.method === 'GET' && path === '/holo-memory/open') {
            const id = url.searchParams.get('id') ?? '';
            const found = deps.store.find(id) ??
                [...deps.store.list('l1'), ...deps.store.list('l2'), ...deps.store.list('l3')].find((record) => record.id.endsWith(id));
            if (!found) {
                sendJson(res, 404, { ok: false, error: 'not found' });
                return;
            }
            sendJson(res, 200, {
                ok: true,
                id: found.id,
                text: openRecord(found, {
                    maxChars: maxCharsOf(url.searchParams.get('limit')),
                    history: url.searchParams.get('history') === '1',
                }),
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
            let payload;
            try {
                payload = JSON.parse(await readBody(req));
            }
            catch {
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
            let payload;
            try {
                payload = JSON.parse(await readBody(req));
            }
            catch {
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
            let payload;
            try {
                payload = JSON.parse(raw);
            }
            catch {
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
    }
    catch (error) {
        deps.logger.warn(`[holo-memory] console route failed: ${error instanceof Error ? error.message : String(error)}`);
        if (!res.headersSent)
            sendJson(res, 500, { ok: false, error: 'internal error' });
    }
}
/** Mount the console API on the host web server; returns its disposer. */
export function registerConsole(ctx, deps) {
    const handler = (req, res) => {
        void handle(deps, req, res);
    };
    return ctx.webServer.register({ kind: 'prefix', path: '/holo-memory', handler });
}
