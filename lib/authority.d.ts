/**
 * One authoritative source for automatic L1/L2/L3 memory. Other memory
 * systems may be consulted, but they must not silently write the same fact:
 * two writers mean two truths and a reconciliation bill.
 */
export declare const MEMORY_AUTHORITY = "dsh-holo-memory";
export declare const AUTHORITY_NOTE: string;
export declare const EVIDENCE_NOTE: string;
