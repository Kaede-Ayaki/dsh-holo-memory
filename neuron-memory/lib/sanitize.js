/**
 * Markdown/HTML cleaner for neuron labels. Canonical holo text keeps its
 * original formatting; the associative index only stores display labels and
 * entity names, so Markdown syntax there is pure noise.
 */
const FENCE = /(^|\n)(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n\2[^\n]*(\n|$)/g;
/** Remove Markdown syntax and HTML tags while keeping the readable text. */
export function stripMarkdown(value) {
    let text = String(value ?? '')
        .replace(/\r\n?/g, '\n')
        // Remove YAML front matter.
        .replace(/^\s*---\s*\n[\s\S]*?\n---\s*(?:\n|$)/, ' ')
        // Remove fenced code blocks from labels: their contents are usually JSON,
        // prompts or tables, not a useful synapse label. Inline code is kept.
        .replace(FENCE, (_all, lead) => `${lead}`)
        .replace(/`([^`]*)`/g, '$1')
        .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
        // Images and links: keep alt/link text.
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        // Headings, quotes, lists, task-list boxes.
        .replace(/^\s{0,3}#{1,6}\s*/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*[-*+]\s+(?:\[[ xX]\]\s*)?/gm, '')
        .replace(/^\s*\d+[.)]\s+/gm, '')
        // Table separator rows and cell pipes.
        .replace(/^\s*\|?[\s:|-]{3,}\|?[\s:|-]*$/gm, ' ')
        .replace(/^\s*(?:[-:]{2,}\s*)+$/gm, ' ')
        .replace(/\|/g, ' ')
        // Remaining bracket labels, emphasis, strikethrough, inline markers.
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/[[\]]/g, ' ')
        .replace(/[*~`]+/g, '')
        .replace(/[#<>]+/g, ' ')
        .replace(/(?<!\w)_+|_+(?!\w)/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ')
        .trim();
    return text;
}
/** A short display label: first line, no Markdown/JSON tail, bounded length. */
export function cleanLabel(value, max = 120) {
    let text = stripMarkdown(value);
    // Long summaries often append a JSON prompt after the prose. A synapse
    // label must not absorb that payload.
    const codeAt = text.search(/\bjson\s*\{|\{\s*"|^\s*[\[{]/i);
    if (codeAt > 8)
        text = text.slice(0, codeAt).trim();
    const first = text.split(/\n/)[0]?.trim() || text;
    return first.slice(0, max).trim();
}
/** Entity names are even stricter: letters/numbers/underscore/hyphen only. */
export function cleanEntity(value, max = 48) {
    return stripMarkdown(value)
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_-]+/gu, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, max);
}
/** Hash/fragment IDs and bare token IDs are not useful entities. */
export function isJunkEntity(value) {
    const text = value.trim();
    if (text.length < 2)
        return true;
    if (/^(t|m|e|h)_[a-f0-9]{12,}$/i.test(text))
        return true;
    if (/^[a-f0-9]{16,}$/i.test(text))
        return true;
    if (/^(l[123]|https?|www|com|org|cn|zh|api|docs|guides)$/i.test(text))
        return true;
    return false;
}
