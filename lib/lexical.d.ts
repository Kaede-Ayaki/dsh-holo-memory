/**
 * Dependency-free lexical retrieval: CJK bigrams + Latin words with a small
 * BM25 implementation. Always available, even when no embedding endpoint is
 * configured or reachable.
 */
/** Split text into lowercase Latin words and CJK bigrams (unigram for len 1). */
export declare function tokenize(text: string): string[];
export declare function tokenSet(text: string): Set<string>;
/**
 * Character n-grams for a second, embedding-independent recall channel.
 * CJK gets 2/3-grams; Latin words are kept whole so `pnpm`/`sqlite` still rank.
 */
export declare function ngramTokens(text: string): string[];
/** Fraction of the query's character n-grams present in the document. */
export declare function ngramCoverage(query: string, text: string): number;
export declare function jaccard(a: Set<string>, b: Set<string>): number;
export interface LexicalDoc {
    id: string;
    tokens: string[];
}
/** One BM25 index over a snapshot of documents. */
export declare class Bm25Index {
    private readonly docs;
    private readonly df;
    private readonly avgdl;
    private readonly total;
    constructor(docs: LexicalDoc[]);
    get size(): number;
    score(queryTokens: string[], id: string): number;
    /**
     * IDF-weighted query-token coverage: what fraction of the query's
     * information mass this document actually matches. A single common token
     * ("这个") cannot look like a perfect lexical match the way max-normalized
     * BM25 did.
     */
    coverage(queryTokens: string[], id: string): number;
    /**
     * Lexical relevance in 0..1: mostly IDF-weighted coverage, plus a small
     * saturation term for raw BM25 strength. Unlike the old max-normalization,
     * one weak match in one document cannot become 1.0.
     */
    normalized(queryTokens: string[]): Map<string, number>;
}
/** Two strings are near-duplicates when their token sets overlap heavily. */
export declare function nearDuplicate(a: string, b: string, threshold?: number): boolean;
