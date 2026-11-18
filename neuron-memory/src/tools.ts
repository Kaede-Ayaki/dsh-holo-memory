/** Model-facing tools for the P0 associative index. */
import { defineTool } from '@deepseek-ai/dsh-tools';
import type { NeuronConfig } from './config.js';
import { NeuronGraph, readHoloRecords } from './graph.js';

export interface ToolDeps {
  graph: NeuronGraph;
  config: NeuronConfig;
  /** Optional read-only holo-memory service, preferred over direct file reads. */
  getHolo?: () => { listRecords?: () => Promise<unknown[]> | unknown[] } | undefined;
}

export function registerTools(ctx: { tools: { register(tool: unknown): void } }, deps: ToolDeps): void {
  const stringOutput = (value: string) => [{ type: 'text' as const, text: value }];

  ctx.tools.register(
    defineTool({
      name: 'neuron_ingest',
      description:
        'Rebuild/refresh the P0 associative index from dsh-holo-memory JSON. This reads holo records read-only; it never writes canonical memory. ' +
        'The graph stores only memory refs and entity/tag edges.',
      parameters: {
        rebuild: { type: 'boolean', description: 'Discard the existing graph first (default false).' },
      },
      output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
      async execute(args) {
        const holo = deps.getHolo?.();
        const records = holo?.listRecords
          ? (await holo.listRecords()) as import('./types.js').HoloRecord[]
          : await readHoloRecords(deps.config.holoStoreDir);
        const result = await deps.graph.ingest(records, { rebuild: args.rebuild === true });
        return [
          `P0 neuron index ${args.rebuild === true ? 'rebuilt' : 'refreshed'}`,
          `- memory nodes: ${result.memoryNodes}`,
          `- entity nodes: ${result.entityNodes}`,
          `- edges: ${result.edges}`,
          `- pruned edges: ${result.prunedEdges ?? 0}`,
          `- added/updated: ${result.added}/${result.updated}`,
          `- source: ${deps.config.holoStoreDir} (read-only)`,
        ].join('\n');
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: 'neuron_expand',
      description:
        'Run spreading activation in the P0 associative index and return candidate holo-memory ids. ' +
        'This tool does not inject content; use memory_recall/memory_open to read the canonical record before relying on it.',
      parameters: {
        query: { type: 'string', description: 'Natural-language query used to seed entity/memory nodes.' },
        seedIds: { type: 'string', description: 'Optional comma-separated holo ids or 8-char suffixes.' },
        depth: { type: 'number', description: 'Activation depth, 1-3 (default 2).' },
        topK: { type: 'number', description: 'Max candidate memories (default 8).' },
      },
      output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
      async execute(args) {
        const raw = (args.seedIds ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        const result = await deps.graph.expand({
          query: args.query ?? '',
          seedIds: raw,
          depth: args.depth,
          topK: args.topK,
        });
        if (result.hits.length === 0) return 'No associative candidates. Run neuron_ingest first, or use a clearer query/seed.';
        return [
          `Neuron expansion · depth ${result.depth} · damping ${result.damping} · visited ${result.nodesVisited}`,
          `seeds: ${result.seeds.length > 0 ? result.seeds.map((id) => id.slice(-12)).join(', ') : '(none)'}`,
          'Candidates (canonical content is still in holo-memory):',
          ...result.hits.map(
            (hit, index) => `${index + 1}. ${hit.holoId} · ${hit.layer.toUpperCase()} · activation ${hit.activation} · ${hit.label}`,
          ),
          'Use memory_recall/memory_open with these ids before citing.',
        ].join('\n');
      },
    }),
  );

  ctx.tools.register(
    defineTool({
      name: 'neuron_stats',
      description: 'Show P0 associative-index statistics: memory/entity nodes, edges, degree, and source directories.',
      parameters: {},
      output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
      async execute() {
        const stats = await deps.graph.stats();
        return [
          'P0 associative index',
          `- memory nodes: ${stats.memoryNodes}`,
          `- entity nodes: ${stats.entityNodes}`,
          `- edges: ${stats.edges}`,
          `- average degree: ${stats.averageDegree}`,
          `- graph: ${deps.config.graphDir}`,
          `- holo source (read-only): ${deps.config.holoStoreDir}`,
          `- updated: ${new Date(stats.updatedAt).toISOString()}`,
        ].join('\n');
      },
    }),
  );
}
