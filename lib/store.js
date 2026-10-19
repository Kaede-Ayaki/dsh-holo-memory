/**
 * Layered JSON store. One file per layer; atomic writes; capped growth.
 * Deliberately simple: every record is plain JSON and human-inspectable,
 * which makes the memory auditable with any text editor.
 */
import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
/** Stable project identity derived from the session cwd. */
export function projectIdFor(cwd) {
    if (!cwd || cwd.trim().length === 0)
        return { key: '', label: 'global' };
    const hash = createHash('sha1').update(cwd).digest('hex').slice(0, 12);
    const base = path.basename(cwd.trim()) || cwd.trim();
    return { key: `p-${hash}`, label: base };
}
export function contentHash(text) {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
}
export function newId(layer) {
    return `${layer}_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
}
function isRecord(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return (typeof record.id === 'string' &&
        (record.layer === 'l1' || record.layer === 'l2' || record.layer === 'l3') &&
        typeof record.createdAt === 'number');
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
    constructor(dir, config) {
        this.dir = path.resolve(dir);
        this.config = config;
        this.ready = this.init();
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
            const records = parsed.filter(isRecord).filter((record) => record.layer === layer);
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
    update(layer, id, patch) {
        const records = this.data[layer];
        const index = records.findIndex((record) => record.id === id);
        if (index < 0)
            return undefined;
        const updated = { ...records[index], ...patch, id, layer, updatedAt: Date.now() };
        records[index] = updated;
        this.scheduleSave(layer);
        return updated;
    }
    remove(id) {
        for (const layer of ['l1', 'l2', 'l3']) {
            const records = this.data[layer];
            const index = records.findIndex((record) => record.id === id);
            if (index >= 0) {
                records.splice(index, 1);
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
        records.splice(0, drop);
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
        return {
            dir: this.dir,
            l1: this.data.l1.length,
            l2: this.data.l2.length,
            l3: this.data.l3.length,
            embedded: all.filter((record) => Array.isArray(record.embedding) && record.embedding.length > 0).length,
            bytes,
        };
    }
}
