/**
 * Append-only audit of automatic recalls. One JSONL line per injected turn:
 * who (session/cwd), what question, which record ids, how many chars.
 * The console reads the tail; it is the evidence that a *different* session
 * actually received memory, not just that the store contains it.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { redactSecrets } from './sanitize.js';
const LOG_NAME = 'injections.jsonl';
const MAX_BYTES = 1_000_000;
const KEEP_LINES = 1000;
export function injectionLogPath(dir) {
    return path.join(dir, LOG_NAME);
}
/** Append one event, rotating the file when it grows too large. */
export async function appendInjection(dir, event) {
    const file = injectionLogPath(dir);
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const safe = {
        ...event,
        query: redactSecrets(event.query).slice(0, 200),
        selected: event.selected.slice(0, 20),
    };
    await fs.appendFile(file, `${JSON.stringify(safe)}\n`, { encoding: 'utf8', mode: 0o600 });
    try {
        const stat = await fs.stat(file);
        if (stat.size <= MAX_BYTES)
            return;
        const raw = await fs.readFile(file, 'utf8');
        const lines = raw
            .split('\n')
            .filter((line) => line.trim().length > 0)
            .slice(-KEEP_LINES);
        await writeFileAtomic(file, `${lines.join('\n')}\n`, { mode: 0o600, dirMode: 0o700 });
    }
    catch {
        // audit logging must never break the turn
    }
}
/** Most recent injections, newest first. */
export async function readInjections(dir, limit = 50) {
    try {
        const raw = await fs.readFile(injectionLogPath(dir), 'utf8');
        const lines = raw.split('\n').filter((line) => line.trim().length > 0).slice(-Math.max(1, limit));
        const events = [];
        for (const line of lines) {
            try {
                const event = JSON.parse(line);
                if (event && typeof event.ts === 'number' && typeof event.sessionId === 'string')
                    events.push(event);
            }
            catch {
                // skip a torn line
            }
        }
        return events.reverse();
    }
    catch {
        return [];
    }
}
