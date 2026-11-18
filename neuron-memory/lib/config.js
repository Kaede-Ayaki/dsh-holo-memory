/** P0 neuron-memory configuration. */
import z from '@deepseek-ai/schemastery';
import path from 'node:path';
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths';
export const Config = z.object({
    graphDir: z.string().default(''),
    holoStoreDir: z.string().default(''),
    defaultDepth: z.number().default(2),
    damping: z.number().default(0.62),
    minSignal: z.number().default(0.025),
    topK: z.number().default(8),
    maxNodes: z.number().default(5000),
    maxEdges: z.number().default(30000),
    maxDegree: z.number().default(12),
    maxTagsPerRecord: z.number().default(16),
});
export const DEFAULT_CONFIG = {
    graphDir: '',
    holoStoreDir: '',
    defaultDepth: 2,
    damping: 0.62,
    minSignal: 0.025,
    topK: 8,
    maxNodes: 5000,
    maxEdges: 30000,
    maxDegree: 12,
    maxTagsPerRecord: 16,
};
export function normalizeConfig(raw) {
    const source = raw ?? {};
    const out = { ...DEFAULT_CONFIG };
    for (const key of Object.keys(DEFAULT_CONFIG)) {
        const value = source[key];
        if (value !== undefined && value !== null) {
            if (typeof DEFAULT_CONFIG[key] === 'number') {
                const number = Number(value);
                if (Number.isFinite(number))
                    out[key] = number;
            }
            else if (typeof DEFAULT_CONFIG[key] === 'string') {
                out[key] = String(value);
            }
        }
    }
    out.graphDir = out.graphDir.trim() || path.join(resolveDshHome(), 'neuron-memory');
    out.holoStoreDir = out.holoStoreDir.trim() || path.join(resolveDshHome(), 'holo-memory');
    return out;
}
