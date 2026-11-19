/**
 * A series: a distilled user preference / habit / personality profile.
 *
 * A is NOT a fourth canonical fact layer. It is a compact, evidence-linked
 * profile derived from the existing L1/L2/L3 records; the canonical evidence
 * stays in the layered store and can always be inspected with memory_open.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
import { redactSecrets } from './sanitize.js';
const FILE = 'a.json';
const PROFILE_ID = 'a_user_profile';
function clean(value, max = 220) {
    return redactSecrets(String(value).replace(/\s+/g, ' ').trim()).slice(0, max);
}
function uniq(values, max, maxChars = 220) {
    const seen = new Set();
    const out = [];
    for (const value of values) {
        const text = clean(value, maxChars);
        if (text.length < 2)
            continue;
        // L2 often contains several phrasings of the same rule; key by the
        // normalized opening so the profile does not amplify repetition.
        const key = text.replace(/[「」“”"'，。；：、！？\s]/g, '').slice(0, 36);
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(text);
        if (out.length >= max)
            break;
    }
    return out;
}
function topByImportance(records) {
    return [...records].sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}
function tokensOf(text) {
    const tokens = new Set();
    for (const word of text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [])
        tokens.add(word);
    const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
    for (let i = 0; i + 2 <= cjk.length; i++)
        tokens.add(cjk.slice(i, i + 2));
    return tokens;
}
function overlap(a, b) {
    if (a.size === 0 || b.size === 0)
        return 0;
    let shared = 0;
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const token of small)
        if (large.has(token))
            shared += 1;
    return shared / Math.max(1, Math.min(a.size, b.size));
}
/** Coarse facet labels for the recurring preference families. */
function facetKey(text) {
    if (/MOSS|caption|bbox|JSON 提示词/i.test(text))
        return 'moss';
    if (/tag 流|Columbina|裸围栏|tag 串/i.test(text))
        return 'tag-stream';
    if (/肢体|多一只脚|one foot|exactly one head|手部|下肢/i.test(text))
        return 'anatomy';
    if (/查证|wiki|立绘|官方外观|角色卡/i.test(text))
        return 'verify';
    if (/可复制|围栏|代码块|copyable/i.test(text))
        return 'copyable-delivery';
    if (/LoRA|lora|训练|数据集/i.test(text))
        return 'lora';
    if (/中文|英文|语言/i.test(text))
        return 'language';
    return `other:${text.replace(/[\s「」“”"'，。；：、！？]/g, '').slice(0, 24)}`;
}
/** Keep different facets instead of six paraphrases of the same rule. */
function diverse(values, max, maxChars = 260, threshold = 0.42) {
    const out = [];
    const tokenSets = [];
    const facets = new Set();
    for (const value of values) {
        const text = clean(value, maxChars);
        if (text.length < 2)
            continue;
        const facet = facetKey(text);
        if (facets.has(facet))
            continue;
        facets.add(facet);
        const tokens = tokensOf(text);
        if (tokenSets.some((seen) => overlap(tokens, seen) >= threshold))
            continue;
        out.push(text);
        tokenSets.push(tokens);
        if (out.length >= max)
            break;
    }
    return out;
}
function parse(raw) {
    try {
        const value = JSON.parse(raw);
        const source = value.profile ?? value;
        if (!source || typeof source !== 'object' || typeof source.title !== 'string')
            return null;
        const list = (input) => (Array.isArray(input) ? input.filter((x) => typeof x === 'string') : []);
        return {
            id: typeof source.id === 'string' ? source.id : PROFILE_ID,
            title: source.title,
            summary: typeof source.summary === 'string' ? source.summary : '',
            preferences: list(source.preferences),
            habits: list(source.habits),
            personality: list(source.personality),
            workingStyle: list(source.workingStyle),
            confirmFor: list(source.confirmFor),
            autoApply: source.autoApply !== false,
            evidenceIds: list(source.evidenceIds),
            importance: typeof source.importance === 'number' ? source.importance : 9,
            createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
            updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now(),
            revision: typeof source.revision === 'number' ? source.revision : 0,
        };
    }
    catch {
        return null;
    }
}
/**
 * Deterministic profile distillation from L1/L2/L3. This deliberately keeps
 * evidence ids instead of inventing a new fact source.
 */
