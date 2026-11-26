/**
 * Profile refresh policy (separate from the plugin wiring so it is testable).
 *
 * Extract-triggered refresh respects `aSeriesRefreshOnExtract`; invalidation
 * events (forget / supersede / archive / trim) must ignore that switch and only
 * require the profile feature plus the write switch.
 */
import type { HoloConfig } from './config.js';

export function shouldRefreshProfiles(force: boolean, config: HoloConfig, writesAllowed: boolean): boolean {
  if (!config.aSeriesEnabled || !writesAllowed) return false;
  return force || config.aSeriesRefreshOnExtract;
}
