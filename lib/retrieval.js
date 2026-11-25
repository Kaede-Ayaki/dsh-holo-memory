import { cosine } from './embeddings.js';
import { Bm25Index, ngramCoverage, tokenize } from './lexical.js';
import { redactSecrets } from './sanitize.js';
import { evidenceTag } from './source.js';
import { localDate } from './time.js';
import { CONFIDENCE_AUTO_APPLY_MIN, isValidAt } from './confidence.js';
function textOf(record) {
    if (record.layer === 'l1') {
        return `${record.summary}\n${record.topics.join(' ')}\n${record.intent ?? ''}\n${record.outcome ?? ''}`;
    }
    if (record.layer === 'l2')
        return `${record.text}\n${record.tags.join(' ')} ${record.kind}`;
    return `${record.title}\n${record.hologram}\n${record.themes.join(' ')}\n${record.entities.join(' ')}`;
}
function ageDays(record) {
    return Math.max(0, (Date.now() - record.createdAt) / 86_400_000);
}
function recency(record) {
    return Math.exp(-ageDays(record) / 45);
}
function importanceNorm(record) {
    return Math.max(0, Math.min(1, (record.importance || 5) / 10));
}
function citationNorm(record) {
    const cited = record.citedCount ?? 0;
    const accessed = record.accessCount ?? 0;
    return Math.max(0, Math.min(1, cited * 0.25 + accessed * 0.03));
}
/** Long-term resident signal used only by the active-window channel. */
function residentScore(record) {
    const scopeBoost = record.scope === 'user' ? 1 : 0.7;
    return Math.max(0, Math.min(1, 0.45 * importanceNorm(record) +
        0.25 * recency(record) +
        0.20 * scopeBoost +
        0.10 * citationNorm(record)));
}
/**
 * Curated tags are a cheap topical switch. A fact whose tags are explicitly
 * present in the query is allowed a lower evidence floor; an untagged
 * preference/rule must clear a much higher bar on its own.
 */
