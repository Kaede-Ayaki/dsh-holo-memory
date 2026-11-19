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
  maxSeedEntities: z.number().default(8),
  requireQueryOverlap: z.boolean().default(true),
});

export interface NeuronConfig {
  graphDir: string;
  holoStoreDir: string;
  defaultDepth: number;
  damping: number;
  minSignal: number;
  topK: number;
  maxNodes: number;
  maxEdges: number;
  maxDegree: number;
  maxTagsPerRecord: number;
  maxSeedEntities: number;
  requireQueryOverlap: boolean;
}

export const DEFAULT_CONFIG: NeuronConfig = {
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
  maxSeedEntities: 8,
  requireQueryOverlap: true,
};

export function normalizeConfig(raw: Partial<NeuronConfig> | undefined): NeuronConfig {
  const source = raw ?? {};
  const out = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof NeuronConfig>) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (typeof DEFAULT_CONFIG[key] === 'number') {
      const number = Number(value);
      if (Number.isFinite(number)) out[key] = number as never;
    } else if (typeof DEFAULT_CONFIG[key] === 'boolean') {
      out[key] = Boolean(value) as never;
    } else {
      out[key] = String(value) as never;
    }
  }
  const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
  out.defaultDepth = clamp(Math.round(out.defaultDepth), 1, 3);
  out.damping = clamp(out.damping, 0.1, 0.95);
  out.minSignal = Math.max(0, out.minSignal);
  out.topK = clamp(Math.round(out.topK), 1, 30);
  out.maxNodes = Math.max(1, Math.round(out.maxNodes));
  out.maxEdges = Math.max(1, Math.round(out.maxEdges));
  out.maxDegree = Math.max(1, Math.round(out.maxDegree));
  out.maxTagsPerRecord = clamp(Math.round(out.maxTagsPerRecord), 1, 64);
  out.maxSeedEntities = clamp(Math.round(out.maxSeedEntities), 1, 32);
  out.graphDir = out.graphDir.trim() || path.join(resolveDshHome(), 'neuron-memory');
  out.holoStoreDir = out.holoStoreDir.trim() || path.join(resolveDshHome(), 'holo-memory');
  return out;
}
