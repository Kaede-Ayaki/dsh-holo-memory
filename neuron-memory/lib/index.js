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
    let pendingSync;
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
        const records = holo?.listRecords
            ? (await holo.listRecords())
            : await readHoloRecords(config.holoStoreDir);
        // Only active claims belong in the associative index: superseded or
        // expired memories must not keep firing through graph edges.
        return records.filter((record) => {
            const claim = record.claim;
            if (claim && claim.status !== 'active')
                return false;
            if (record.supersededBy)
                return false;
            return true;
        });
    };
    const service = {
        async ingest(options = {}) {
            return graph.ingest(await readRecords(), options);
        },
        async sync() {
            // Throttle: holo may call sync after every extraction, but a full graph
            // refresh is only useful a few times per minute. A throttled call now
            // schedules one deferred run at the end of the window instead of being
            // dropped, so delete/supersede changes always reach the graph.
            const remaining = 15_000 - (Date.now() - lastSyncAt);
            if (remaining > 0) {
                if (!pendingSync) {
                    pendingSync = setTimeout(() => {
                        pendingSync = undefined;
                        void service.sync().catch(() => undefined);
                    }, remaining);
                    pendingSync.unref?.();
                }
                return { deferred: true, inMs: remaining };
            }
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
