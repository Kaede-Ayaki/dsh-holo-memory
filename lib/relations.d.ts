import type { HoloStore } from './store.js';
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
export declare function validateSupersedeTargets(store: HoloStore, source: SupersedeSource, rawTargets: string[], now?: number): SupersedeValidation;
