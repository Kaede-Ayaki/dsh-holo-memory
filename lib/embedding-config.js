/**
 * User-editable embedding configuration for the in-DSH console.
 *
 * Provider URL/model/dimensions live in `embedding.json` under the memory root;
 * the API key stays in a separate 0600 `embedding.key` file (never in JSON,
 * never returned to the client). The console's "test" button probes the
 * endpoint without saving anything.
 */
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
const SETTINGS_NAME = 'embedding.json';
const DEFAULT_KEY_NAME = 'embedding.key';
export function embeddingSettingsPath(dir) {
    return path.join(dir, SETTINGS_NAME);
}
export function defaultEmbeddingKeyPath(dir) {
    return path.join(dir, DEFAULT_KEY_NAME);
}
function asString(value) {
    return typeof value === 'string' ? value : '';
}
/** Read the saved console config; malformed/missing files mean "not configured". */
export function loadEmbeddingConfig(dir) {
    try {
        const raw = readFileSync(embeddingSettingsPath(dir), 'utf8');
        const parsed = JSON.parse(raw);
        const baseUrl = asString(parsed.baseUrl).trim();
        const model = asString(parsed.model).trim();
        if (baseUrl.length === 0 || model.length === 0)
            return null;
        return {
            version: 1,
            baseUrl,
            model,
            dimensions: Number.isFinite(parsed.dimensions) ? Math.max(0, Number(parsed.dimensions)) : 0,
            baseline: Number.isFinite(parsed.baseline) ? Math.min(0.9, Math.max(0, Number(parsed.baseline))) : 0.22,
            keyFile: asString(parsed.keyFile).trim() || defaultEmbeddingKeyPath(dir),
        };
    }
    catch {
        return null;
    }
}
/** Overlay console-saved settings onto the loader config at plugin boot. */
export function applySavedEmbeddingConfig(config, dir) {
    const saved = loadEmbeddingConfig(dir);
    if (!saved)
        return;
    config.embeddingEnabled = true;
    config.embeddingBaseUrl = saved.baseUrl;
    config.embeddingModel = saved.model;
    config.embeddingDimensions = saved.dimensions;
    config.embeddingBaseline = saved.baseline;
    config.embeddingApiKeyFile = saved.keyFile;
}
/** Read the key value for a probe; callers must never return it to the browser. */
export function readEmbeddingKey(config) {
    const envName = config.embeddingApiKeyEnv.trim();
    if (envName.length > 0) {
        const fromEnv = (process.env[envName] ?? '').trim();
        if (fromEnv.length > 0)
            return fromEnv;
    }
    const file = config.embeddingApiKeyFile.trim();
    if (file.length === 0)
        return '';
    try {
        return (readFileSync(file, 'utf8')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0) ?? '');
    }
    catch {
        return '';
    }
}
/** Whether an API key is reachable (env or key file); never returns the value. */
export function hasEmbeddingKey(config) {
    return readEmbeddingKey(config).length > 0;
}
/** Persist provider/model/dimensions and (optionally) rotate the key file. */
export async function saveEmbeddingConfig(dir, patch) {
    const previous = loadEmbeddingConfig(dir);
    const keyFile = previous?.keyFile || defaultEmbeddingKeyPath(dir);
    const next = {
        version: 1,
        baseUrl: patch.baseUrl.trim(),
        model: patch.model.trim(),
        dimensions: Number.isFinite(patch.dimensions) ? Math.max(0, Number(patch.dimensions)) : 0,
        baseline: Number.isFinite(patch.baseline) ? Math.min(0.9, Math.max(0, Number(patch.baseline))) : 0.22,
        keyFile,
    };
    await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    const apiKey = (patch.apiKey ?? '').trim();
    if (apiKey.length > 0) {
        await writeFileAtomic(keyFile, `${apiKey}\n`, { mode: 0o600, dirMode: 0o700 });
    }
    await writeFileAtomic(embeddingSettingsPath(dir), `${JSON.stringify(next, null, 2)}\n`, {
        mode: 0o600,
        dirMode: 0o700,
    });
    return next;
}
export { DEFAULT_KEY_NAME };
