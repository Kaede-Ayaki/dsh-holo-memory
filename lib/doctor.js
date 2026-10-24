import { EmbeddingClient } from './embeddings.js';
import { readInjections } from './injections.js';
import { openRecord } from './open.js';
import { recall } from './retrieval.js';
import { verifySource, sourceFor } from './source.js';
import { MEMORY_AUTHORITY } from './authority.js';
import { thresholdAudit } from './thresholds.js';
function add(checks, check) {
    checks.push(check);
}
function textOf(record) {
    if (record.layer === 'l1')
        return record.summary;
    if (record.layer === 'l2')
        return record.text;
    return `${record.title}\n${record.hologram}`;
}
function duplicateHashCount(records) {
    const seen = new Set();
    let duplicates = 0;
    for (const record of records) {
        if (!record.hash)
            continue;
        if (seen.has(record.hash))
            duplicates += 1;
        else
            seen.add(record.hash);
    }
    return duplicates;
}
export async function runDoctor(deps, options = {}) {
    const deep = options.deep === true;
    const checks = [];
    const { store, config } = deps;
    try {
        await store.whenReady();
        const stats = await store.stats();
        const all = [...store.list('l1'), ...store.list('l2'), ...store.list('l3')];
        const total = stats.l1 + stats.l2 + stats.l3;
        const sourceCovered = stats.sourceBacked + stats.sourcePointer;
        add(checks, {
            id: 'store:ready',
            level: total > 0 ? 'ok' : 'warn',
            title: '存储可读',
            detail: total > 0 ? `${total} 条记录 · ${stats.dir}` : `存储可读，但还没有记忆 · ${stats.dir}`,
        });
        add(checks, {
            id: 'source:coverage',
            level: total === 0 ? 'skip' : stats.sourceNone === 0 ? 'ok' : sourceCovered / total >= 0.8 ? 'warn' : 'error',
            title: '来源指针覆盖',
            detail: `逐字 ${stats.sourceBacked} · 仅指针 ${stats.sourcePointer} · 无来源 ${stats.sourceNone} · 修订 ${stats.revisioned}`,
        });
        const badHashes = all.filter((record) => verifySource(record).valid === false);
        add(checks, {
            id: 'source:hash',
            level: badHashes.length === 0 ? (stats.sourceBacked > 0 ? 'ok' : 'skip') : 'error',
            title: '原文哈希校验',
            detail: stats.sourceBacked === 0
                ? '还没有逐字原文片段可校验'
                : badHashes.length === 0
                    ? `${stats.sourceBacked} 条原文片段哈希一致`
                    : `${badHashes.length} 条哈希不一致：${badHashes.slice(0, 3).map((record) => record.id.slice(-8)).join(', ')}`,
        });
        if (deps.embedder?.enabled && total > 0) {
            const stale = all.filter((record) => record.embedding && record.embeddingModel !== config.embeddingModel).length;
            const ratio = stats.embedded / total;
            add(checks, {
                id: 'embedding:coverage',
                level: ratio >= 0.5 ? 'ok' : 'warn',
                title: '向量覆盖',
                detail: `${stats.embedded}/${total} 已向量化（${Math.round(ratio * 100)}%）`,
            });
            add(checks, {
                id: 'embedding:stale',
                level: stale === 0 ? 'ok' : 'warn',
                title: '向量模型漂移',
                detail: stale === 0 ? `全部匹配 ${config.embeddingModel}` : `${stale} 条向量来自旧模型，会按需回填`,
            });
        }
        else {
            add(checks, {
                id: 'embedding:coverage',
                level: 'skip',
                title: '向量覆盖',
                detail: 'embedding 未启用；词法与 n-gram 通道仍可用',
            });
        }
        const duplicates = duplicateHashCount(all);
        add(checks, {
            id: 'duplicates:hash',
            level: duplicates === 0 ? 'ok' : 'warn',
            title: '重复内容',
            detail: duplicates === 0 ? '没有相同内容哈希' : `${duplicates} 条内容哈希重复，检查去重逻辑或手动写入`,
        });
        add(checks, {
            id: 'citation:effectiveness',
            level: stats.injected === 0 ? 'skip' : stats.cited > 0 ? 'ok' : 'warn',
            title: '引用回写',
            detail: stats.injected === 0
                ? '还没有记录被注入过'
                : `${stats.injected} 条被注入，其中 ${stats.cited} 条被回答引用（未被引用的注入量可作误伤代理指标）`,
        });
        const events = await readInjections(store.dir, 20);
        const latest = events[0]?.ts ?? 0;
        const ageDays = latest > 0 ? (Date.now() - latest) / 86_400_000 : Infinity;
        add(checks, {
            id: 'injection:recent',
            level: total === 0 ? 'skip' : events.length === 0 ? 'warn' : ageDays > 30 ? 'warn' : 'ok',
            title: '召回审计',
            detail: events.length === 0
                ? '还没有自动召回审计记录；新会话触发一次召回后再看'
                : `最近 ${events.length} 次，最新 ${ageDays < 1 ? '今天' : `${Math.floor(ageDays)} 天前`}`,
        });
        const thresholds = thresholdAudit(config);
        const invalid = thresholds.filter((item) => !Number.isFinite(item.value) || item.value < 0);
        add(checks, {
            id: 'thresholds:valid',
            level: invalid.length === 0 ? 'ok' : 'error',
            title: '阈值合法性',
            detail: invalid.length === 0 ? `${thresholds.length} 条阈值均有来历（见 README）` : `${invalid.length} 条阈值非法`,
        });
        if (deep) {
            const sourceRecord = all.find((record) => {
                const source = sourceFor(record);
                return source?.kind === 'turn' && Boolean(source.excerpt);
            });
            if (!sourceRecord) {
                add(checks, {
                    id: 'source:open',
                    level: 'skip',
                    title: '真取一次来源',
                    detail: '没有逐字原文片段可打开',
                });
            }
            else {
                const opened = openRecord(sourceRecord, { maxChars: 400 });
                const valid = opened.includes('hash verified');
                add(checks, {
                    id: 'source:open',
                    level: valid ? 'ok' : 'warn',
                    title: '真取一次来源',
                    detail: valid ? `打开 ${sourceRecord.id.slice(-8)}，原文哈希校验通过` : `打开 ${sourceRecord.id.slice(-8)}，但没有通过哈希校验`,
                });
            }
            const sample = all.find((record) => textOf(record).trim().length > 4);
            if (!sample) {
                add(checks, { id: 'retrieval:probe', level: 'skip', title: '真跑一次召回', detail: '没有可用于探针的记录' });
            }
            else {
                try {
                    const lexicalOnly = new EmbeddingClient({ ...config, embeddingEnabled: false, embeddingModel: '' });
                    const query = textOf(sample).slice(0, 40);
                    const result = await recall(store, lexicalOnly, config, query, {
                        projectKey: sample.projectKey,
                        currentSessionId: 'memory-doctor',
                        maxChars: 1400,
                        minScore: 0.01,
                        counts: { l1: 1, l2: 1, l3: 1 },
                        signal: AbortSignal.timeout(5000),
                    });
                    add(checks, {
                        id: 'retrieval:probe',
                        level: result ? 'ok' : 'warn',
                        title: '真跑一次召回',
                        detail: result ? `词法探针命中 ${result.items.length} 条（${result.text.length} 字符）` : '词法探针没有命中，检查索引/阈值',
                    });
                }
                catch (error) {
                    add(checks, {
                        id: 'retrieval:probe',
                        level: 'warn',
                        title: '真跑一次召回',
                        detail: `探针异常：${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }
            const latestEvent = events[0];
            if (latestEvent) {
                const missing = latestEvent.selected.filter((item) => !store.find(item.id)).length;
                add(checks, {
                    id: 'injection:ids',
                    level: missing === 0 ? 'ok' : 'warn',
                    title: '审计记录仍可解析',
                    detail: missing === 0 ? `最新一次 ${latestEvent.selected.length} 个 id 都能找到` : `${missing} 个 id 已被删除或丢失`,
                });
            }
        }
        add(checks, {
            id: 'doctor:self',
            level: 'ok',
            title: '体检器自检',
            detail: `${checks.length} 项检查已执行，未跳过未知检查项`,
        });
        const summary = { ok: 0, warn: 0, error: 0, skip: 0 };
        for (const check of checks)
            summary[check.level] += 1;
        return {
            ok: summary.error === 0,
            deep,
            authority: MEMORY_AUTHORITY,
            generatedAt: Date.now(),
            checks,
            summary,
            stats,
        };
    }
    catch (error) {
        checks.push({
            id: 'doctor:crashed',
            level: 'error',
            title: '体检器崩溃',
            detail: error instanceof Error ? error.message : String(error),
        });
        return {
            ok: false,
            deep,
            authority: MEMORY_AUTHORITY,
            generatedAt: Date.now(),
            checks,
            summary: { ok: 0, warn: 0, error: 1, skip: 0 },
        };
    }
}
