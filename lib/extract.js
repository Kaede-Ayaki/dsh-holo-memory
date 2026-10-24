import { contentHash, newId } from './store.js';
import { nearDuplicate } from './lexical.js';
import { looksSecret, redactSecrets } from './sanitize.js';
import { sourceFromTurn } from './source.js';
import { reviseRecord } from './revisions.js';
const FACT_KINDS = ['preference', 'decision', 'fact', 'entity', 'task', 'correction', 'reference'];
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function cleanText(value, max) {
    if (typeof value !== 'string')
        return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, max);
}
function cleanList(value, maxItems, maxLength) {
    if (!Array.isArray(value))
        return [];
    const seen = new Set();
    const out = [];
    for (const item of value) {
        const text = cleanText(item, maxLength);
        if (text.length === 0 || seen.has(text))
            continue;
        seen.add(text);
        out.push(text);
        if (out.length >= maxItems)
            break;
    }
    return out;
}
/** Extract the first complete JSON object from model output. */
export function parseJsonObject(raw) {
    const withoutFences = raw
        .replace(/^\s*```(?:json)?/i, '')
        .replace(/```\s*$/i, '')
        .trim();
    const start = withoutFences.indexOf('{');
    if (start < 0)
        return null;
    let end = withoutFences.lastIndexOf('}');
    while (end > start) {
        const slice = withoutFences.slice(start, end + 1);
        try {
            return JSON.parse(slice);
        }
        catch {
            end = withoutFences.lastIndexOf('}', end - 1);
        }
    }
    return null;
}
/** Validate and bound one model-produced extraction payload. */
export function normalizeExtraction(value) {
    if (typeof value !== 'object' || value === null)
        return null;
    const raw = value;
    const out = { l2: [], l3: [] };
    if (typeof raw.l1 === 'object' && raw.l1 !== null) {
        const l1 = raw.l1;
        const summary = redactSecrets(cleanText(l1.summary, 600));
        if (summary.length > 0) {
            out.l1 = {
                summary,
                topics: cleanList(l1.topics, 8, 40).map(redactSecrets),
                intent: redactSecrets(cleanText(l1.intent, 120)) || undefined,
                outcome: redactSecrets(cleanText(l1.outcome, 160)) || undefined,
                importance: typeof l1.importance === 'number' ? clamp(l1.importance, 1, 10) : 5,
            };
        }
    }
    if (Array.isArray(raw.l2)) {
        for (const item of raw.l2.slice(0, 12)) {
            if (typeof item !== 'object' || item === null)
                continue;
            const fact = item;
            const text = cleanText(fact.text, 500);
            if (text.length === 0 || text.length < 3 || looksSecret(text))
                continue;
            const kind = FACT_KINDS.includes(fact.kind) ? fact.kind : 'fact';
            const scope = fact.scope === 'user' ? 'user' : 'project';
            const confidence = typeof fact.confidence === 'number' ? clamp(fact.confidence, 0, 1) : 0.7;
            out.l2.push({
                text,
                kind,
                scope,
                tags: cleanList(fact.tags, 6, 24),
                confidence,
                importance: typeof fact.importance === 'number' ? clamp(fact.importance, 1, 10) : 6,
            });
        }
    }
    if (Array.isArray(raw.l3)) {
        for (const item of raw.l3.slice(0, 3)) {
            if (typeof item !== 'object' || item === null)
                continue;
            const capsule = item;
            const title = cleanText(capsule.title, 80);
            const hologram = cleanText(capsule.hologram, 900);
            if (title.length === 0 || hologram.length < 20 || looksSecret(hologram))
                continue;
            out.l3.push({
                id: cleanText(capsule.id, 64) || undefined,
                title,
                hologram,
                themes: cleanList(capsule.themes, 8, 40),
                entities: cleanList(capsule.entities, 12, 40),
                openLoops: cleanList(capsule.open_loops ?? capsule.openLoops, 8, 120),
                scope: capsule.scope === 'user' ? 'user' : 'project',
                importance: typeof capsule.importance === 'number' ? clamp(capsule.importance, 1, 10) : 6,
            });
        }
    }
    if (!out.l1 && out.l2.length === 0 && out.l3.length === 0)
        return null;
    return out;
}
function transcriptOf(capture, maxChars) {
    const lines = [];
    const pairs = Math.max(capture.userTexts.length, capture.assistantTexts.length);
    for (let i = 0; i < pairs; i++) {
        const user = capture.userTexts[i];
        const assistant = capture.assistantTexts[i];
        if (user)
            lines.push(`USER: ${user}`);
        if (assistant)
            lines.push(`ASSISTANT: ${assistant}`);
    }
    // If the turn has several assistant messages and one user message, the loop
    // above interleaves them; that is good enough for distillation.
    let text = lines.join('\n\n');
    if (text.length > maxChars) {
        text = `...[earlier part trimmed]\n${text.slice(text.length - maxChars)}`;
    }
    // Never send credentials to the distillation model either.
    return redactSecrets(text);
}
export function buildExtractionPrompt(capture, existingL3, existingL2, config) {
    const l3Lines = existingL3
        .slice(0, 10)
        .map((record) => `- id=${record.id} | ${record.title} | ${record.hologram.slice(0, 220)}`)
        .join('\n');
    const l2Lines = existingL2
        .slice(-14)
        .map((record) => `- ${record.text.slice(0, 180)}`)
        .join('\n');
    const transcript = transcriptOf(capture, config.extractMaxTranscriptChars);
    return `You are the memory distillation engine for DeepSeek Harness, a coding agent.
Read ONE conversation turn and distill durable memory. Return strict JSON only (no markdown fences, no prose).

Three layers:
- L1 dialogue layer: a compact summary of this turn (1-3 sentences): what the user wanted, what was done, the outcome. Also topics (short labels), intent, outcome.
- L2 fact layer: atomic, self-contained facts worth remembering across sessions. Kinds: preference | decision | fact | entity | task | correction | reference. scope "user" only for cross-project personal facts/preferences; otherwise "project". Never include secrets, tokens, credentials, transient state, or things trivially re-readable from the repo.
- L3 holographic layer: holistic capsules that compress MANY turns into one self-contained narrative ("the part contains the whole"): user identity/working style, project architecture and state, ongoing threads and open loops, recurring constraints. Create/update at most 1 capsule per turn. Only when this turn reveals a durable pattern or a meaningful update to an existing capsule. Prefer updating an existing capsule by its exact id. hologram = 200-600 Chinese chars (or equivalent English), covering context, decisions, constraints, and what comes next.

Rules:
- Write all text in the SAME language as the conversation (Chinese conversation => Chinese memory).
- Update rather than duplicate: if a fact refines an existing fact, use kind "correction" and state the corrected fact.
- L2 must be self-contained: no "he", "it", "that file" without naming it.
- Keep l2 to at most 6 items; return [] for l2 if nothing durable.
- Keep l3 to at most 1 item; return [] for l3 if this turn adds no holistic insight.
- importance: 1-10 (8-10 identity/durable preference, 5-7 project fact, 1-4 marginal).

Existing L3 capsules (update by exact id when applicable):
${l3Lines || '(none yet)'}

Recent L2 facts (do not duplicate):
${l2Lines || '(none yet)'}

Conversation turn (project: ${capture.projectLabel}; session: ${capture.sessionId}; turn: ${capture.turn}):
<turn>
${transcript}
</turn>

Return ONLY this JSON shape:
{
  "l1": {"summary": "...", "topics": ["..."], "intent": "...", "outcome": "...", "importance": 5},
  "l2": [{"text": "...", "kind": "preference", "scope": "user", "tags": ["..."], "confidence": 0.9, "importance": 8}],
  "l3": [{"id": "l3_xxx (only when updating an existing capsule)", "title": "...", "hologram": "...", "themes": ["..."], "entities": ["..."], "open_loops": ["..."], "scope": "project", "importance": 7}]
}`;
}
async function callModel(deps, prompt) {
    if (!deps.llm || !deps.route)
        return null;
    const { createUserMessage, BlockAssembler } = await import('@deepseek-ai/dsh-llm');
    const assembler = new BlockAssembler();
    try {
        for await (const chunk of deps.llm.stream({
            provider: deps.route.provider,
            model: deps.route.model,
            messages: [
                createUserMessage({
                    content: [{ type: 'text', text: prompt }],
                    source: { kind: 'holo-memory', form: 'notice', summary: 'holo-memory distillation' },
                }),
            ],
            temperature: deps.config.extractTemperature,
            maxTokens: deps.config.extractMaxTokens,
            signal: deps.signal,
        })) {
            assembler.push(chunk);
        }
    }
    catch (error) {
        deps.logger?.warn(`[holo-memory] extraction call failed: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
    const finish = assembler.finish;
    if (finish.kind === 'error' || finish.kind === 'aborted')
        return null;
    return assembler
        .blocks()
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
}
function fallbackSummary(capture) {
    const user = redactSecrets(capture.userTexts.join(' ').replace(/\s+/g, ' ').trim());
    const assistant = redactSecrets(capture.assistantTexts.join(' ').replace(/\s+/g, ' ').trim());
    const summary = `${user.slice(0, 180)}${assistant ? ` → ${assistant.slice(0, 180)}` : ''}`.trim();
    if (summary.length === 0)
        return { l2: [], l3: [] };
    return {
        l1: { summary: summary.slice(0, 600), topics: [], importance: 4 },
        l2: [],
        l3: [],
    };
}
function findExistingFact(store, projectKey, scope, text) {
    const candidates = store
        .visible('l2', projectKey)
        .filter((record) => record.layer === 'l2' && !record.supersededBy && record.scope === scope);
    let best;
    let bestScore = 0;
    for (const candidate of candidates) {
        if (nearDuplicate(candidate.text, text, 0.8)) {
            const score = 1;
            if (score > bestScore) {
                best = candidate;
                bestScore = score;
            }
        }
    }
    return best;
}
function findL3(store, projectKey, id, title) {
    const candidates = store.visible('l3', projectKey).filter((record) => record.layer === 'l3');
    if (id) {
        const exact = candidates.find((record) => record.id === id);
        if (exact)
            return exact;
    }
    const normalized = title.toLowerCase();
    return candidates.find((record) => record.title.toLowerCase() === normalized || nearDuplicate(record.title, title, 0.85));
}
/** Apply one validated extraction payload to the store. */
export function applyExtraction(store, config, capture, extraction) {
    const touched = [];
    const now = Date.now();
    const source = sourceFromTurn(capture, config.sourceExcerptMaxChars);
    if (extraction.l1 && extraction.l1.summary.length > 0) {
        const existing = store
            .list('l1')
            .filter((record) => record.layer === 'l1')
            .find((record) => record.sessionId === capture.sessionId && record.turn === capture.turn);
        const summary = extraction.l1.summary;
        if (existing) {
            store.update('l1', existing.id, reviseRecord(existing, {
                summary,
                topics: extraction.l1.topics,
                intent: extraction.l1.intent,
                outcome: extraction.l1.outcome,
                importance: extraction.l1.importance ?? existing.importance,
                hash: contentHash(summary),
                embedding: undefined,
                embeddingModel: undefined,
                source,
            }, 'extraction'));
            touched.push(store.find(existing.id));
        }
        else {
            const record = {
                id: newId('l1'),
                layer: 'l1',
                scope: 'project',
                projectKey: capture.projectKey,
                projectLabel: capture.projectLabel,
                importance: extraction.l1.importance ?? 5,
                createdAt: now,
                updatedAt: now,
                hash: contentHash(summary),
                revision: 1,
                source,
                sessionId: capture.sessionId,
                turn: capture.turn,
                cwd: capture.cwd,
                summary,
                topics: extraction.l1.topics,
                intent: extraction.l1.intent,
                outcome: extraction.l1.outcome,
            };
            store.insert(record);
            touched.push(record);
        }
    }
    for (const fact of extraction.l2 ?? []) {
        const existing = findExistingFact(store, capture.projectKey, fact.scope ?? 'project', fact.text);
        if (existing) {
            store.update('l2', existing.id, reviseRecord(existing, {
                text: fact.text,
                kind: fact.kind ?? existing.kind,
                tags: fact.tags ?? existing.tags,
                confidence: fact.confidence ?? existing.confidence,
                importance: fact.importance ?? existing.importance,
                sourceSessionId: capture.sessionId,
                sourceTurn: capture.turn,
                hash: contentHash(fact.text),
                embedding: undefined,
                embeddingModel: undefined,
                source,
            }, 'extraction'));
            touched.push(store.find(existing.id));
        }
        else {
            const record = {
                id: newId('l2'),
                layer: 'l2',
                scope: fact.scope ?? 'project',
                projectKey: fact.scope === 'user' ? '' : capture.projectKey,
                projectLabel: fact.scope === 'user' ? 'global' : capture.projectLabel,
                importance: fact.importance ?? 6,
                createdAt: now,
                updatedAt: now,
                hash: contentHash(fact.text),
                revision: 1,
                source,
                text: fact.text,
                kind: fact.kind ?? 'fact',
                tags: fact.tags ?? [],
                confidence: fact.confidence ?? 0.7,
                sourceSessionId: capture.sessionId,
                sourceTurn: capture.turn,
            };
            store.insert(record);
            touched.push(record);
        }
    }
    for (const capsule of extraction.l3 ?? []) {
        const existing = findL3(store, capture.projectKey, capsule.id, capsule.title);
        if (existing) {
            const sourceSessions = Array.from(new Set([...existing.sourceSessions, capture.sessionId]));
            store.update('l3', existing.id, reviseRecord(existing, {
                title: capsule.title,
                hologram: capsule.hologram,
                themes: capsule.themes ?? existing.themes,
                entities: capsule.entities ?? existing.entities,
                openLoops: capsule.openLoops ?? existing.openLoops,
                importance: capsule.importance ?? existing.importance,
                sourceSessions,
                hash: contentHash(`${capsule.title}\n${capsule.hologram}`),
                embedding: undefined,
                embeddingModel: undefined,
                source,
            }, 'extraction'));
            touched.push(store.find(existing.id));
        }
        else {
            const record = {
                id: newId('l3'),
                layer: 'l3',
                scope: capsule.scope ?? 'project',
                projectKey: capsule.scope === 'user' ? '' : capture.projectKey,
                projectLabel: capsule.scope === 'user' ? 'global' : capture.projectLabel,
                importance: capsule.importance ?? 6,
                createdAt: now,
                updatedAt: now,
                hash: contentHash(`${capsule.title}\n${capsule.hologram}`),
                revision: 1,
                source,
                title: capsule.title,
                hologram: capsule.hologram,
                themes: capsule.themes ?? [],
                entities: capsule.entities ?? [],
                openLoops: capsule.openLoops ?? [],
                sourceSessions: [capture.sessionId],
            };
            store.insert(record);
            touched.push(record);
        }
    }
    return touched;
}
/**
 * Distill one completed turn and merge it into memory.
 * Falls back to a deterministic L1 summary when no model route is available,
 * so dialogue recording never depends on a live LLM.
 */
export async function extractTurn(deps, capture) {
    await deps.store.whenReady();
    const totalChars = capture.userTexts.join('').length + capture.assistantTexts.join('').length;
    if (totalChars < deps.config.extractMinTurnChars)
        return null;
    const existingL3 = deps.store
        .visible('l3', capture.projectKey)
        .filter((record) => record.layer === 'l3')
        .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt);
    const existingL2 = deps.store
        .visible('l2', capture.projectKey)
        .filter((record) => record.layer === 'l2' && !record.supersededBy)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    const prompt = buildExtractionPrompt(capture, existingL3, existingL2, deps.config);
    const raw = await callModel(deps, prompt);
    let extraction = null;
    if (raw) {
        extraction = normalizeExtraction(parseJsonObject(raw));
        if (!extraction) {
            deps.logger?.warn('[holo-memory] extraction output was not valid JSON; using fallback summary');
        }
    }
    if (!extraction)
        extraction = fallbackSummary(capture);
    if (!extraction.l1)
        extraction.l1 = fallbackSummary(capture).l1;
    if (!extraction.l1)
        return null;
    const touched = applyExtraction(deps.store, deps.config, capture, extraction);
    if (touched.length > 0)
        deps.onRecords?.(touched);
    return extraction;
}