function tagMatchesQuery(record, queryLower) {
    if (record.layer !== 'l2')
        return false;
    return record.tags.some((tag) => {
        const normalized = tag.trim().toLowerCase();
        return normalized.length >= 2 && queryLower.includes(normalized);
    });
}
function confidenceSuffix(record) {
    const claim = record.claim;
    if (!claim)
        return '';
    const value = ` conf=${claim.confidence.toFixed(3)}`;
    return claim.confidence < CONFIDENCE_AUTO_APPLY_MIN ? `${value} · 待验证` : value;
}
function lineFor(item) {
    const record = item.record;
    const id = record.id.slice(-8);
    const suffix = ` (id:${id})`;
    const tag = evidenceTag(record);
    const conf = confidenceSuffix(record);
    if (record.layer === 'l3') {
        const l3 = record;
        const loops = l3.openLoops.length > 0 ? ` | 待续: ${redactSecrets(l3.openLoops.slice(0, 3).join('；'))}` : '';
        return `- [L3${tag}${conf}] ${redactSecrets(l3.title)}: ${redactSecrets(l3.hologram)}${loops}${suffix}`;
    }
    if (record.layer === 'l2') {
        const l2 = record;
        const tags = l2.tags.length > 0 ? ` [${redactSecrets(l2.tags.slice(0, 4).join(','))}]` : '';
        return `- [L2${tag}${conf}] ${redactSecrets(l2.text)}${tags}${suffix}`;
    }
    const l1 = record;
    const date = localDate(l1.createdAt);
    return `- [L1 ${date}${tag}${conf}] ${redactSecrets(l1.summary)}${suffix}`;
}
const LAYER_ORDER = ['l3', 'l2', 'l1'];
const LAYER_TITLE = {
    l3: 'L3 · 全息记忆（跨会话整体印象）',
    l2: 'L2 · 事实层（原子事实）',
    l1: 'L1 · 对话层（历史会话摘要）',
};
const BAND_PRIORITY = {
    immediate: 0,
    working: 1,
    background: 2,
};
/** Rank ids in one channel; equal content hashes share a rank (RRF tie rule). */
function channelRanks(candidates, scoreOf) {
    const ranking = candidates
        .filter((candidate) => scoreOf(candidate) > 0)
        .sort((a, b) => {
        const delta = scoreOf(b) - scoreOf(a);
        return delta !== 0 ? delta : a.record.id.localeCompare(b.record.id);
    });
    const ranks = new Map();
    let previousTie;
    let previousRank = 0;
    for (let index = 0; index < ranking.length; index += 1) {
        const candidate = ranking[index];
        const tie = candidate.record.hash.length > 0 ? candidate.record.hash : candidate.record.id;
        const rank = tie === previousTie ? previousRank : index + 1;
        ranks.set(candidate.record.id, rank);
        previousTie = tie;
        previousRank = rank;
    }
    return ranks;
}
function activeWindowCandidates(store, config, projectKey, exclude, asOf) {
    const enabled = config.activeWindowEnabled !== false;
    const maxItems = Number.isFinite(config.activeWindowMaxItems) ? Math.max(0, config.activeWindowMaxItems) : 2;
    const maxChars = Number.isFinite(config.activeWindowMaxChars) ? Math.max(80, config.activeWindowMaxChars) : 420;
    const minImportance = Number.isFinite(config.activeWindowMinImportance) ? config.activeWindowMinImportance : 7;
    if (!enabled || maxItems <= 0)
        return [];
    const kinds = new Set(['preference', 'decision', 'task', 'correction']);
    const records = [...store.visible('l2', projectKey), ...store.visible('l3', projectKey)];
    const eligible = records.filter((record) => {
        if (exclude.has(record.id))
            return false;
        if (!isValidAt(record.claim, asOf))
            return false;
        if (record.layer === 'l2') {
            if (record.supersededBy)
                return false;
            return record.importance >= minImportance && (kinds.has(record.kind) || record.importance >= 8);
        }
        return record.layer === 'l3';
    });
    const ranked = eligible
        .map((record) => ({ record, score: residentScore(record) }))
        .sort((a, b) => b.score - a.score || b.record.updatedAt - a.record.updatedAt);
    const selected = [];
    let chars = 0;
    for (const entry of ranked) {
        if (selected.length >= maxItems)
            break;
        const item = {
            record: entry.record,
            layer: entry.record.layer,
            score: entry.score,
            lexical: 0,
            ngram: 0,
            vector: 0,
            rrf: entry.score,
            channels: ['resident'],
            band: 'working',
            active: true,
        };
        const cost = lineFor(item).length + 1;
        if (selected.length > 0 && chars + cost > maxChars)
            break;
        selected.push(item);
        chars += cost;
    }
    return selected;
}
/**
 * Retrieve and render relevant memory. Returns null when no query channel
 * clears the relevance bar, so quiet sessions receive no injected tokens.
 */
