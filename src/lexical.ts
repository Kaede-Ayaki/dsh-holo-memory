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
export function tokenize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  for (const word of lower.match(WORD_RE) ?? []) {
    if (word.length < 2 && !/[0-9]/.test(word)) continue;
    if (LATIN_STOP.has(word)) continue;
    tokens.push(word);
  }
  for (const run of lower.match(CJK_RE) ?? []) {
    if (run.length === 1) {
      tokens.push(run);
      continue;
    }
    for (let i = 0; i + 1 < run.length; i++) tokens.push(run.slice(i, i + 2));
  }
  return tokens;
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const token of small) if (large.has(token)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface LexicalDoc {
  id: string;
  tokens: string[];
}

/** One BM25 index over a snapshot of documents. */
export class Bm25Index {
  private readonly docs = new Map<string, { tokens: string[]; len: number }>();
  private readonly df = new Map<string, number>();
  private readonly avgdl: number;
  private readonly total: number;

  constructor(docs: LexicalDoc[]) {
    let totalLen = 0;
    for (const doc of docs) {
      if (doc.tokens.length === 0) continue;
      this.docs.set(doc.id, { tokens: doc.tokens, len: doc.tokens.length });
      totalLen += doc.tokens.length;
      for (const token of new Set(doc.tokens)) {
        this.df.set(token, (this.df.get(token) ?? 0) + 1);
      }
    }
    this.total = this.docs.size;
    this.avgdl = this.total > 0 ? totalLen / this.total : 0;
  }

  get size(): number {
    return this.total;
  }

  score(queryTokens: string[], id: string): number {
    const doc = this.docs.get(id);
    if (!doc || queryTokens.length === 0 || this.total === 0) return 0;
    const k1 = 1.2;
    const b = 0.75;
    const freqs = new Map<string, number>();
    for (const token of doc.tokens) freqs.set(token, (freqs.get(token) ?? 0) + 1);
    let score = 0;
    for (const queryToken of new Set(queryTokens)) {
      const df = this.df.get(queryToken);
      if (!df) continue;
      const idf = Math.log(1 + (this.total - df + 0.5) / (df + 0.5));
      const tf = freqs.get(queryToken) ?? 0;
      if (tf === 0) continue;
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
  coverage(queryTokens: string[], id: string): number {
    const doc = this.docs.get(id);
    if (!doc || queryTokens.length === 0 || this.total === 0) return 0;
    const docTokens = new Set(doc.tokens);
    let total = 0;
    let matched = 0;
    for (const token of new Set(queryTokens)) {
      const df = this.df.get(token) ?? 0;
      const idf = Math.log(1 + (this.total - df + 0.5) / (df + 0.5));
      total += idf;
      if (docTokens.has(token)) matched += idf;
    }
    return total > 0 ? matched / total : 0;
  }

  /**
   * Lexical relevance in 0..1: mostly IDF-weighted coverage, plus a small
   * saturation term for raw BM25 strength. Unlike the old max-normalization,
   * one weak match in one document cannot become 1.0.
   */
  normalized(queryTokens: string[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const id of this.docs.keys()) {
      const raw = this.score(queryTokens, id);
      if (raw <= 0) continue;
      const coverage = this.coverage(queryTokens, id);
      const saturation = raw / (raw + 1.5);
      const value = 0.65 * coverage + 0.35 * saturation;
      if (value > 0) out.set(id, value);
    }
    return out;
  }
}

/** Two strings are near-duplicates when their token sets overlap heavily. */
export function nearDuplicate(a: string, b: string, threshold = 0.82): boolean {
  return jaccard(tokenSet(a), tokenSet(b)) >= threshold;
}
