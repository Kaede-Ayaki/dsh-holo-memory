/**
 * Render a record's source pointer and verbatim excerpt for `memory_open`.
 * This is the "open the door plate" operation: it returns what was actually
 * said, not another generated summary. When no verbatim excerpt exists it
 * reports that fact instead of inventing one.
 */
import type { AnyRecord, L1Record, L2Record, L3Record } from './types.js';
import { redactSecrets } from './sanitize.js';
import { sourceFor, sourcePointerText, verifySource } from './source.js';

export interface OpenOptions {
  maxChars?: number;
  history?: boolean;
}

function clip(text: string, maxChars: number): string {
  const clean = redactSecrets(text).trim();
  return clean.length > maxChars ? `${clean.slice(0, maxChars)}…` : clean;
}

function recordLabel(record: AnyRecord): string {
  if (record.layer === 'l3') return `L3 ${(record as L3Record).title}`;
  if (record.layer === 'l2') return `L2 ${(record as L2Record).kind}`;
  return `L1 turn ${(record as L1Record).turn}`;
}

function snapshotText(record: AnyRecord, snapshot: Record<string, unknown>): string {
  if (record.layer === 'l3') return String(snapshot.hologram ?? '');
  if (record.layer === 'l2') return String(snapshot.text ?? '');
  return String(snapshot.summary ?? '');
}

export function openRecord(record: AnyRecord, options: OpenOptions = {}): string {
  const maxChars = Math.max(200, Math.min(8000, Math.floor(options.maxChars ?? 4000)));
  const source = sourceFor(record);
  const lines: string[] = [];
  lines.push(`[${recordLabel(record)} · ${record.id.slice(-8)}]`);
  lines.push(`revision: ${record.revision ?? 0}${record.history?.length ? ` · history: ${record.history.length}` : ''}`);

  if (!source) {
    lines.push('source: unavailable');
    lines.push('evidence: summary only — this record predates source pointers or was written without one.');
    lines.push('Do not treat it as verified. Re-derive it from the current workspace/session before relying on it.');
  } else {
    lines.push(`source: ${sourcePointerText(record)}`);
    const verification = verifySource(record);
    if (source.kind === 'manual') {
      lines.push('evidence: manual entry');
    } else if (source.excerpt) {
      lines.push(
        `evidence: verbatim excerpt${verification.valid === true ? ' (hash verified)' : verification.valid === false ? ' (HASH MISMATCH)' : ''}`,
      );
    } else {
      lines.push('evidence: session pointer only — no verbatim excerpt was captured for this record.');
    }
    if (source.excerpt) {
      lines.push('---');
      lines.push(clip(source.excerpt, maxChars));
    } else {
      lines.push('---');
      lines.push('(no verbatim excerpt stored; use the session/turn pointer above to inspect the original log)');
    }
  }

  if (options.history && record.history && record.history.length > 0) {
    lines.push('', 'history (newest last):');
    for (const entry of record.history.slice(-10)) {
      const text = snapshotText(record, entry.snapshot);
      lines.push(`- rev ${entry.revision} · ${entry.by} · ${new Date(entry.at).toISOString()} · ${clip(text, 240)}`);
    }
  }
  return lines.join('\n');
}