export async function recall(store, embedder, config, query, options) {
    await store.whenReady();
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 4)
        return null;
    const queryTokens = tokenize(trimmedQuery);
    if (queryTokens.length === 0)
        return null;
    const queryLower = trimmedQuery.toLowerCase();
    const queryVector = await embedder.query(trimmedQuery, options.signal, config.queryEmbeddingTimeoutMs);
    const useVectors = embedder.enabled && queryVector !== null;
    const items = [];
    const asOf = options.asOf ?? Date.now();
    const rrfConstant = Math.max(1, Math.round(config.rrfRankConstant || 60));
    const minEvidence = Math.max(0, Math.min(1, config.injectMinEvidence ?? 0.44));
    let queryHits = 0;
    const neuronById = new Map((options.neuronHits ?? []).map((hit) => [hit.id, Math.max(0, Math.min(1, hit.activation))]));
    for (const layer of LAYER_ORDER) {
        const candidates = store.visible(layer, options.projectKey).filter((record) => {
            if (layer === 'l2' && record.supersededBy && !record.claim)
                return false;
            // Phase 3: only claims valid at the requested instant are retrievable.
            if (!isValidAt(record.claim, asOf))
                return false;
            return true;
        });
        if (candidates.length === 0)
            continue;
        const index = new Bm25Index(candidates.map((record) => ({ id: record.id, tokens: tokenize(textOf(record)) })));
        const lexicalScores = index.normalized(queryTokens);
        const baseline = Math.max(0, Math.min(0.9, config.embeddingBaseline));
        const span = Math.max(0.1, 1 - baseline);
        const scored = [];
        for (const record of candidates) {
            const text = textOf(record);
            const lexical = lexicalScores.get(record.id) ?? 0;
            const ngram = ngramCoverage(trimmedQuery, text);
            const hasVector = useVectors && Array.isArray(record.embedding) && record.embedding.length > 0 && record.embeddingModel === config.embeddingModel;
            const rawVec = hasVector && queryVector !== null ? Math.max(0, cosine(queryVector, record.embedding)) : 0;
            const vector = hasVector ? Math.max(0, (rawVec - baseline) / span) : 0;
            const neuron = neuronById.get(record.id) ?? 0;
            const claim = record.claim;
            const confidence = claim ? claim.confidence : 0.7;
            // L1 summaries are keyword-anchored: without direct term overlap a
            // semantically close summary is usually the wrong conversation. A
            // neuron hit is an explicit associative signal, so it may bypass that.
            if (layer === 'l1' && lexical < 0.2 && neuron <= 0)
                continue;
            // Soft confidence weight: neutral at 0.5, mildly rewarding high-confidence
            // claims, mildly discounting claims that are almost certainly guesses.
            const confidenceWeight = 0.9 + 0.2 * Math.max(0, Math.min(1, confidence));
            const relevance = Math.max(lexical, ngram, vector) * confidenceWeight;
            // A neuron hit is a pointer, not proof: it may bypass the low bar only
            // with strong activation, and it never counts as full evidence on its own.
            if (relevance < options.minScore && neuron < 0.75)
                continue;
            // A weak lexical/vector near-match must not win a quota slot merely
            // because the layer has few records, and it must not suppress the
            // active-window fallback: queryHits only counts candidates that actually
            // clear the evidence gate below.
            const evidence = Math.max(relevance, neuron * 0.6);
            // L1 is already anchored by lexical overlap. L2 policy/preference
            // records are the main source of topic drift: without a curated tag
            // that literally appears in the query, require much stronger evidence.
            const layerFloor = layer === 'l1'
                ? Math.max(minEvidence, 0.50)
                : layer === 'l2' && !tagMatchesQuery(record, queryLower)
                    ? Math.max(minEvidence, record.kind === 'decision' ||
                        record.kind === 'task' ||
                        record.kind === 'entity'
                        ? 0.50
                        : 0.55)
                    : minEvidence;
            if (evidence < Math.max(options.minScore, layerFloor))
                continue;
            queryHits += 1;
            scored.push({ record, lexical, ngram, vector, relevance, neuron });
        }
        if (scored.length === 0)
            continue;
        const rrf = new Map();
        const channels = new Map();
        const lexicalRanks = channelRanks(scored, (candidate) => candidate.lexical);
        // `channelRanks` uses the fixed k=60 above; re-add with configurable k.
        for (const [id, rank] of lexicalRanks) {
            rrf.set(id, (rrf.get(id) ?? 0) + 1 / (rrfConstant + rank));
            channels.set(id, [...(channels.get(id) ?? []), 'lexical']);
        }
        const ngramRanks = channelRanks(scored, (candidate) => candidate.ngram);
        for (const [id, rank] of ngramRanks) {
            rrf.set(id, (rrf.get(id) ?? 0) + 1 / (rrfConstant + rank));
            channels.set(id, [...(channels.get(id) ?? []), 'ngram']);
        }
        const vectorRanks = channelRanks(scored, (candidate) => candidate.vector);
        for (const [id, rank] of vectorRanks) {
            rrf.set(id, (rrf.get(id) ?? 0) + 1 / (rrfConstant + rank));
            channels.set(id, [...(channels.get(id) ?? []), 'vector']);
        }
        const neuronRanks = channelRanks(scored, (candidate) => candidate.neuron);
        for (const [id, rank] of neuronRanks) {
            rrf.set(id, (rrf.get(id) ?? 0) + 1 / (rrfConstant + rank));
            channels.set(id, [...(channels.get(id) ?? []), 'neuron']);
        }
        // Confidence is not an additive channel: a merely plausible high-confidence
        // claim must not outrank a strong relevance hit. It acts as a low-confidence
        // evidence penalty and as a tie-breaker in the final ordering instead.
        const maxRrf = Math.max(...rrf.values(), 0);
        const ranked = scored
            .map((candidate) => {
            const raw = rrf.get(candidate.record.id) ?? 0;
            const item = {
                record: candidate.record,
                layer,
                score: maxRrf > 0 ? raw / maxRrf : 0,
                lexical: candidate.lexical,
                ngram: candidate.ngram,
                vector: candidate.vector,
                neuron: candidate.neuron,
                rrf: raw,
                channels: channels.get(candidate.record.id) ?? [],
                band: 'background',
            };
            return item;
        })
            .sort((a, b) => b.rrf - a.rrf ||
            b.lexical - a.lexical ||
            (b.record.claim?.confidence ?? 0.7) - (a.record.claim?.confidence ?? 0.7) ||
            a.record.id.localeCompare(b.record.id));
        const quota = options.counts[layer] ?? 0;
        if (quota <= 0)
            continue;
        let selected = ranked.slice(0, Math.max(0, quota));
        // Neuron candidates compete in RRF like every other channel. Earlier
        // versions reserved a slot for them, which displaced a stronger vector or
        // lexical hit; the human-labelled eval showed that cost ~8 recall points.
        items.push(...selected);
    }
    const active = (!config.activeWindowFallbackOnly || queryHits === 0)
        ? activeWindowCandidates(store, config, options.projectKey, new Set(items.map((item) => item.record.id)), asOf)
        : [];
    if (items.length === 0 && active.length === 0)
        return null;
    // Band assignment: strongest query match gets the immediate budget, next
    // high-value facts/capsules get working, the rest is background.
    // `score` is normalized per layer (each layer's best hit is 1.0), so it is
    // only meaningful inside a layer. Cross-layer ordering uses the raw RRF
    // value, which is computed with the same formula for every layer.
    const orderedQuery = [...items].sort((a, b) => b.rrf - a.rrf || a.record.id.localeCompare(b.record.id));
    orderedQuery.forEach((item, index) => {
        if (index === 0)
            item.band = 'immediate';
        else if (item.layer !== 'l1' && (item.record.importance >= 8 || index < 3))
            item.band = 'working';
        else
            item.band = 'background';
    });
    items.push(...active);
    const header = '[长期记忆自动召回 | holo-memory]\n' +
        '以下是与当前请求可能相关的三层长期记忆。把它当作背景事实；若与当前代码/对话冲突，以现况为准。\n' +
        '带 id 的记忆可在回答中用 id 引用；如果被引用，下一轮会更容易再次召回。\n' +
        '标记 ·源 表示有逐字原文；·指针 表示只有会话/轮次指针；无标记表示仅摘要。memory_open 可回取原文。\n';
    const trailer = '\n（需要更多用 memory_recall(query, layers)；主动保存用 memory_note；纠错用 memory_forget(id)。）';
    const budget = Math.max(200, options.maxChars) - header.length - trailer.length;
    const sections = [];
    for (const layer of LAYER_ORDER) {
        const group = items.filter((item) => !item.active && item.layer === layer).sort((a, b) => b.score - a.score || b.rrf - a.rrf);
        if (group.length > 0)
            sections.push({ title: LAYER_TITLE[layer], items: group });
    }
    if (active.length > 0) {
        sections.push({ title: '主动携带（不依赖本轮问题）', items: [...active].sort((a, b) => b.score - a.score) });
    }
    const order = [...items].sort((a, b) => BAND_PRIORITY[a.band] - BAND_PRIORITY[b.band] || b.score - a.score || b.rrf - a.rrf);
    const keep = new Set();
    const sectionCost = sections.reduce((sum, section) => sum + section.title.length + 1, 0);
    let remaining = budget - sectionCost;
    // Preserve one neuron candidate per layer before active-window rows: the
    // fourth channel must be observable, not silently crowded out by resident
    // constraints when the budget is tight.
    const neuronPriority = items
        .filter((item) => (item.neuron ?? 0) > 0 && !item.active)
        .sort((a, b) => b.score - a.score || b.rrf - a.rrf);
    const neuronLayers = new Set();
    for (const item of neuronPriority) {
        if (neuronLayers.has(item.layer))
            continue;
        const cost = lineFor(item).length + 1;
        if (cost <= remaining) {
            keep.add(item.record.id);
            remaining -= cost;
            neuronLayers.add(item.layer);
        }
    }
    // Active-window rows claim the remaining budget after neuron reservations.
    const activeOrder = [...active].sort((a, b) => b.score - a.score || b.rrf - a.rrf);
    for (const item of activeOrder) {
        if (keep.has(item.record.id))
            continue;
        const cost = lineFor(item).length + 1;
        if (cost <= remaining) {
            keep.add(item.record.id);
            remaining -= cost;
        }
    }
    for (const item of order) {
        if (item.active || keep.has(item.record.id))
            continue;
        const cost = lineFor(item).length + 1;
        if (cost <= remaining) {
            keep.add(item.record.id);
            remaining -= cost;
        }
    }
    if (keep.size === 0 && order.length > 0)
        keep.add(order[0].record.id);
    const build = () => {
        const lines = [];
        for (const section of sections) {
            const sectionItems = section.items.filter((item) => keep.has(item.record.id));
            if (sectionItems.length === 0)
                continue;
            lines.push(`\n${section.title}`);
            for (const item of sectionItems)
                lines.push(lineFor(item));
        }
        return lines.join('\n').trimEnd();
    };
    let body = build();
    while (body.length > 0 && `${header}${body}${trailer}`.length > Math.max(200, options.maxChars)) {
        const removable = order.filter((item) => keep.has(item.record.id));
        const weakest = removable[removable.length - 1];
        if (!weakest)
            break;
        keep.delete(weakest.record.id);
        body = build();
    }
    if (body.length === 0)
        return null;
    const keptItems = items.filter((item) => keep.has(item.record.id));
    const activeCount = keptItems.filter((item) => item.active).length;
    return {
        text: `${header}${body}${trailer}`,
        items: keptItems,
        activeCount,
    };
}
/**
 * Query-independent fallback used when the new prompt is too short to search
 * (for example "继续"): surface the most important L3 capsules plus the most
 * recent L1 summaries so the agent still wakes up with context.
 */
