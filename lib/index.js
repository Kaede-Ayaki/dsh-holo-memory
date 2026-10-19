/**
 * dsh-holo-memory — three-layer holographic memory for DeepSeek Harness.
 *
 * L1 dialogue layer  : one compact summary per conversation turn.
 * L2 fact layer      : atomic, durable facts (preferences, decisions, ...).
 * L3 holographic layer: holistic capsules that compress many turns into one
 *                      self-contained narrative.
 *
 * Every new user turn auto-recalls the most relevant L1/L2/L3 records and
 * injects them as a small user-role snapshot. Turn end distills the dialogue
 * into the three layers in the background. Retrieval is hybrid: BM25/CJK
 * bigrams always work; an optional OpenAI-compatible embedding endpoint adds
 * vector cosine similarity.
 *
 * Plugin shape follows the Loader contract: named exports `name`, `inject`,
 * `Config`, `apply` — never a default export (the Loader folds defaults and
 * loses `inject`).
 */
import path from 'node:path';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
import { Config, normalizeConfig } from './config.js';
import { HoloStore, projectIdFor } from './store.js';
import { EmbeddingClient } from './embeddings.js';
import { recentFallback, recall } from './retrieval.js';
import { extractTurn } from './extract.js';
import { registerTools } from './tools.js';
import { registerConsole } from './console.js';
import { appendInjection } from './injections.js';
import { applySavedEmbeddingConfig } from './embedding-config.js';
import { redactSecrets } from './sanitize.js';
export const name = 'holo-memory';
/** Host services this plugin consumes. Missing `systemPrompt` would throw on
 * first access and fail activation, so declare both up front. */
