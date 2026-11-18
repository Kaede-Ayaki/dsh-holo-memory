/**
 * dsh-neuron-memory · P0 associative index + P1 linkage.
 *
 * This plugin is intentionally NOT an automatic injector. It reads canonical
 * holo-memory records read-only, builds a bipartite memory/entity graph, and
 * exposes explicit tools for spreading activation. Holo-memory (P1) may consume
 * `neuronMemory.expand()` as an extra candidate channel; neuron never writes
 * canonical facts.
 */
import { Config, normalizeConfig } from './config.js';
import { NeuronGraph, readHoloRecords } from './graph.js';
import { registerTools } from './tools.js';
export const name = 'neuron-memory';
/** Only tools are mandatory; `neuronMemory` is provided for the holo hook. */
export const inject = ['tools'];
export { Config };
export function apply(ctx, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const graph = new NeuronGraph(config.graphDir, config);
    let lastSyncAt = 0;
    const getHolo = () => {
        try {
            return ctx.get?.('holoMemory');
        }
        catch {
            return undefined;
        }
    };
    const readRecords = async () => {
        const holo = getHolo();
        if (holo?.listRecords)
            return (await holo.listRecords());
        return readHoloRecords(config.holoStoreDir);
    };
    const service = {
        async ingest(options = {}) {
            return graph.ingest(await readRecords(), options);
        },
        async sync() {
            // Throttle: holo may call sync after every extraction, but a full graph
            // refresh is only useful a few times per minute.
            if (Date.now() - lastSyncAt < 15_000)
                return { skipped: true };
            lastSyncAt = Date.now();
            return graph.ingest(await readRecords());
        },
        async expand(request = {}) {
            return graph.expand(request);
        },
        async feedback(event) {
            return graph.applyFeedback(event.injectedIds ?? [], event.citedIds ?? []);
        },
        async stats() {
            return graph.stats();
        },
        async summary(limit = 12) {
            return graph.summary(limit);
        },
    };
    registerTools(ctx, { graph, config, getHolo });
    if (typeof ctx.provide === 'function')
        ctx.provide('neuronMemory', service);
}
