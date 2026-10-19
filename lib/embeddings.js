/**
 * Optional OpenAI-compatible embedding client.
 *
 * Works with OpenAI, Ollama (`/v1/embeddings`), Volcengine Ark, and any other
 * endpoint that accepts `{ model, input: string[] }` and returns
 * `{ data: [{ embedding: number[] }] }`.
 */
import { readFileSync } from 'node:fs';
function isFiniteVector(value) {
    return Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}
export function cosine(a, b) {
    const length = Math.min(a.length, b.length);
    if (length === 0)
        return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0)
        return 0;
    return dot / Math.sqrt(na * nb);
}
export class EmbeddingClient {
    config;
    fetcher;
    queryCache = new Map();
    disabledReason;
    retryAt = 0;
    constructor(config, fetcher = fetch) {
        this.config = config;
        this.fetcher = fetcher;
    }
    get enabled() {
        return (this.config.embeddingEnabled &&
            this.config.embeddingBaseUrl.trim().length > 0 &&
            this.config.embeddingModel.trim().length > 0 &&
            (this.disabledReason === undefined || Date.now() >= this.retryAt));
    }
    get reason() {
        return this.disabledReason;
    }
    fail(reason) {
        this.disabledReason = reason;
        // Back off for a minute instead of disabling the endpoint for the whole
        // process lifetime; a transient network blip should not cost all vectors.
        this.retryAt = Date.now() + 60_000;
        return null;
    }
    endpoint() {
        const base = this.config.embeddingBaseUrl.trim().replace(/\/+$/, '');
        return base.endsWith('/embeddings') ? base : `${base}/embeddings`;
    }
    apiKey() {
        const env = this.config.embeddingApiKeyEnv.trim();
        const fromEnv = env.length > 0 ? (process.env[env] ?? '').trim() : '';
        if (fromEnv.length > 0)
            return fromEnv;
        const file = this.config.embeddingApiKeyFile.trim();
        if (file.length > 0) {
            try {
                const raw = readFileSync(file, 'utf8');
                const first = raw.split(/\r?\n/).find((line) => line.trim().length > 0);
                if (first)
                    return first.trim();
            }
            catch {
                // fall through: a missing key file behaves like an unset env var
            }
        }
        return '';
    }
    /** Embed a batch of texts. Returns null when disabled or on any failure. */
    async embed(texts, signal) {
        if (!this.enabled || texts.length === 0)
            return null;
        const body = {
            model: this.config.embeddingModel,
            input: texts,
        };
        if (this.config.embeddingDimensions > 0)
            body.dimensions = this.config.embeddingDimensions;
        const headers = { 'content-type': 'application/json' };
        const key = this.apiKey();
        if (key.length > 0)
            headers.authorization = `Bearer ${key}`;
        const timeout = AbortSignal.timeout(this.config.embeddingTimeoutMs);
        const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
        try {
            const response = await this.fetcher(this.endpoint(), {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
                signal: composed,
            });
            if (!response.ok)
                return this.fail(`HTTP ${response.status}`);
            const json = (await response.json());
            const data = Array.isArray(json.data) ? json.data.slice() : [];
            data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            const vectors = data.map((row) => row.embedding);
            if (vectors.length !== texts.length || !vectors.every(isFiniteVector)) {
                return this.fail('unexpected response shape');
            }
            return vectors;
        }
        catch (error) {
            // Caller cancellation and our own short query budget are normal control
            // flow, not endpoint failures: never disable the channel for them.
            const name = error?.name;
            if (name === 'AbortError' || name === 'TimeoutError' || composed.aborted)
                return null;
            return this.fail(error instanceof Error ? error.message : String(error));
        }
    }
    /** Embed one query with a short budget; cached by query text. */
    async query(text, signal, timeoutMs) {
        if (!this.enabled)
            return null;
        const key = text.trim();
        if (key.length === 0)
            return null;
        const cached = this.queryCache.get(key);
        if (cached)
            return cached;
        const timeout = AbortSignal.timeout(Math.max(200, timeoutMs ?? this.config.queryEmbeddingTimeoutMs));
        const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
        const vectors = await this.embed([key], composed);
        const vector = vectors?.[0];
        if (!vector)
            return null;
        if (this.queryCache.size >= 200) {
            const first = this.queryCache.keys().next().value;
            if (first !== undefined)
                this.queryCache.delete(first);
        }
        this.queryCache.set(key, vector);
        return vector;
    }
}
