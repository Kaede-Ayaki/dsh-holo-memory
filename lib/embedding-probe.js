/**
 * Probe an OpenAI-compatible endpoint to answer two questions:
 *   1. is it reachable with the supplied key?
 *   2. is the chosen model an embedding model, and how many dimensions?
 * Used by the settings console's "test" button; never persists anything.
 */
function endpoint(baseUrl) {
    const base = baseUrl.trim().replace(/\/+$/, '');
    return base.endsWith('/embeddings') ? base : `${base}/embeddings`;
}
function shortBody(value) {
    const compact = value.replace(/\s+/g, ' ').trim();
    return compact.length > 240 ? `${compact.slice(0, 240)}…` : compact;
}
export async function probeEmbedding(input) {
    const started = Date.now();
    const baseUrl = input.baseUrl.trim();
    const model = input.model.trim();
    if (!/^https?:\/\//i.test(baseUrl)) {
        return { ok: false, kind: 'error', latencyMs: 0, message: '接口地址必须以 http:// 或 https:// 开头' };
    }
    if (model.length === 0) {
        return { ok: false, kind: 'error', latencyMs: 0, message: '模型名不能为空' };
    }
    const body = {
        model,
        input: ['dsh-holo-memory embedding probe'],
        encoding_format: 'float',
    };
    if ((input.dimensions ?? 0) > 0)
        body.dimensions = input.dimensions;
    const headers = { 'content-type': 'application/json' };
    const apiKey = (input.apiKey ?? '').trim();
    if (apiKey.length > 0)
        headers.authorization = `Bearer ${apiKey}`;
    const timeout = AbortSignal.timeout(Math.max(1000, input.timeoutMs ?? 15000));
    try {
        const response = await fetch(endpoint(baseUrl), {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: timeout,
        });
        const latencyMs = Date.now() - started;
        const text = await response.text();
        let json;
        try {
            json = JSON.parse(text);
        }
        catch {
            json = undefined;
        }
        if (!response.ok) {
            return {
                ok: false,
                kind: 'error',
                latencyMs,
                status: response.status,
                message: `HTTP ${response.status}: ${shortBody(text) || response.statusText}`,
            };
        }
        const payload = (json ?? {});
        if (Array.isArray(payload.choices)) {
            return {
                ok: true,
                kind: 'chat',
                latencyMs,
                status: response.status,
                model: typeof payload.model === 'string' ? payload.model : model,
                message: '接口可用，但该模型返回 chat completion，不是 embedding 向量模型',
            };
        }
        const rows = Array.isArray(payload.data) ? payload.data : [];
        const vector = rows[0]?.embedding;
        if (Array.isArray(vector) && vector.length >= 8 && vector.every((value) => typeof value === 'number' && Number.isFinite(value))) {
            return {
                ok: true,
                kind: 'embedding',
                latencyMs,
                status: response.status,
                dimensions: vector.length,
                model: typeof payload.model === 'string' ? payload.model : model,
                message: `可用 · 向量模型 · ${vector.length} 维`,
            };
        }
        return {
            ok: true,
            kind: 'unknown',
            latencyMs,
            status: response.status,
            model: typeof payload.model === 'string' ? payload.model : model,
            message: `接口返回 200，但响应里没有 data[].embedding 数组：${shortBody(text)}`,
        };
    }
    catch (error) {
        return {
            ok: false,
            kind: 'error',
            latencyMs: Date.now() - started,
            message: `连接失败：${error instanceof Error ? error.message : String(error)}`,
        };
    }
}
