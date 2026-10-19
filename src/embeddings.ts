/**
 * Optional OpenAI-compatible embedding client.
 *
 * Works with OpenAI, Ollama (`/v1/embeddings`), Volcengine Ark, and any other
 * endpoint that accepts `{ model, input: string[] }` and returns
 * `{ data: [{ embedding: number[] }] }`.
 */
import { readFileSync } from 'node:fs';
import type { HoloConfig } from './config.js';

export interface EmbeddingHit {
  id: string;
  similarity: number;
}

export type EmbeddingFetch = typeof fetch;

function isFiniteVector(value: unknown): value is number[] {
  return Array.isArray(value) && value.length > 0 && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

export function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

export class EmbeddingClient {
  private readonly config: HoloConfig;
  private readonly fetcher: EmbeddingFetch;
  private readonly queryCache = new Map<string, number[]>();
  private disabledReason: string | undefined;
  private retryAt = 0;

  constructor(config: HoloConfig, fetcher: EmbeddingFetch = fetch) {
    this.config = config;
    this.fetcher = fetcher;
  }

  get enabled(): boolean {
    return (
      this.config.embeddingEnabled &&
      this.config.embeddingBaseUrl.trim().length > 0 &&
      this.config.embeddingModel.trim().length > 0 &&
      (this.disabledReason === undefined || Date.now() >= this.retryAt)
    );
  }

  get reason(): string | undefined {
    return this.disabledReason;
  }

  /** Drop failure backoff and cached query vectors after a config change. */
  reset(): void {
    this.disabledReason = undefined;
    this.retryAt = 0;
    this.queryCache.clear();
  }

  private fail(reason: string): null {
    this.disabledReason = reason;
    // Back off for a minute instead of disabling the endpoint for the whole
    // process lifetime; a transient network blip should not cost all vectors.
    this.retryAt = Date.now() + 60_000;
    return null;
  }

  private endpoint(): string {
    const base = this.config.embeddingBaseUrl.trim().replace(/\/+$/, '');
    return base.endsWith('/embeddings') ? base : `${base}/embeddings`;
  }

  private apiKey(): string {
    const env = this.config.embeddingApiKeyEnv.trim();
    const fromEnv = env.length > 0 ? (process.env[env] ?? '').trim() : '';
    if (fromEnv.length > 0) return fromEnv;
    const file = this.config.embeddingApiKeyFile.trim();
    if (file.length > 0) {
      try {
        const raw = readFileSync(file, 'utf8');
        const first = raw.split(/\r?\n/).find((line) => line.trim().length > 0);
        if (first) return first.trim();
      } catch {
        // fall through: a missing key file behaves like an unset env var
      }
    }
    return '';
  }

  /** Embed a batch of texts. Returns null when disabled or on any failure. */
  async embed(texts: string[], signal?: AbortSignal): Promise<number[][] | null> {
    if (!this.enabled || texts.length === 0) return null;
    const body: Record<string, unknown> = {
      model: this.config.embeddingModel,
      input: texts,
    };
    if (this.config.embeddingDimensions > 0) body.dimensions = this.config.embeddingDimensions;
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const key = this.apiKey();
    if (key.length > 0) headers.authorization = `Bearer ${key}`;
    const timeout = AbortSignal.timeout(this.config.embeddingTimeoutMs);
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const response = await this.fetcher(this.endpoint(), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: composed,
      });
      if (!response.ok) return this.fail(`HTTP ${response.status}`);
      const json = (await response.json()) as { data?: Array<{ embedding?: unknown; index?: number }> };
      const data = Array.isArray(json.data) ? json.data.slice() : [];
      data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const vectors = data.map((row) => row.embedding);
      if (vectors.length !== texts.length || !vectors.every(isFiniteVector)) {
        return this.fail('unexpected response shape');
      }
      return vectors;
    } catch (error) {
      // Caller cancellation and our own short query budget are normal control
      // flow, not endpoint failures: never disable the channel for them.
      const name = (error as { name?: string } | null)?.name;
      if (name === 'AbortError' || name === 'TimeoutError' || composed.aborted) return null;
      return this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  /** Embed one query with a short budget; cached by query text. */
  async query(text: string, signal?: AbortSignal, timeoutMs?: number): Promise<number[] | null> {
    if (!this.enabled) return null;
    const key = text.trim();
    if (key.length === 0) return null;
    const cached = this.queryCache.get(key);
    if (cached) return cached;
    const timeout = AbortSignal.timeout(Math.max(200, timeoutMs ?? this.config.queryEmbeddingTimeoutMs));
    const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const vectors = await this.embed([key], composed);
    const vector = vectors?.[0];
    if (!vector) return null;
    if (this.queryCache.size >= 200) {
      const first = this.queryCache.keys().next().value;
      if (first !== undefined) this.queryCache.delete(first);
    }
    this.queryCache.set(key, vector);
    return vector;
  }
}

