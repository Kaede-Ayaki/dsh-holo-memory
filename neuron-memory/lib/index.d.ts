/**
 * dsh-neuron-memory · P0 associative index + P1 linkage.
 *
 * This plugin is intentionally NOT an automatic injector. It reads canonical
 * holo-memory records read-only, builds a bipartite memory/entity graph, and
 * exposes explicit tools for spreading activation. Holo-memory (P1) may consume
 * `neuronMemory.expand()` as an extra candidate channel; neuron never writes
 * canonical facts.
 */
import { Config, type NeuronConfig } from './config.js';
export declare const name = "neuron-memory";
/** Only tools are mandatory; `neuronMemory` is provided for the holo hook. */
export declare const inject: string[];
export { Config };
export interface NeuronMemoryService {
    ingest(options?: {
        rebuild?: boolean;
    }): Promise<unknown>;
    sync(): Promise<unknown>;
    expand(request?: Record<string, unknown>): Promise<unknown>;
    feedback(event: {
        injectedIds: string[];
        citedIds: string[];
    }): Promise<unknown>;
    stats(): Promise<unknown>;
    summary(limit?: number): Promise<unknown>;
}
export declare function apply(ctx: any, rawConfig: Partial<NeuronConfig> | undefined): void;
export type { NeuronConfig } from './config.js';
