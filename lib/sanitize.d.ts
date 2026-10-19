/** Shared secret handling: memory must never persist or re-inject credentials. */
export declare function looksSecret(text: string): boolean;
/** Replace credential-looking spans with a placeholder (idempotent). */
export declare function redactSecrets(text: string): string;
