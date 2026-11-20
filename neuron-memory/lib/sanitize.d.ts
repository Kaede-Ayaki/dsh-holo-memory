/**
 * Markdown/HTML cleaner for neuron labels. Canonical holo text keeps its
 * original formatting; the associative index only stores display labels and
 * entity names, so Markdown syntax there is pure noise.
 */
/** Remove Markdown syntax and HTML tags while keeping the readable text. */
export declare function stripMarkdown(value: string): string;
/** A short display label: first line, no Markdown/JSON tail, bounded length. */
export declare function cleanLabel(value: string, max?: number): string;
/** Entity names are even stricter: letters/numbers/underscore/hyphen only. */
export declare function cleanEntity(value: string, max?: number): string;
/** Hash/fragment IDs and bare token IDs are not useful entities. */
export declare function isJunkEntity(value: string): boolean;
