export interface RuntimeToggleState {
    /** Automatic recall injection at agent/pre-step. */
    read: boolean;
    /** Automatic L1/L2/L3 capture, feedback and manual writes. */
    write: boolean;
    updatedAt: number;
}
export declare class RuntimeToggles {
    readonly dir: string;
    private state;
    private writeChain;
    constructor(dir: string);
    get(): RuntimeToggleState;
    private file;
    set(patch: Partial<Pick<RuntimeToggleState, 'read' | 'write'>>): Promise<RuntimeToggleState>;
}
