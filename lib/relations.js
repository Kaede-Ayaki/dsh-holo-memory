import { isValidAt } from './confidence.js';
const MAX_CHAIN = 100;
/** Walk a claim's supersedes ancestors. */
function ancestors(store, id) {
    const seen = new Set();
    const stack = [id];
    while (stack.length > 0 && seen.size < MAX_CHAIN) {
        const current = stack.pop();
        if (seen.has(current))
            continue;
        seen.add(current);
        const record = store.find(current);
        for (const parent of record?.claim?.supersedes ?? [])
            stack.push(parent);
    }
    return seen;
}
export function validateSupersedeTargets(store, source, rawTargets, now = Date.now()) {
    const errors = [];
    const targets = [...new Set(rawTargets.filter((id) => typeof id === 'string' && id.length > 0))];
    if (targets.length !== rawTargets.length)
        errors.push('duplicate target ids');
    if (targets.length === 0)
        return { ok: false, errors: ['no targets'], targets: [] };
    for (const targetId of targets) {
        const target = store.find(targetId);
        if (!target) {
            errors.push(`target not found: ${targetId}`);
            continue;
        }
        if (target.layer !== source.layer)
            errors.push(`layer mismatch: ${targetId}`);
        if (target.scope !== source.scope)
            errors.push(`scope mismatch: ${targetId}`);
        if (source.scope === 'project' && target.projectKey !== source.projectKey) {
            errors.push(`project mismatch: ${targetId}`);
        }
        if (target.claim && target.claim.status !== 'active') {
            errors.push(`target is not active (${target.claim.status}): ${targetId}`);
        }
        if (!isValidAt(target.claim, now))
            errors.push(`target is not valid now: ${targetId}`);
        if (source.id) {
            if (targetId === source.id)
                errors.push(`supersede cycle at ${targetId}`);
            else if (ancestors(store, targetId).has(source.id))
                errors.push(`supersede cycle at ${targetId}`);
        }
    }
    return errors.length === 0 ? { ok: true, errors: [], targets } : { ok: false, errors, targets: [] };
}
