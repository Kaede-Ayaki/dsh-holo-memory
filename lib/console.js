import { redactSecrets } from './sanitize.js';
import { readInjections } from './injections.js';
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
async function stats(deps) {
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
