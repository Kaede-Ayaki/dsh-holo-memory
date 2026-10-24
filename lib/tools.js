/** Model-facing memory tools: recall, note, list, forget, stats. */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { contentHash, newId, projectIdFor } from './store.js';
import { recall } from './retrieval.js';
import { looksSecret, redactSecrets } from './sanitize.js';
import { localDate } from './time.js';
import { readInjections } from './injections.js';
import { evidenceTag, sourceFromManual } from './source.js';
import { openRecord } from './open.js';
import { runDoctor } from './doctor.js';
import { AUTHORITY_NOTE, EVIDENCE_NOTE, MEMORY_AUTHORITY } from './authority.js';
import { thresholdAudit } from './thresholds.js';
const LAYERS = ['l1', 'l2', 'l3'];
function cwdOf(exec) {
    return exec?.agent?.session?.header?.cwd;
}
function shortId(id) {
    return id.slice(-8);
}
function formatRecord(record) {
    const tag = evidenceTag(record);
    if (record.layer === 'l3') {
        const l3 = record;
        return `[L3${tag} ${shortId(l3.id)}] ${redactSecrets(l3.title)}\n${redactSecrets(l3.hologram)}`;
    }
    if (record.layer === 'l2') {
        const l2 = record;
        return `[L2${tag} ${shortId(l2.id)}] (${l2.kind}${l2.scope === 'user' ? ', user' : ''}) ${redactSecrets(l2.text)}`;
    }
    const l1 = record;
    return `[L1${tag} ${shortId(l1.id)}] ${localDate(l1.createdAt)} · ${redactSecrets(l1.summary)}`;
}
function findBySuffix(store, raw) {
    const id = raw.trim();
    return (store.find(id) ??
        [...store.list('l1'), ...store.list('l2'), ...store.list('l3')].find((record) => record.id.endsWith(id)));
}
export function registerTools(ctx, deps) {
    const stringOutput = (text) => [{ type: 'text', text }];
    ctx.tools.register(defineTool({
        name: 'memory_recall',
        description: 'Search the three-layer holographic long-term memory (L1 dialogue summaries, L2 atomic facts, L3 holistic capsules). ' +
            'Call this before large or ambiguous tasks, when the user references past work, or when auto-injected memory was not enough.',
        parameters: {
            query: { type: 'string', required: true, description: 'What to recall, in natural language.' },
            layers: { type: 'string', description: 'Comma-separated layers to search: l1,l2,l3 (default all).' },
            limit: { type: 'number', description: 'Max items per layer (default 5).' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args, exec) {
            const project = projectIdFor(cwdOf(exec));
            const requested = (args.layers ?? 'l1,l2,l3')
                .split(',')
                .map((layer) => layer.trim().toLowerCase())
                .filter((layer) => LAYERS.includes(layer));
            const layers = requested.length > 0 ? requested : LAYERS;
            const limit = Math.max(1, Math.min(20, Math.floor(args.limit ?? 5)));
            const counts = { l1: 0, l2: 0, l3: 0 };
            for (const layer of layers)
                counts[layer] = limit;
            const result = await recall(deps.store, deps.embedder, deps.config, args.query, {
                projectKey: project.key,
                currentSessionId: exec.agent?.session?.id,
                maxChars: 6000,
                minScore: 0.12,
                counts,
                signal: exec.signal,
            });
            if (!result)
                return 'No relevant memory found.';
            const grouped = new Map();
            for (const item of result.items) {
                const list = grouped.get(item.layer) ?? [];
                list.push(item.record);
                grouped.set(item.layer, list);
            }
            const blocks = [];
            for (const layer of LAYERS) {
                const group = grouped.get(layer);
                if (!group || group.length === 0)
                    continue;
                blocks.push(`## ${layer.toUpperCase()}\n${group.map((record) => formatRecord(record)).join('\n\n')}`);
            }
            return blocks.join('\n\n');
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_note',
        description: 'Persist a durable fact into long-term memory. Use for user preferences, project decisions/conventions, corrections, and key entities. ' +
            'Do not store secrets, transient state, or anything trivially re-readable from the repo.',
        parameters: {
            text: { type: 'string', required: true, description: 'The fact, self-contained, in the language of the conversation.' },
            layer: { type: 'string', enum: ['l2', 'l3'], description: 'l2 atomic fact (default) or l3 holistic capsule.' },
            scope: { type: 'string', enum: ['auto', 'user', 'project'], description: 'auto (default), user (cross-project), project (this workspace).' },
            title: { type: 'string', description: 'Required for l3 capsules: short title for the holistic memory.' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Optional labels for retrieval.' },
            importance: { type: 'number', description: '1-10, default 6.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args, exec) {
            const project = projectIdFor(cwdOf(exec));
            const layer = args.layer ?? 'l2';
            const scope = args.scope === 'user' ? 'user' : 'project';
            const importance = Math.max(1, Math.min(10, Math.floor(args.importance ?? 6)));
            const tags = (args.tags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0).slice(0, 8);
            const text = args.text.trim();
            if (text.length < 3)
                return 'Not saved: text is too short.';
            if (looksSecret(text))
                return 'Not saved: the text contains a credential/token; memory never stores secrets.';
            const now = Date.now();
            const sessionId = exec.agent?.session?.id;
            const source = sourceFromManual(text, sessionId);
            if (layer === 'l3') {
                const title = (args.title ?? text.slice(0, 60)).trim();
                if (title.length === 0)
                    return 'Not saved: an l3 capsule needs a title.';
                const record = {
                    id: newId('l3'),
                    layer: 'l3',
                    scope,
                    projectKey: scope === 'user' ? '' : project.key,
                    projectLabel: scope === 'user' ? 'global' : project.label,
                    importance,
                    createdAt: now,
                    updatedAt: now,
                    hash: contentHash(`${title}\n${text}`),
                    revision: 1,
                    source,
                    title,
                    hologram: text,
                    themes: tags,
                    entities: [],
                    openLoops: [],
                    sourceSessions: sessionId ? [sessionId] : [],
                };
                deps.store.insert(record);
                deps.onRecords?.([record]);
                return `Saved L3 capsule "${title}" (${shortId(record.id)}).`;
            }
            const record = {
                id: newId('l2'),
                layer: 'l2',
                scope,
                projectKey: scope === 'user' ? '' : project.key,
                projectLabel: scope === 'user' ? 'global' : project.label,
                importance,
                createdAt: now,
                updatedAt: now,
                hash: contentHash(text),
                revision: 1,
                source,
                text,
                kind: 'fact',
                tags,
                confidence: 0.9,
                sourceSessionId: sessionId,
            };
            deps.store.insert(record);
            deps.onRecords?.([record]);
            return `Saved L2 fact (${shortId(record.id)}): ${text}`;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_list',
        description: 'List the most recent memories from one layer, newest first.',
        parameters: {
            layer: { type: 'string', enum: ['l1', 'l2', 'l3'], description: 'Layer to list (default l2).' },
            limit: { type: 'number', description: 'Max records (default 10).' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args, exec) {
            const layer = args.layer ?? 'l2';
            const limit = Math.max(1, Math.min(50, Math.floor(args.limit ?? 10)));
            const project = projectIdFor(cwdOf(exec));
            const records = deps.store
                .visible(layer, project.key)
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, limit);
            if (records.length === 0)
                return `No ${layer.toUpperCase()} memories yet.`;
            return records.map((record) => formatRecord(record)).join('\n\n');
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_open',
        description: 'Open one memory back to its source. Returns the verbatim excerpt captured at write time, the session/turn/seq pointer, hash verification, and optionally revision history. ' +
            'Use this to verify a memory before relying on it; if no source exists it says so explicitly instead of inventing a pointer.',
        parameters: {
            id: { type: 'string', required: true, description: 'Full id or the 8-character suffix shown in brackets.' },
            maxChars: { type: 'number', description: 'Max excerpt characters (default 4000, max 8000).' },
            history: { type: 'boolean', description: 'Include previous revisions when available (default false).' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args) {
            const found = findBySuffix(deps.store, args.id);
            if (!found)
                return `No memory matching "${args.id}".`;
            return openRecord(found, { maxChars: args.maxChars, history: args.history === true });
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_forget',
        description: 'Delete one memory by id when it is stale or wrong. Use ids shown by memory_recall / memory_list.',
        parameters: {
            id: { type: 'string', required: true, description: 'Full id or the 8-character suffix shown in brackets.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args) {
            const found = findBySuffix(deps.store, args.id);
            if (!found)
                return `No memory matching "${args.id}".`;
            deps.store.remove(found.id);
            return `Forgot ${found.layer.toUpperCase()} ${found.id}.`;
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_injections',
        description: 'List recent automatic memory injections (audit trail). Each entry names the session, query, selected layer counts and ids, proving that another session actually received memory. Use this to verify cross-session recall.',
        parameters: {
            limit: { type: 'number', description: 'How many recent injections to show (default 20).' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args) {
            const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)));
            const events = await readInjections(deps.store.dir, limit);
            if (events.length === 0)
                return 'No automatic injections recorded yet.';
            return events
                .map((event) => {
                const time = new Date(event.ts);
                const hh = String(time.getHours()).padStart(2, '0');
                const mm = String(time.getMinutes()).padStart(2, '0');
                const layerText = `L1×${event.layers.l1} L2×${event.layers.l2} L3×${event.layers.l3}` +
                    (event.active ? ` 主动×${event.active}` : '');
                const ids = event.selected.map((item) => item.id.slice(-8)).join(',');
                return `- ${localDate(event.ts)} ${hh}:${mm} · session ${event.sessionId.slice(-8)} · ${event.query.slice(0, 80)} · ${layerText} · ${event.chars} chars${ids ? ` · ${ids}` : ''}`;
            })
                .join('\n');
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_doctor',
        description: 'Run a memory health check. Fast checks inspect store/source/embedding/audit/config; deep=true also opens a real source and runs a lexical retrieval probe. ' +
            'A green check means the probe actually ran, not that config merely looks valid.',
        parameters: {
            deep: { type: 'boolean', description: 'Run deep probes (source open + retrieval); default false.' },
        },
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute(args) {
            const report = await runDoctor({ store: deps.store, config: deps.config, embedder: deps.embedder }, { deep: args.deep === true });
            const lines = [
                `Memory doctor · ${report.deep ? 'deep' : 'fast'} · ${report.ok ? 'PASS' : 'FAIL'}`,
                `authority: ${report.authority}`,
                `checks: ${report.summary.ok} ok · ${report.summary.warn} warn · ${report.summary.error} error · ${report.summary.skip} skip`,
            ];
            for (const check of report.checks) {
                lines.push(`- [${check.level}] ${check.id} — ${check.title}: ${check.detail}`);
            }
            return lines.join('\n');
        },
    }));
    ctx.tools.register(defineTool({
        name: 'memory_stats',
        description: 'Show holographic memory statistics: layer counts, embedding coverage, storage directory.',
        parameters: {},
        output: { schema: { type: 'string' }, render: (_args, value) => stringOutput(String(value)) },
        async execute() {
            const stats = await deps.store.stats();
            const embed = deps.embedder.enabled ? `enabled (${deps.config.embeddingModel})` : `disabled${deps.embedder.reason ? ` (${deps.embedder.reason})` : ''}`;
            return [
                `Holographic memory`,
                `- authority: ${MEMORY_AUTHORITY}`,
                `- L1 dialogue summaries: ${stats.l1}`,
                `- L2 atomic facts: ${stats.l2}`,
                `- L3 holographic capsules: ${stats.l3}`,
                `- source-backed: ${stats.sourceBacked} · pointer-only: ${stats.sourcePointer} · no source: ${stats.sourceNone} · revisioned: ${stats.revisioned}`,
                `- embedded records: ${stats.embedded}`,
                `- storage: ${stats.dir}`,
                `- embeddings: ${embed}`,
                `- embedding baseline: ${deps.config.embeddingBaseline}`,
                `- extraction: ${deps.config.extractEnabled ? 'enabled' : 'disabled'}`,
                `- ${AUTHORITY_NOTE}`,
                `- ${EVIDENCE_NOTE}`,
                `- thresholds: ${thresholdAudit(deps.config).map((item) => `${item.key}=${item.value}`).join(', ')}`,
            ].join('\n');
        },
    }));
}
