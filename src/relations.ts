/**
 * Shared supersede relationship validation.
 *
 * Both write paths (automatic extraction and the memory_supersede tool) must
 * apply the same rules, otherwise a bad model output can close a global or
 * cross-project claim that the tool would have refused.
 */
import type { AnyRecord } from './types.js';
import type { HoloStore } from './store.js';
import { isValidAt } from './confidence.js';

export interface SupersedeSource {
  /** Present for the manual tool (existing new record); absent for extraction. */
  id?: string;
  layer: string;
  scope: string;
  projectKey: string;
}

export interface SupersedeValidation {
  ok: boolean;
  errors: string[];
  /** Deduplicated targets, only when every target passed. */
  targets: string[];
}

const MAX_CHAIN = 100;

/** Walk a claim's supersedes ancestors; report truncation instead of guessing. */
function ancestors(store: HoloStore, id: string): { ids: Set<string>; truncated: boolean } {
  const seen = new Set<string>();
  const stack = [id];
  let truncated = false;
  while (stack.length > 0) {
    if (seen.size >= MAX_CHAIN) {
      truncated = true;
      break;
    }
    const current = stack.pop() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    const record = store.find(current);
    for (const parent of record?.claim?.supersedes ?? []) stack.push(parent);
  }
  return { ids: seen, truncated };
}

export function validateSupersedeTargets(
  store: HoloStore,
  source: SupersedeSource,
  rawTargets: string[],
  now = Date.now(),
): SupersedeValidation {
  const errors: string[] = [];
  const targets = [...new Set(rawTargets.filter((id) => typeof id === 'string' && id.length > 0))];
  if (targets.length !== rawTargets.length) errors.push('duplicate target ids');
  if (targets.length === 0) return { ok: false, errors: ['no targets'], targets: [] };

  for (const targetId of targets) {
    const target: AnyRecord | undefined = store.find(targetId);
    if (!target) {
      errors.push(`target not found: ${targetId}`);
      continue;
    }
    if (target.layer !== source.layer) errors.push(`layer mismatch: ${targetId}`);
    if (target.scope !== source.scope) errors.push(`scope mismatch: ${targetId}`);
    if (source.scope === 'project' && target.projectKey !== source.projectKey) {
      errors.push(`project mismatch: ${targetId}`);
    }
    if (target.claim && target.claim.status !== 'active') {
      errors.push(`target is not active (${target.claim.status}): ${targetId}`);
    }
    if (!isValidAt(target.claim, now)) errors.push(`target is not valid now: ${targetId}`);
    if (source.id) {
      if (targetId === source.id) errors.push(`supersede cycle at ${targetId}`);
      else {
        const ancestry = ancestors(store, targetId);
        if (ancestry.truncated) errors.push(`ancestry check incomplete for ${targetId}`);
        else if (ancestry.ids.has(source.id)) errors.push(`supersede cycle at ${targetId}`);
      }
    }
  }
  return errors.length === 0 ? { ok: true, errors: [], targets } : { ok: false, errors, targets: [] };
}
