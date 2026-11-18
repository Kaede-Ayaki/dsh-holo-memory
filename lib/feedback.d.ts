import type { HoloStore } from './store.js';
export interface CitationFeedbackResult {
    touched: number;
    cited: number;
    /** Ids whose suffix or full id appeared in the assistant answer. */
    citedIds: string[];
}
export declare function applyCitationFeedback(store: HoloStore, injectedIds: readonly string[], assistantText: string): CitationFeedbackResult;
