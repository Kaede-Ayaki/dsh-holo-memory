/**
 * Layered JSON store. One file per layer; atomic writes; capped growth.
 * Deliberately simple: every record is plain JSON and human-inspectable,
 * which makes the memory auditable with any text editor.
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { normalizeRecordSource, sourceFor } from './source.js';
/**
 * Walk up from `cwd` to the nearest git root so one repository keeps one
 * project identity even when a session starts in a subdirectory. Falls back to
 * the cwd itself when no `.git` marker is found.
 */
export function resolveProjectRoot(cwd) {
    const start = path.resolve(cwd);
    // Only an existing directory can have a meaningful git root. Without this
    // guard a relative-looking test cwd on another platform would resolve into
    // the current checkout and silently merge unrelated projects.
    if (!existsSync(start))
        return start;
    let current = start;
    for (let depth = 0; depth < 12; depth += 1) {
        try {
            if (existsSync(path.join(current, '.git')))
                return current;
        }
        catch {
            return start;
        }
        const parent = path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    return start;
}
/** Stable project identity derived from the session cwd (git root when any). */
export function projectIdFor(cwd) {
    if (!cwd || cwd.trim().length === 0)
        return { key: '', label: 'global' };
    const root = resolveProjectRoot(cwd.trim());
    const hash = createHash('sha1').update(root).digest('hex').slice(0, 12);
    const base = path.basename(root) || root;
    return { key: `p-${hash}`, label: base };
}
export function contentHash(text) {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
}
export function newId(layer) {
    return `${layer}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}
const CLAIM_STATUSES = new Set(['active', 'superseded', 'expired', 'disputed']);
const FACT_KINDS = new Set(['preference', 'decision', 'fact', 'entity', 'task', 'correction', 'reference']);
const SCOPES = new Set(['user', 'project']);
const SOURCE_TYPES = new Set([
    'user_explicit',
    'user_correction',
    'multi_turn_inference',
    'model_inference',
    'imported',
    'migration_unknown',
]);
function isStringArray(value) {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
/** Return a reason string when a claim is structurally invalid. */
function validateClaim(claim) {
    if (claim === undefined || claim === null)
        return null;
    if (typeof claim !== 'object')
        return 'claim is not an object';
    const value = claim;
    const confidence = value.confidence;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
        return 'claim.confidence is not a number in 0..1';
    }
    if (typeof value.status !== 'string' || !CLAIM_STATUSES.has(value.status))
        return 'claim.status is invalid';
    for (const field of ['observedAt', 'recordedAt']) {
        if (typeof value[field] !== 'number' || !Number.isFinite(value[field]))
            return `claim.${field} is invalid`;
    }
    for (const field of ['validFrom', 'validTo']) {
        const timestamp = value[field];
        if (timestamp !== undefined && (typeof timestamp !== 'number' || !Number.isFinite(timestamp))) {
            return `claim.${field} is invalid`;
        }
    }
    if (value.supersedes !== undefined && !isStringArray(value.supersedes))
        return 'claim.supersedes is invalid';
    const basis = value.confidenceBasis;
    if (typeof basis !== 'object' || basis === null)
        return 'claim.confidenceBasis is missing';
    if (typeof basis.sourceType !== 'string' || !SOURCE_TYPES.has(basis.sourceType))
        return 'claim.basis.sourceType is invalid';
    if (typeof basis.calibrationVersion !== 'string')
        return 'claim.basis.calibrationVersion is missing';
    const quality = basis.extractionQuality;
    if (typeof quality !== 'number' || !Number.isFinite(quality) || quality < 0 || quality > 1) {
        return 'claim.basis.extractionQuality is invalid';
    }
    for (const field of ['corroboration', 'contradiction']) {
        const count = basis[field];
        if (typeof count !== 'number' || !Number.isFinite(count) || count < 0)
            return `claim.basis.${field} is invalid`;
    }
    if (typeof basis.verified !== 'boolean')
        return 'claim.basis.verified is invalid';
    return null;
}
/** Validate one record against its layer schema; return a reason instead of throwing. */
function validateRecord(layer, value, seen) {
    if (typeof value !== 'object' || value === null)
        return { reason: 'not an object' };
    const record = value;
    if (typeof record.id !== 'string' || record.id.length === 0)
        return { reason: 'id is missing' };
    if (seen.has(record.id))
        return { reason: 'duplicate id' };
    if (record.layer !== layer)
        return { reason: `layer mismatch (expected ${layer})` };
    if (typeof record.createdAt !== 'number' || !Number.isFinite(record.createdAt))
        return { reason: 'createdAt is missing' };
    if (record.scope !== undefined && (typeof record.scope !== 'string' || !SCOPES.has(record.scope))) {
        return { reason: 'scope is invalid' };
    }
    if (record.projectKey !== undefined && typeof record.projectKey !== 'string')
        return { reason: 'projectKey is invalid' };
    if (record.importance !== undefined && (typeof record.importance !== 'number' || !Number.isFinite(record.importance))) {
        return { reason: 'importance is invalid' };
    }
    if (layer === 'l1') {
        if (typeof record.summary !== 'string')
            return { reason: 'l1.summary is missing' };
        if (!isStringArray(record.topics))
            return { reason: 'l1.topics must be an array of strings' };
        if (typeof record.sessionId !== 'string')
            return { reason: 'l1.sessionId is missing' };
    }
    else if (layer === 'l2') {
        if (typeof record.text !== 'string')
            return { reason: 'l2.text is missing' };
        if (!isStringArray(record.tags))
            return { reason: 'l2.tags must be an array of strings' };
        if (typeof record.kind !== 'string' || !FACT_KINDS.has(record.kind))
            return { reason: 'l2.kind is invalid' };
    }
    else {
        if (typeof record.title !== 'string')
            return { reason: 'l3.title is missing' };
        if (typeof record.hologram !== 'string')
            return { reason: 'l3.hologram is missing' };
        if (!isStringArray(record.themes))
            return { reason: 'l3.themes must be an array of strings' };
        for (const field of ['entities', 'openLoops', 'sourceSessions']) {
            const value = record[field];
            if (value !== undefined && !isStringArray(value))
                return { reason: `l3.${field} must be an array of strings` };
        }
    }
    const claimReason = validateClaim(record.claim);
    if (claimReason)
        return { reason: claimReason };
    seen.add(record.id);
    return { record: record };
}
export class HoloStore {
    dir;
    config;
    data = {
        l1: [],
        l2: [],
        l3: [],
    };
    dirty = new Set();
    timers = new Map();
    saveChains = new Map();
    ready;
    loaded = false;
    /** Runtime write switch; canonical writes are refused while it is false. */
    writeGuard = () => true;
    /** Records removed by delete/trim since the last drain (for index invalidation). */
    removedRecords = [];
    /** Records rejected at load time, written to quarantine files. */
    quarantine = [];
    /** Quarantine write failures (surfaced by doctor, never swallowed silently). */
    quarantineFailures = [];
    constructor(dir, config) {
        this.dir = path.resolve(dir);
        this.config = config;
        this.ready = this.init();
    }
    /** Install the runtime write switch. */
    setWriteGuard(guard) {
        this.writeGuard = guard;
    }
    writesAllowed() {
        return this.writeGuard();
    }
    assertWritable() {
        if (!this.writeGuard()) {
            throw new Error('holo-memory writes are disabled by the runtime switch');
        }
    }
    async init() {
        await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
        await Promise.all([
            this.loadLayer('l1'),
            this.loadLayer('l2'),
            this.loadLayer('l3'),
        ]);
        this.loaded = true;
    }
    fileFor(layer) {
        return path.join(this.dir, `${layer}.json`);
    }
    async loadLayer(layer) {
        try {
            const raw = await fs.readFile(this.fileFor(layer), 'utf8');
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return;
            const seen = new Set();
            const valid = [];
            const rejected = [];
            for (const entry of parsed) {
                const result = validateRecord(layer, entry, seen);
                if (result.record) {
                    const normalized = normalizeRecordSource(result.record);
                    if (normalized.layer === 'l2' && normalized.claim)
                        normalized.confidence = normalized.claim.confidence;
                    valid.push(normalized);
                }
                else
                    rejected.push({ reason: result.reason ?? 'invalid record', record: entry });
            }
            if (rejected.length > 0) {
                // Never drop a bad row silently: keep it in quarantine for recovery.
                const file = path.join(this.dir, 'quarantine', `${layer}-${Date.now()}.jsonl`);
                try {
                    await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
                    await fs.appendFile(file, rejected.map((item) => JSON.stringify({ reason: item.reason, record: item.record })).join('\n') + '\n', { encoding: 'utf8', mode: 0o600 });
                    this.quarantine.push({ layer, file, count: rejected.length });
                }
                catch (error) {
                    // Quarantine is best-effort for loading, but the failure must be
                    // visible to the doctor instead of being swallowed.
                    this.quarantineFailures.push(`${layer}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            const records = valid;
            if (layer === 'l1')
                this.data.l1 = records;
            else if (layer === 'l2')
                this.data.l2 = records;
            else
                this.data.l3 = records;
        }
        catch (error) {
            const code = error.code;
            if (code !== 'ENOENT')
                throw error;
        }
    }
    async whenReady() {
        await this.ready;
        if (!this.loaded)
            throw new Error('holo-memory store failed to initialize');
    }
    /** All records of one layer (live array; callers must not mutate in place). */
    list(layer) {
        return this.data[layer];
    }
    find(id) {
        for (const layer of ['l1', 'l2', 'l3']) {
            const found = this.data[layer].find((record) => record.id === id);
            if (found)
                return found;
        }
        return undefined;
    }
    /** Records visible from one project: user scope plus the matching project. */
    visible(layer, projectKey) {
        const records = this.data[layer];
        return records.filter((record) => record.scope === 'user' || record.projectKey === projectKey);
    }
    insert(record) {
        this.assertWritable();
        if (record.layer === 'l1')
            this.data.l1.push(record);
        else if (record.layer === 'l2')
            this.data.l2.push(record);
        else
            this.data.l3.push(record);
        this.trim(record.layer);
        this.scheduleSave(record.layer);
        return record;
    }
    update(layer, id, patch, touch = true) {
        this.assertWritable();
        const records = this.data[layer];
        const index = records.findIndex((record) => record.id === id);
        if (index < 0)
            return undefined;
        const updated = {
            ...records[index],
            ...patch,
            id,
            layer,
            updatedAt: touch ? Date.now() : records[index].updatedAt,
        };
        records[index] = updated;
        this.scheduleSave(layer);
        return updated;
    }
    remove(id) {
        this.assertWritable();
        for (const layer of ['l1', 'l2', 'l3']) {
            const records = this.data[layer];
            const index = records.findIndex((record) => record.id === id);
            if (index >= 0) {
                const [removed] = records.splice(index, 1);
                this.removedRecords.push(removed);
                this.scheduleSave(layer);
                return true;
            }
        }
        return false;
    }
    /** Drop the least valuable records when a layer exceeds its cap. */
    trim(layer) {
        const limit = layer === 'l1' ? this.config.maxL1 : layer === 'l2' ? this.config.maxL2 : this.config.maxL3;
        const records = this.data[layer];
        if (records.length <= limit)
            return;
        records.sort((a, b) => {
            const importance = a.importance - b.importance;
            if (importance !== 0)
                return importance;
            return a.createdAt - b.createdAt;
        });
        const drop = records.length - limit;
        const dropped = records.splice(0, drop);
        this.removedRecords.push(...dropped);
    }
    /** Drain records removed by delete/trim so callers can invalidate indexes. */
    takeRemoved() {
        const removed = this.removedRecords;
        this.removedRecords = [];
        return removed;
    }
    scheduleSave(layer) {
        this.dirty.add(layer);
        const existing = this.timers.get(layer);
        if (existing)
            clearTimeout(existing);
        const timer = setTimeout(() => {
            this.timers.delete(layer);
            void this.saveLayer(layer).catch(() => undefined);
        }, 250);
        timer.unref?.();
        this.timers.set(layer, timer);
    }
    saveLayer(layer) {
        this.dirty.delete(layer);
        const previous = this.saveChains.get(layer) ?? Promise.resolve();
        const next = previous
            .catch(() => undefined)
            .then(async () => {
            const content = JSON.stringify(this.data[layer], null, 1);
            await writeFileAtomic(this.fileFor(layer), content, { mode: 0o600, dirMode: 0o700 });
        });
        this.saveChains.set(layer, next);
        return next;
    }
    /** Persist every dirty layer immediately. */
    async flush() {
        for (const timer of this.timers.values())
            clearTimeout(timer);
        this.timers.clear();
        const layers = [...this.dirty];
        this.dirty.clear();
        await Promise.all(layers.map((layer) => this.saveLayer(layer)));
    }
    async stats() {
        await this.whenReady();
        let bytes = 0;
        for (const layer of ['l1', 'l2', 'l3']) {
            try {
                const stat = await fs.stat(this.fileFor(layer));
                bytes += stat.size;
            }
            catch {
                // absent file counts as zero
            }
        }
        const all = [...this.data.l1, ...this.data.l2, ...this.data.l3];
        let sourceBacked = 0;
        let sourcePointer = 0;
        let sourceNone = 0;
        let revisioned = 0;
        for (const record of all) {
            const source = sourceFor(record);
            if (source?.excerpt && source.excerpt.trim().length > 0)
                sourceBacked += 1;
            else if (source)
                sourcePointer += 1;
            else
                sourceNone += 1;
            if ((record.history?.length ?? 0) > 0)
                revisioned += 1;
        }
        return {
            dir: this.dir,
            l1: this.data.l1.length,
            l2: this.data.l2.length,
            l3: this.data.l3.length,
            embedded: all.filter((record) => Array.isArray(record.embedding) && record.embedding.length > 0).length,
            bytes,
            sourceBacked,
            sourcePointer,
            sourceNone,
            revisioned,
            injected: all.filter((record) => (record.accessCount ?? 0) > 0).length,
            cited: all.filter((record) => (record.citedCount ?? 0) > 0).length,
        };
    }
}
