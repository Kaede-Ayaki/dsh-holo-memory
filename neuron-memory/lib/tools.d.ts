import type { NeuronConfig } from './config.js';
import { NeuronGraph } from './graph.js';
export interface ToolDeps {
    graph: NeuronGraph;
    config: NeuronConfig;
    /** Optional read-only holo-memory service, preferred over direct file reads. */
    getHolo?: () => {
        listRecords?: () => Promise<unknown[]> | unknown[];
    } | undefined;
}
export declare function registerTools(ctx: {
    tools: {
        register(tool: unknown): void;
    };
}, deps: ToolDeps): void;