export async function recentFallback(store, projectKey, maxChars) {
    await store.whenReady();
    const l3 = store
        .visible('l3', projectKey)
        .filter((record) => record.layer === 'l3')
        .sort((a, b) => b.importance - a.importance || b.updatedAt - a.updatedAt)
        .slice(0, 3);
    const l1 = store
        .visible('l1', projectKey)
        .filter((record) => record.layer === 'l1')
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 2);
    if (l3.length === 0 && l1.length === 0)
        return null;
    const lines = ['[长期记忆自动召回 | holo-memory]'];
    if (l3.length > 0) {
        lines.push('', LAYER_TITLE.l3);
        for (const record of l3) {
            lines.push(lineFor({ record, layer: 'l3', score: 0, lexical: 0, ngram: 0, vector: 0, rrf: 0, channels: ['resident'], band: 'working' }));
        }
    }
    if (l1.length > 0) {
        lines.push('', LAYER_TITLE.l1);
        for (const record of l1) {
            lines.push(lineFor({ record, layer: 'l1', score: 0, lexical: 0, ngram: 0, vector: 0, rrf: 0, channels: ['recent'], band: 'background' }));
        }
    }
    lines.push('', '（需要更多用 memory_recall；这只是最近/最重要的背景。）');
    const text = lines.join('\n');
    return text.length > maxChars ? `${text.slice(0, Math.max(200, maxChars - 1))}…` : text;
}
