export function shouldRefreshProfiles(force, config, writesAllowed) {
    if (!config.aSeriesEnabled || !writesAllowed)
        return false;
    return force || config.aSeriesRefreshOnExtract;
}
