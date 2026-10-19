import type { HoloStore } from './store.js';
export interface CitationFeedbackResult {
    touched: number;
    cited: number;
}
export declare function applyCitationFeedback(store: HoloStore, injectedIds: readonly string[], assistantText: string): CitationFeedbackResult;
