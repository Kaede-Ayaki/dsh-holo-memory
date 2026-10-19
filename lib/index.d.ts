import { Config, type HoloConfig } from './config.js';
export declare const name = "holo-memory";
/** Host services this plugin consumes. Missing `systemPrompt` would throw on
 * first access and fail activation, so declare both up front. */
export declare const inject: string[];
export { Config };
export declare function apply(ctx: any, rawConfig: Partial<HoloConfig> | undefined): void;
export type { HoloConfig };
