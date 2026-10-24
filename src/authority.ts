/**
 * One authoritative source for automatic L1/L2/L3 memory. Other memory
 * systems may be consulted, but they must not silently write the same fact:
 * two writers mean two truths and a reconciliation bill.
 */
export const MEMORY_AUTHORITY = 'dsh-holo-memory';

export const AUTHORITY_NOTE =
  'dsh-holo-memory is the authoritative source for automatic L1/L2/L3 memory. ' +
  'Other memory systems (ALTM, built-in memory, notes) are read-only references; do not write the same fact into two stores.';

export const EVIDENCE_NOTE =
  'Evidence levels: ·源 = verbatim source excerpt; ·指针 = session/turn pointer only; ·手写 = manual entry; no marker = summary only. ' +
  'Call memory_open(id) before relying on a memory whose source matters.';
