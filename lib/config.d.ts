/** Plugin configuration schema and default-merging helper. */
import z from '@deepseek-ai/schemastery';
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    /** Memory root; empty = `$DSH_HOME/holo-memory`. */
    storageDir: z<string, string, "defined">;
    maxL1: z<number, number, "defined">;
    maxL2: z<number, number, "defined">;
    maxL3: z<number, number, "defined">;
    /** Auto-recall injection into each new user turn. */
    injectEnabled: z<boolean, boolean, "defined">;
    injectMaxChars: z<number, number, "defined">;
    injectMinScore: z<number, number, "defined">;
    injectL1: z<number, number, "defined">;
    injectL2: z<number, number, "defined">;
    injectL3: z<number, number, "defined">;
    injectSubagents: z<boolean, boolean, "defined">;
    /** Query-independent resident memories added on top of query recall. */
    activeWindowEnabled: z<boolean, boolean, "defined">;
    activeWindowMaxItems: z<number, number, "defined">;
    activeWindowMaxChars: z<number, number, "defined">;
    activeWindowMinImportance: z<number, number, "defined">;
    /** Reciprocal-rank-fusion constant; 60 is the standard default. */
    rrfRankConstant: z<number, number, "defined">;
    /** Background extraction at turn end. */
    extractEnabled: z<boolean, boolean, "defined">;
    extractProvider: z<string, string, "defined">;
    extractModel: z<string, string, "defined">;
    extractMaxTokens: z<number, number, "defined">;
    extractTemperature: z<number, number, "defined">;
    extractMinTurnChars: z<number, number, "defined">;
    extractMaxTranscriptChars: z<number, number, "defined">;
    /** Max verbatim excerpt stored on a source pointer. */
    sourceExcerptMaxChars: z<number, number, "defined">;
    /** Optional OpenAI-compatible embedding endpoint. Disabled by default. */
    embeddingEnabled: z<boolean, boolean, "defined">;
    embeddingBaseUrl: z<string, string, "defined">;
    embeddingModel: z<string, string, "defined">;
    embeddingApiKeyEnv: z<string, string, "defined">;
    /** Optional file containing the embedding API key (first line). Avoids putting secrets in YAML. */
    embeddingApiKeyFile: z<string, string, "defined">;
    embeddingDimensions: z<number, number, "defined">;
    /** Cosine baseline of the embedding model; below it the vector signal is treated as noise. */
    embeddingBaseline: z<number, number, "defined">;
    embeddingTimeoutMs: z<number, number, "defined">;
    embeddingBatchSize: z<number, number, "defined">;
    /** Query embedding budget inside pre-step (kept short to protect TTFT). */
    queryEmbeddingTimeoutMs: z<number, number, "defined">;
    debug: z<boolean, boolean, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    /** Memory root; empty = `$DSH_HOME/holo-memory`. */
    storageDir: z<string, string, "defined">;
    maxL1: z<number, number, "defined">;
    maxL2: z<number, number, "defined">;
    maxL3: z<number, number, "defined">;
    /** Auto-recall injection into each new user turn. */
    injectEnabled: z<boolean, boolean, "defined">;
    injectMaxChars: z<number, number, "defined">;
    injectMinScore: z<number, number, "defined">;
    injectL1: z<number, number, "defined">;
    injectL2: z<number, number, "defined">;
    injectL3: z<number, number, "defined">;
    injectSubagents: z<boolean, boolean, "defined">;
    /** Query-independent resident memories added on top of query recall. */
    activeWindowEnabled: z<boolean, boolean, "defined">;
    activeWindowMaxItems: z<number, number, "defined">;
    activeWindowMaxChars: z<number, number, "defined">;
    activeWindowMinImportance: z<number, number, "defined">;
    /** Reciprocal-rank-fusion constant; 60 is the standard default. */
    rrfRankConstant: z<number, number, "defined">;
    /** Background extraction at turn end. */
    extractEnabled: z<boolean, boolean, "defined">;
    extractProvider: z<string, string, "defined">;
    extractModel: z<string, string, "defined">;
    extractMaxTokens: z<number, number, "defined">;
    extractTemperature: z<number, number, "defined">;
    extractMinTurnChars: z<number, number, "defined">;
    extractMaxTranscriptChars: z<number, number, "defined">;
    /** Max verbatim excerpt stored on a source pointer. */
    sourceExcerptMaxChars: z<number, number, "defined">;
    /** Optional OpenAI-compatible embedding endpoint. Disabled by default. */
    embeddingEnabled: z<boolean, boolean, "defined">;
    embeddingBaseUrl: z<string, string, "defined">;
    embeddingModel: z<string, string, "defined">;
    embeddingApiKeyEnv: z<string, string, "defined">;
    /** Optional file containing the embedding API key (first line). Avoids putting secrets in YAML. */
    embeddingApiKeyFile: z<string, string, "defined">;
    embeddingDimensions: z<number, number, "defined">;
    /** Cosine baseline of the embedding model; below it the vector signal is treated as noise. */
    embeddingBaseline: z<number, number, "defined">;
    embeddingTimeoutMs: z<number, number, "defined">;
    embeddingBatchSize: z<number, number, "defined">;
    /** Query embedding budget inside pre-step (kept short to protect TTFT). */
    queryEmbeddingTimeoutMs: z<number, number, "defined">;
    debug: z<boolean, boolean, "defined">;
}>>, "plain">;
export type HoloConfig = {
    storageDir: string;
    maxL1: number;
    maxL2: number;
    maxL3: number;
    injectEnabled: boolean;
    injectMaxChars: number;
    injectMinScore: number;
    injectL1: number;
    injectL2: number;
    injectL3: number;
    injectSubagents: boolean;
    activeWindowEnabled: boolean;
    activeWindowMaxItems: number;
    activeWindowMaxChars: number;
    activeWindowMinImportance: number;
    rrfRankConstant: number;
    extractEnabled: boolean;
    extractProvider: string;
    extractModel: string;
    extractMaxTokens: number;
    extractTemperature: number;
    extractMinTurnChars: number;
    extractMaxTranscriptChars: number;
    sourceExcerptMaxChars: number;
    embeddingEnabled: boolean;
    embeddingBaseUrl: string;
    embeddingModel: string;
    embeddingApiKeyEnv: string;
    embeddingApiKeyFile: string;
    embeddingDimensions: number;
    embeddingBaseline: number;
    embeddingTimeoutMs: number;
    embeddingBatchSize: number;
    queryEmbeddingTimeoutMs: number;
    debug: boolean;
};
export declare const DEFAULT_CONFIG: HoloConfig;
/** Merge a loader-supplied (possibly partial) config over the defaults. */
export declare function normalizeConfig(raw: Partial<HoloConfig> | undefined): HoloConfig;
