/**
 * Dependency-free lexical retrieval: CJK bigrams + Latin words with a small
 * BM25 implementation. Always available, even when no embedding endpoint is
 * configured or reachable.
 */
const LATIN_STOP = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'are', 'was', 'were',
    'you', 'your', 'have', 'has', 'had', 'not', 'but', 'can', 'will', 'would',
    'about', 'into', 'when', 'what', 'how', 'why', 'which', 'then', 'than',
    'there', 'their', 'they', 'them', 'its', 'our', 'out', 'all', 'any',
    '的', '了', '是', '在', '我', '你', '他', '她', '它', '们', '和', '与',
    '就', '都', '也', '还', '要', '会', '能', '可以', '这', '那', '一个',
    '什么', '怎么', '我们', '你们', '他们', '因为', '所以', '但是',
    // Common conversational bigrams/words that carry no retrieval signal.
    '这个', '那个', '这些', '那些', '看看', '一下', '真的', '是不是', '还是',
    '就是', '没有', '已经', '现在', '目前', '自己', '的话', '如果', '然后',
    '而且', '怎样', '如何', '请问', '帮我', '看看',
]);
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+/g;
const WORD_RE = /[a-z0-9][a-z0-9_+.#-]*/g;
/** Split text into lowercase Latin words and CJK bigrams (unigram for len 1). */
export function tokenize(text) {
    if (!text)
        return [];
    const lower = text.toLowerCase();
    const tokens = [];
    for (const word of lower.match(WORD_RE) ?? []) {
        if (word.length < 2 && !/[0-9]/.test(word))
            continue;
        if (LATIN_STOP.has(word))
            continue;
        tokens.push(word);
    }
    for (const run of lower.match(CJK_RE) ?? []) {
        if (run.length === 1) {
            tokens.push(run);
            continue;
        }
        for (let i = 0; i + 1 < run.length; i++)
            tokens.push(run.slice(i, i + 2));
    }
    return tokens;
}
export function tokenSet(text) {
    return new Set(tokenize(text));
}
/**
 * Character n-grams for a second, embedding-independent recall channel.
 * CJK gets 2/3-grams; Latin words are kept whole so `pnpm`/`sqlite` still rank.
 */
export function ngramTokens(text) {
    if (!text)
        return [];
    const lower = text.toLowerCase();
    const tokens = [];
    for (const word of lower.match(WORD_RE) ?? []) {
        if (word.length >= 3)
            tokens.push(`w:${word}`);
    }
    for (const run of lower.match(CJK_RE) ?? []) {
        for (const size of [2, 3]) {
            for (let i = 0; i + size <= run.length; i++)
                tokens.push(`${size}:${run.slice(i, i + size)}`);
        }
    }
    return tokens;
}
/** Fraction of the query's character n-grams present in the document. */
export function ngramCoverage(query, text) {
    const queryTokens = new Set(ngramTokens(query));
    if (queryTokens.size === 0)
        return 0;
    const doc = new Set(ngramTokens(text));
    let matched = 0;
    for (const token of queryTokens)
        if (doc.has(token))
            matched += 1;
    return matched / queryTokens.size;
}
export function jaccard(a, b) {
    if (a.size === 0 || b.size === 0)
        return 0;
    let inter = 0;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const token of small)
        if (large.has(token))
            inter++;
    return inter / (a.size + b.size - inter);
}
/** One BM25 index over a snapshot of documents. */
export class Bm25Index {
    docs = new Map();
    df = new Map();
    avgdl;
    total;
    constructor(docs) {
        let totalLen = 0;
        for (const doc of docs) {
            if (doc.tokens.length === 0)
                continue;
            this.docs.set(doc.id, { tokens: doc.tokens, len: doc.tokens.length });
            totalLen += doc.tokens.length;
            for (const token of new Set(doc.tokens)) {
                this.df.set(token, (this.df.get(token) ?? 0) + 1);
            }
        }
        this.total = this.docs.size;
        this.avgdl = this.total > 0 ? totalLen / this.total : 0;
    }
    get size() {
        return this.total;
    }
    score(queryTokens, id) {
        const doc = this.docs.get(id);
        if (!doc || queryTokens.length === 0 || this.total === 0)
            return 0;
        const k1 = 1.2;
        const b = 0.75;
        const freqs = new Map();
        for (const token of doc.tokens)
            freqs.set(token, (freqs.get(token) ?? 0) + 1);
        let score = 0;
        for (const queryToken of new Set(queryTokens)) {
            const df = this.df.get(queryToken);
            if (!df)
                continue;
            const idf = Math.log(1 + (this.total - df + 0.5) / (df + 0.5));
            const tf = freqs.get(queryToken) ?? 0;
            if (tf === 0)
                continue;
            score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc.len / this.avgdl))));
        }
        return score;
    }
    /**
     * IDF-weighted query-token coverage: what fraction of the query's
     * information mass this document actually matches. A single common token
     * ("这个") cannot look like a perfect lexical match the way max-normalized
     * BM25 did.
     */
    coverage(queryTokens, id) {
        const doc = this.docs.get(id);
        if (!doc || queryTokens.length === 0 || this.total === 0)
            return 0;
        const docTokens = new Set(doc.tokens);
        let total = 0;
        let matched = 0;
        for (const token of new Set(queryTokens)) {
            const df = this.df.get(token) ?? 0;
            const idf = Math.log(1 + (this.total - df + 0.5) / (df + 0.5));
            total += idf;
            if (docTokens.has(token))
                matched += idf;
        }
        return total > 0 ? matched / total : 0;
    }
    /**
     * Lexical relevance in 0..1: mostly IDF-weighted coverage, plus a small
     * saturation term for raw BM25 strength. Unlike the old max-normalization,
     * one weak match in one document cannot become 1.0.
     */
    normalized(queryTokens) {
        const out = new Map();
        for (const id of this.docs.keys()) {
            const raw = this.score(queryTokens, id);
            if (raw <= 0)
                continue;
            const coverage = this.coverage(queryTokens, id);
            const saturation = raw / (raw + 1.5);
            const value = 0.65 * coverage + 0.35 * saturation;
            if (value > 0)
                out.set(id, value);
        }
        return out;
    }
}
/** Two strings are near-duplicates when their token sets overlap heavily. */
export function nearDuplicate(a, b, threshold = 0.82) {
    return jaccard(tokenSet(a), tokenSet(b)) >= threshold;
}
