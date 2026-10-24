/**
 * Source pointers ("door plates") for memories.
 *
 * A memory record is an index entry, never the source of truth. It carries a
 * pointer back to the turn it came from plus a short verbatim excerpt. When an
 * exact pointer cannot be produced we say so explicitly instead of inventing
 * one; a wrong pointer is worse than no pointer.
 */
import { createHash } from 'node:crypto';
import { redactSecrets } from './sanitize.js';
export const MAX_EXCERPT_CHARS = 1600;
export function hashText(text) {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
}
/** Derive a pointer from legacy per-layer fields when `source` is absent. */
export function legacySourceFor(record) {
    if (record.layer === 'l1') {
        const l1 = record;
        if (!l1.sessionId)
            return undefined;
        return { kind: 'turn', sessionId: l1.sessionId, turn: l1.turn };
    }
    if (record.layer === 'l2') {
        const l2 = record;
        if (!l2.sourceSessionId)
            return undefined;
        return { kind: 'turn', sessionId: l2.sourceSessionId, turn: l2.sourceTurn };
    }
    const l3 = record;
    if (l3.sourceSessions.length === 0)
        return undefined;
    return { kind: 'turn', sessionId: l3.sourceSessions[0] };
}
export function sourceFor(record) {
    return record.source ?? legacySourceFor(record);
}
export function evidenceOf(record) {
    const source = sourceFor(record);
    if (!source)
        return 'summary';
    if (source.kind === 'manual')
        return 'manual';
    if (source.excerpt && source.excerpt.trim().length > 0)
        return 'source';
    return 'pointer';
}
/** Short marker appended to injected/list lines. No marker = summary only. */
export function evidenceTag(record) {
    const level = evidenceOf(record);
    if (level === 'source')
        return '·源';
    if (level === 'manual')
        return '·手写';
    if (level === 'pointer')
        return '·指针';
    return '';
}
export function evidenceLabel(record) {
    switch (evidenceOf(record)) {
        case 'source':
            return 'verbatim excerpt';
        case 'manual':
            return 'manual entry';
        case 'pointer':
            return 'session pointer only';
        default:
            return 'summary only';
    }
}
/** Build the source for one completed turn, from already-captured text. */
export function sourceFromTurn(capture, maxChars = MAX_EXCERPT_CHARS) {
    const parts = [];
    for (const text of capture.userTexts) {
        if (text.trim().length > 0)
            parts.push(`[user]\n${text.trim()}`);
    }
    for (const text of capture.assistantTexts) {
        if (text.trim().length > 0)
            parts.push(`[assistant]\n${text.trim()}`);
    }
    const raw = redactSecrets(parts.join('\n\n')).trim();
    const excerpt = raw.length > maxChars ? `${raw.slice(0, maxChars)}…` : raw;
    return {
        kind: 'turn',
        sessionId: capture.sessionId,
        turn: capture.turn,
        seqStart: capture.seqStart,
        seqEnd: capture.seqEnd,
        excerpt: excerpt.length > 0 ? excerpt : undefined,
        excerptHash: excerpt.length > 0 ? hashText(excerpt) : undefined,
    };
}
export function sourceFromManual(text, sessionId) {
    const excerpt = redactSecrets(text).trim();
    return {
        kind: 'manual',
        sessionId,
        excerpt: excerpt.length > 0 ? excerpt : undefined,
        excerptHash: excerpt.length > 0 ? hashText(excerpt) : undefined,
    };
}
/**
 * Add a legacy pointer to records loaded from older versions. Do not fabricate
 * an excerpt: a pointer-only record is honest and still openable.
 */
export function normalizeRecordSource(record) {
    if (record.source)
        return record;
    const source = legacySourceFor(record);
    return { ...record, source, revision: record.revision ?? 0 };
}
export function verifySource(record) {
    const source = sourceFor(record);
    if (!source)
        return { valid: null, detail: 'no source pointer' };
    if (source.excerpt && source.excerptHash) {
        const actual = hashText(source.excerpt);
        return actual === source.excerptHash
            ? { valid: true, detail: `excerpt hash ${actual} matches` }
            : { valid: false, detail: `excerpt hash mismatch: stored ${source.excerptHash}, actual ${actual}` };
    }
    if (source.excerpt)
        return { valid: null, detail: 'excerpt present but no hash stored' };
    return { valid: null, detail: 'pointer present but no verbatim excerpt captured' };
}
export function sourcePointerText(record) {
    const source = sourceFor(record);
    if (!source)
        return 'source unavailable';
    if (source.kind === 'manual')
        return source.sessionId ? `manual (session ${source.sessionId})` : 'manual entry';
    const session = source.sessionId ?? '(unknown session)';
    const turn = source.turn === undefined ? '(unknown turn)' : String(source.turn);
    const seq = source.seqStart === undefined
        ? ''
        : ` · seq ${source.seqStart}${source.seqEnd !== undefined ? `–${source.seqEnd}` : ''}`;
    return `session ${session} · turn ${turn}${seq}`;
}
