/** Plugin configuration schema and default-merging helper. */
import z from '@deepseek-ai/schemastery';
export const Config = z.object({
    /** Memory root; empty = `$DSH_HOME/holo-memory`. */
    storageDir: z.string().default(''),
    maxL1: z.number().default(2000),
    maxL2: z.number().default(3000),
    maxL3: z.number().default(300),
    /** Auto-recall injection into each new user turn. */
    injectEnabled: z.boolean().default(true),
    injectMaxChars: z.number().default(1400),
    injectMinScore: z.number().default(0.12),
    injectL1: z.number().default(2),
    injectL2: z.number().default(5),
    injectL3: z.number().default(3),
    injectSubagents: z.boolean().default(false),
    /** Background extraction at turn end. */
    extractEnabled: z.boolean().default(true),
    extractProvider: z.string().default(''),
    extractModel: z.string().default(''),
    extractMaxTokens: z.number().default(1400),
    extractTemperature: z.number().default(0.2),
    extractMinTurnChars: z.number().default(60),
    extractMaxTranscriptChars: z.number().default(12000),
    /** Optional OpenAI-compatible embedding endpoint. Disabled by default. */
    embeddingEnabled: z.boolean().default(false),
    embeddingBaseUrl: z.string().default(''),
    embeddingModel: z.string().default(''),
    embeddingApiKeyEnv: z.string().default('DSH_HOLO_EMBEDDING_API_KEY'),
    /** Optional file containing the embedding API key (first line). Avoids putting secrets in YAML. */
    embeddingApiKeyFile: z.string().default(''),
    embeddingDimensions: z.number().default(0),
    /** Cosine baseline of the embedding model; below it the vector signal is treated as noise. */
    embeddingBaseline: z.number().default(0.22),
    embeddingTimeoutMs: z.number().default(15000),
    embeddingBatchSize: z.number().default(16),
    /** Query embedding budget inside pre-step (kept short to protect TTFT). */
    queryEmbeddingTimeoutMs: z.number().default(1200),
    debug: z.boolean().default(false),
});
export const DEFAULT_CONFIG = {
    storageDir: '',
    maxL1: 2000,
    maxL2: 3000,
    maxL3: 300,
    injectEnabled: true,
    injectMaxChars: 1400,
    injectMinScore: 0.12,
    injectL1: 2,
    injectL2: 5,
    injectL3: 3,
    injectSubagents: false,
    extractEnabled: true,
    extractProvider: '',
    extractModel: '',
    extractMaxTokens: 1400,
    extractTemperature: 0.2,
    extractMinTurnChars: 60,
    extractMaxTranscriptChars: 12000,
    embeddingEnabled: false,
    embeddingBaseUrl: '',
    embeddingModel: '',
    embeddingApiKeyEnv: 'DSH_HOLO_EMBEDDING_API_KEY',
    embeddingApiKeyFile: '',
    embeddingDimensions: 0,
    embeddingBaseline: 0.22,
    embeddingTimeoutMs: 15000,
    embeddingBatchSize: 16,
    queryEmbeddingTimeoutMs: 1200,
    debug: false,
};
/** Merge a loader-supplied (possibly partial) config over the defaults. */
export function normalizeConfig(raw) {
    const source = raw ?? {};
    const out = { ...DEFAULT_CONFIG };
    for (const key of Object.keys(DEFAULT_CONFIG)) {
        const value = source[key];
        if (value !== undefined && value !== null) {
            // Schemastery may pass numeric strings through the settings UI; coerce.
            if (typeof DEFAULT_CONFIG[key] === 'number') {
                const num = Number(value);
                if (Number.isFinite(num))
                    out[key] = num;
            }
            else if (typeof DEFAULT_CONFIG[key] === 'boolean') {
                out[key] = Boolean(value);
            }
            else {
                out[key] = value;
            }
        }
    }
    return out;
}