export function buildAProfile(store, previous) {
    const l1 = store.list('l1');
    const l2 = store.list('l2');
    const l3 = store.list('l3');
    const userL2 = l2.filter((record) => record.scope === 'user' && !record.supersededBy);
    const userL3 = l3.filter((record) => record.scope === 'user');
    const evidenceIds = [];
    const preferenceRecords = topByImportance((userL2.length >= 2 ? userL2 : l2).filter((record) => !record.supersededBy && (record.kind === 'preference' || record.kind === 'decision' || record.kind === 'correction'))).slice(0, 10);
    const preferences = diverse(preferenceRecords.map((record) => record.text), 8);
    evidenceIds.push(...preferenceRecords.map((record) => record.id));
    const habitRecords = topByImportance((userL2.length >= 2 ? userL2 : l2).filter((record) => !record.supersededBy &&
        /习惯|每次|总是|一律|必须|不要|优先|喜欢|讨厌|直接|先给|结论|简洁|中文|围栏|确认/.test(record.text))).slice(0, 8);
    const habits = diverse(habitRecords.length > 0
        ? habitRecords.map((record) => record.text)
        : l1.slice(-8).map((record) => `${record.intent || record.topics.join('、') || '对话任务'}：${record.summary}`), 6);
    evidenceIds.push(...habitRecords.map((record) => record.id));
    const personalityRecords = topByImportance(userL3.length > 0 ? userL3 : l3).slice(0, 6);
    const personality = uniq(personalityRecords.map((record) => `${record.title}：${record.hologram.slice(0, 180)}`), 4, 260);
    evidenceIds.push(...personalityRecords.map((record) => record.id));
    const styleSources = l1.slice(-30).flatMap((record) => [record.intent ?? '', ...record.topics]);
    const workingStyle = uniq(styleSources.filter((value) => value.length > 0), 8, 40);
    evidenceIds.push(...l1.slice(-10).map((record) => record.id));
    if (preferences.length === 0 && habits.length === 0 && personality.length === 0 && workingStyle.length === 0) {
        return previous;
    }
    const now = Date.now();
    const confirmFor = uniq([
        ...(previous?.confirmFor ?? []),
        '不可逆操作',
        '公开发布/发帖',
        '付费或消耗额度',
        '安全、隐私、权限相关',
        '关系或重要承诺',
    ], 8, 60);
    return {
        id: PROFILE_ID,
        title: 'A · 用户偏好与人格',
        summary: '从 L1-L3 蒸馏出的稳定偏好、行为习惯与工作方式。低风险、可逆事项可默认按此执行；重要抉择必须先询问用户。',
        preferences,
        habits,
        personality,
        workingStyle,
        confirmFor,
        autoApply: true,
        evidenceIds: [...new Set(evidenceIds)].slice(0, 40),
        importance: 9,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        revision: (previous?.revision ?? 0) + 1,
    };
}
export class ProfileStore {
    dir;
    profile = null;
    writeGuard = () => true;
    chain = Promise.resolve();
    readyPromise;
    constructor(dir) {
        this.dir = path.resolve(dir);
    }
    async whenReady() {
        this.readyPromise ??= (async () => {
            try {
                this.profile = parse(await fs.readFile(path.join(this.dir, FILE), 'utf8'));
            }
            catch {
                this.profile = null;
            }
        })();
        await this.readyPromise;
    }
    setWriteGuard(guard) {
        this.writeGuard = guard;
    }
    get() {
        return this.profile ? structuredClone(this.profile) : null;
    }
    async save(profile) {
        if (!this.writeGuard())
            return;
        await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
        await writeFileAtomic(path.join(this.dir, FILE), `${JSON.stringify({ profile }, null, 2)}\n`, {
            mode: 0o600,
            dirMode: 0o700,
        });
    }
    async refresh(store) {
        if (!this.writeGuard())
            return this.get();
        await store.whenReady();
        const next = buildAProfile(store, this.profile);
        if (!next)
            return this.get();
        this.chain = this.chain.catch(() => undefined).then(async () => {
            await this.save(next);
            this.profile = next;
        });
        await this.chain;
        return this.get();
    }
}
export function renderAProfile(profile, maxChars = 800) {
    if (!profile)
        return '';
    const compact = (value, max) => {
        const text = clean(value, max);
        return text.length >= max ? `${text.slice(0, Math.max(8, max - 1))}…` : text;
    };
    const boundary = '执行边界：低风险、可逆、日常事项默认按上述偏好执行；重要、不可逆、涉及付费/公开发布/安全隐私/关系边界的抉择，必须先询问用户。';
    const lines = ['[A · 用户偏好与人格]', compact(profile.summary, 100)];
    if (profile.preferences.length > 0) {
        lines.push('偏好偏向：', ...profile.preferences.slice(0, 3).map((x) => `- ${compact(x, 96)}`));
    }
    if (profile.habits.length > 0) {
        lines.push('行为习惯：', ...profile.habits.slice(0, 2).map((x) => `- ${compact(x, 88)}`));
    }
    if (profile.personality.length > 0) {
        lines.push('人格/工作方式：', `- ${compact(profile.personality[0], 110)}`);
    }
    if (profile.workingStyle.length > 0) {
        lines.push(`工作风格关键词：${profile.workingStyle.slice(0, 8).map((x) => compact(x, 12)).join('、')}`);
    }
    const budget = Math.max(160, maxChars - boundary.length - 1);
    let body = lines.join('\n');
    if (body.length > budget)
        body = `${body.slice(0, Math.max(80, budget - 1))}…`;
    return `${body}\n${boundary}`;
}
