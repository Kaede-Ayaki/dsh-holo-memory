/** P0 neuron-memory configuration. */
import z from '@deepseek-ai/schemastery';
export declare const Config: z<Schemastery.ObjectS<NoInfer<{
    graphDir: z<string, string, "defined">;
    holoStoreDir: z<string, string, "defined">;
    defaultDepth: z<number, number, "defined">;
    damping: z<number, number, "defined">;
    minSignal: z<number, number, "defined">;
    topK: z<number, number, "defined">;
    maxNodes: z<number, number, "defined">;
    maxEdges: z<number, number, "defined">;
    maxDegree: z<number, number, "defined">;
    maxTagsPerRecord: z<number, number, "defined">;
    maxSeedEntities: z<number, number, "defined">;
    requireQueryOverlap: z<boolean, boolean, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    graphDir: z<string, string, "defined">;
    holoStoreDir: z<string, string, "defined">;
    defaultDepth: z<number, number, "defined">;
    damping: z<number, number, "defined">;
    minSignal: z<number, number, "defined">;
    topK: z<number, number, "defined">;
    maxNodes: z<number, number, "defined">;
    maxEdges: z<number, number, "defined">;
    maxDegree: z<number, number, "defined">;
    maxTagsPerRecord: z<number, number, "defined">;
    maxSeedEntities: z<number, number, "defined">;
    requireQueryOverlap: z<boolean, boolean, "defined">;
}>>, "plain">;
export interface NeuronConfig {
    graphDir: string;
    holoStoreDir: string;
    defaultDepth: number;
    damping: number;
    minSignal: number;
    topK: number;
    maxNodes: number;
    maxEdges: number;
    maxDegree: number;
    maxTagsPerRecord: number;
    maxSeedEntities: number;
    requireQueryOverlap: boolean;
}
export declare const DEFAULT_CONFIG: NeuronConfig;
export declare function normalizeConfig(raw: Partial<NeuronConfig> | undefined): NeuronConfig;