export const inject = ['tools', 'systemPrompt'];
export { Config };
function textOfMessage(message) {
    if (typeof message !== 'object' || message === null)
        return '';
    const content = message.content;
    if (!Array.isArray(content))
        return '';
    const parts = [];
    for (const block of content) {
        if (typeof block === 'object' && block !== null && block.type === 'text') {
            const text = block.text;
            if (typeof text === 'string' && text.trim().length > 0)
                parts.push(text.trim());
        }
    }
    return parts.join('\n').trim();
}
function isHumanUserMessage(message) {
    if (typeof message !== 'object' || message === null)
        return false;
    const role = message.role;
    const source = message.source;
    return role === 'user' && source?.kind === 'user';
}
function embeddingText(record) {
    if (record.layer === 'l1') {
        return `${record.summary}\n${record.topics.join(' ')}\n${record.intent ?? ''}\n${record.outcome ?? ''}`.trim();
    }
    if (record.layer === 'l2')
        return `${record.text}\n${record.tags.join(' ')}`.trim();
    return `${record.title}\n${record.hologram}\n${record.themes.join(' ')}`.trim();
}
export function apply(ctx, rawConfig) {
    const config = normalizeConfig(rawConfig);
    const storageDir = config.storageDir.trim().length > 0
        ? config.storageDir.trim()
        : path.join(resolveDshHome(), 'holo-memory');
    const logger = ctx.logger ?? { warn: () => undefined };
    applySavedEmbeddingConfig(config, storageDir);
    const store = new HoloStore(storageDir, config);
    const embedder = new EmbeddingClient(config);
    const abort = new AbortController();
    // ------------------------------------------------------------------ //
    // Background embedding indexer                                        //
    // ------------------------------------------------------------------ //
    const pendingEmbeddings = new Map();
    let embeddingDrain;
    const queueEmbedding = (records) => {
        if (!embedder.enabled)
            return;
        for (const record of records) {
            if (!record.embedding || record.embeddingModel !== config.embeddingModel)
                pendingEmbeddings.set(record.id, record);
        }
        if (pendingEmbeddings.size === 0)
            return;
        embeddingDrain ??= drainEmbeddings().finally(() => {
            embeddingDrain = undefined;
        });
    };
    const drainEmbeddings = async () => {
        while (pendingEmbeddings.size > 0) {
            const batch = [...pendingEmbeddings.values()].slice(0, Math.max(1, config.embeddingBatchSize));
            for (const record of batch)
                pendingEmbeddings.delete(record.id);
            const texts = batch.map((record) => embeddingText(record));
            const vectors = await embedder.embed(texts, abort.signal);
            if (!vectors)
                return; // endpoint unavailable: keep lexical retrieval working
            for (let i = 0; i < batch.length; i++) {
                const record = batch[i];
                const vector = vectors[i];
                if (!vector)
                    continue;
                store.update(record.layer, record.id, {
                    embedding: vector.map((value) => Math.round(value * 1e6) / 1e6),
                    embeddingModel: config.embeddingModel,
                });
            }
        }
    };
    // ------------------------------------------------------------------ //
    // Turn capture + extraction queue                                    //
    // ------------------------------------------------------------------ //
    const agents = new Map();
    const buffers = new Map();
    const queue = [];
    let draining = false;
    const routeFor = (sessionId) => agents.get(sessionId) ?? { depth: 0 };
    const drainQueue = async () => {
        if (draining)
            return;
        draining = true;
        try {
            while (queue.length > 0) {
                const job = queue.shift();
                const route = routeFor(job.capture.sessionId);
                const provider = config.extractProvider.trim() || route.provider;
                const model = config.extractModel.trim() || route.model;
                try {
                    await extractTurn({
                        store,
                        config,
                        llm: ctx.get?.('llm'),
                        route: provider && model ? { provider, model } : undefined,
                        onRecords: queueEmbedding,
                        signal: abort.signal,
                        logger,
                    }, job.capture);
                    if (config.debug)
                        logger.info?.(`[holo-memory] extracted turn ${job.capture.turn} of ${job.capture.sessionId}`);
                }
                catch (error) {
                    if (!abort.signal.aborted) {
                        logger.warn(`[holo-memory] extraction failed: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            }
        }
        finally {
            draining = false;
        }
    };
    const enqueueExtraction = (capture) => {
        queue.push({ capture });
        void drainQueue();
    };
    const flushTurn = (sessionId, reason) => {
        const capture = buffers.get(sessionId);
        buffers.delete(sessionId);
        if (config.debug)
            logger.info?.(`[holo-memory] flush ${sessionId}: ${capture ? `${capture.userTexts.length}u/${capture.assistantTexts.length}a` : 'no buffer'}`);
        if (!capture)
            return;
        if (!config.extractEnabled)
            return;
        if (capture.userTexts.length === 0)
            return;
        if (reason?.kind === 'aborted' && capture.assistantTexts.length === 0)
            return;
        const route = routeFor(sessionId);
        capture.provider = route.provider;
        capture.model = route.model;
        enqueueExtraction(capture);
    };
    // ------------------------------------------------------------------ //
    // Session event capture                                              //
    // ------------------------------------------------------------------ //
    const injected = new Map();
    ctx.on('session/event', (session, event) => {
        if (!session || !event)
            return;
        if (config.debug)
            logger.info?.(`[holo-memory] session event ${event.type}`);
        const sessionId = session.id;
        switch (event.type) {
            case 'turn/start': {
                const project = projectIdFor(session.header?.cwd);
                buffers.set(sessionId, {
                    sessionId,
                    turn: Number(event.data?.turn ?? 0),
                    cwd: session.header?.cwd ?? '',
                    projectKey: project.key,
                    projectLabel: project.label,
                    userTexts: [],
                    assistantTexts: [],
                    startedAt: Date.now(),
                });
                break;
            }
            case 'user/message': {
                const buffer = buffers.get(sessionId);
                const message = event.data;
                if (!buffer || !isHumanUserMessage(message))
                    break;
                const text = textOfMessage(message);
                if (text.length > 0 && buffer.userTexts.join('').length < 8000)
                    buffer.userTexts.push(text.slice(0, 4000));
                break;
            }
            case 'assistant/message': {
                const buffer = buffers.get(sessionId);
                if (!buffer)
                    break;
                const text = textOfMessage(event.data?.message);
                if (text.length > 0 && buffer.assistantTexts.join('').length < 12000)
                    buffer.assistantTexts.push(text.slice(0, 4000));
                break;
            }
            case 'turn/end': {
                flushTurn(sessionId, event.data?.reason);
                break;
            }
            default:
                break;
        }
    });
    ctx.on('agent/created', ({ agent }) => {
        if (!agent?.session?.id)
            return;
        agents.set(agent.session.id, {
            provider: agent.options?.provider,
            model: agent.options?.model,
            depth: Number(agent.session.header?.delegationDepth ?? agent.options?.subagentDepth ?? 0),
        });
    });
    ctx.on('agent/disposed', ({ agent }) => {
        if (agent?.session?.id)
            agents.delete(agent.session.id);
    });
    ctx.on('session/disposed', (session) => {
        if (!session?.id)
            return;
        flushTurn(session.id, { kind: 'complete' });
        buffers.delete(session.id);
        agents.delete(session.id);
        injected.delete(session.id);
    });
    // ------------------------------------------------------------------ //
    // Per-turn auto-recall injection                                     //
    // ------------------------------------------------------------------ //
    ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
        const decision = await next();
        if (decision?.kind === 'reject' || signal?.aborted)
            return decision;
        if (!config.injectEnabled)
            return decision;
        const sessionId = agent?.session?.id;
        if (!sessionId)
            return decision;
        const depth = Number(agent?.session?.header?.delegationDepth ?? 0);
        if (depth > 0 && !config.injectSubagents)
            return decision;
        const promptMessage = Array.isArray(messages)
            ? [...messages].reverse().find((message) => isHumanUserMessage(message))
            : undefined;
        if (!promptMessage)
            return decision;
        const messageId = String(promptMessage.id ?? '');
        if (messageId.length > 0) {
            const seen = injected.get(sessionId) ?? new Set();
            if (seen.has(messageId))
                return decision;
            seen.add(messageId);
            if (seen.size > 40) {
                const first = seen.values().next().value;
                if (first !== undefined)
                    seen.delete(first);
            }
            injected.set(sessionId, seen);
        }
        const cwd = agent?.session?.header?.cwd;
        const project = projectIdFor(cwd);
        const query = textOfMessage(promptMessage);
        try {
            const result = (await recall(store, embedder, config, query, {
                projectKey: project.key,
                currentSessionId: sessionId,
                maxChars: config.injectMaxChars,
                minScore: config.injectMinScore,
                counts: { l1: config.injectL1, l2: config.injectL2, l3: config.injectL3 },
                signal,
            })) ??
                (query.trim().length < 12 ? await recentFallback(store, project.key, config.injectMaxChars) : null);
            if (!result || (typeof result === 'string' && result.trim().length === 0))
                return decision;
            const text = typeof result === 'string' ? result : result.text;
            const selected = typeof result === 'string' ? [] : result.items.map((item) => ({
                id: item.record.id,
                layer: item.layer,
                score: Math.round(item.score * 1000) / 1000,
            }));
            const layers = { l1: 0, l2: 0, l3: 0 };
            for (const item of selected)
                layers[item.layer] += 1;
            void appendInjection(store.dir, {
                ts: Date.now(),
                sessionId,
                cwd: cwd ?? '',
                query,
                chars: text.length,
                mode: typeof result === 'string' ? 'recent-fallback' : 'recall',
                layers,
                selected,
            });
            // The client projects this user-role context message into a collapsible
            // "[长期记忆自动召回 | holo-memory]" work-step row; the model still gets
            // the same text as an ordinary context message.
            return {
                ...decision,
                messages: [
                    ...decision.messages,
                    createUserMessage({
                        content: [{ type: 'text', text }],
                        source: {
                            kind: 'holo-memory',
                            form: 'snapshot',
                            sections: [{ name: 'holo-memory', text }],
                            // Presentation metadata for the client's context-node renderer.
                            query: redactSecrets(query).slice(0, 300),
                            chars: text.length,
                            mode: typeof result === 'string' ? 'recent-fallback' : 'recall',
                            layers,
                            selected,
                        },
                    }),
                ],
            };
        }
        catch (error) {
            if (!signal?.aborted && config.debug) {
                logger.warn(`[holo-memory] recall injection failed: ${error instanceof Error ? error.message : String(error)}`);
            }
            return decision;
        }
    });
    // ------------------------------------------------------------------ //
    // Static guidance section                                            //
    // ------------------------------------------------------------------ //
    if (ctx.systemPrompt?.section) {
        ctx.systemPrompt.section({
            name: 'holo-memory:guidance',
            order: 5000,
            text: 'You have a three-layer holographic long-term memory (L1 dialogue summaries, L2 atomic facts, L3 holistic capsules). ' +
                'Relevant memories may be injected automatically as a user-role "holo-memory" block; treat it as background facts and verify against current state. ' +
                'Use memory_recall for more context, memory_note to persist durable facts, memory_forget to correct stale ones. ' +
                'Do not save secrets or transient state.',
        });
    }
    // Compatibility shim: DSH 0.2.x does not register a `cwd` prompt variable,
    // but older presets may still use a persona suffix like
    // "Your working directory is {{cwd}}."; without this, prompt assembly
    // fails before the first model request. The durable fix is to remove
    // {{cwd}} from the preset, but keep legacy compositions working.
    try {
        ctx.systemPrompt?.variable?.('cwd', (context) => {
            const cwd = context?.agent?.session?.header?.cwd ?? context?.scope?.session?.header?.cwd;
            return typeof cwd === 'string' && cwd.length > 0 ? cwd : process.cwd();
        });
    }
    catch {
        // a newer host may already own the variable; nothing to do
    }
    // ------------------------------------------------------------------ //
    // Tools + lifecycle                                                  //
    // ------------------------------------------------------------------ //
    registerTools(ctx, {
        store,
        embedder,
        config,
        onRecords: queueEmbedding,
        logger,
    });
    // In-DSH console API (settings page): stats + record list + delete.
    try {
        ctx.inject(['webServer'], (wctx) => {
            ctx.effect(() => registerConsole(wctx, {
                store,
                embedder,
                config,
                logger,
                onConfigSaved: () => queueEmbedding([...store.list('l1'), ...store.list('l2'), ...store.list('l3')]),
            }), 'holo-memory: console route');
        });
    }
    catch (error) {
        logger.warn(`[holo-memory] console route unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
    ctx.effect(() => {
        return () => {
            abort.abort();
            void store.flush().catch(() => undefined);
        };
    });
    // Kick off lazy initialization; tools and recall await `store.whenReady()`.
    // When embeddings are already configured, backfill vectors for records that
    // predate this run (or predate a model switch) in the background.
    void store
        .whenReady()
        .then(() => {
        if (!embedder.enabled)
            return;
        queueEmbedding([...store.list('l1'), ...store.list('l2'), ...store.list('l3')]);
    })
        .catch((error) => {
        logger.warn(`[holo-memory] store initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    });
}
