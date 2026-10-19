/**
 * Probe an OpenAI-compatible endpoint to answer two questions:
 *   1. is it reachable with the supplied key?
 *   2. is the chosen model an embedding model, and how many dimensions?
 * Used by the settings console's "test" button; never persists anything.
 */
export interface EmbeddingProbeInput {
    baseUrl: string;
    model: string;
    apiKey?: string;
    dimensions?: number;
    timeoutMs?: number;
}
export interface EmbeddingProbeResult {
    ok: boolean;
    kind: 'embedding' | 'chat' | 'unknown' | 'error';
    latencyMs: number;
    status?: number;
    dimensions?: number;
    model?: string;
    message: string;
}
export declare function probeEmbedding(input: EmbeddingProbeInput): Promise<EmbeddingProbeResult>;
