export interface InjectionSelection {
    id: string;
    layer: string;
    score: number;
    channels?: string[];
}
export interface InjectionEvent {
    ts: number;
    sessionId: string;
    cwd: string;
    query: string;
    chars: number;
    mode: 'recall' | 'recent-fallback';
    layers: {
        l1: number;
        l2: number;
        l3: number;
    };
    /** Active-window rows included in addition to query matches. */
    active?: number;
    selected: InjectionSelection[];
}
export declare function injectionLogPath(dir: string): string;
/** Append one event, rotating the file when it grows too large. */
export declare function appendInjection(dir: string, event: InjectionEvent): Promise<void>;
/** Most recent injections, newest first. */
export declare function readInjections(dir: string, limit?: number): Promise<InjectionEvent[]>;
