export type RepositoryReference = {
  providerHost: string;
  fullName: string;
  key: string;
};

export function repositoryKey(providerHost: string, fullName: string): string {
  return `${providerHost}:${fullName}`;
}

export function parseRepositoryKey(
  value: string,
  fallbackProviderHost = "github.com"
): RepositoryReference {
  const separatorIndex = value.indexOf(":");
  const hasHostPrefix =
    separatorIndex > 0 && value.slice(separatorIndex + 1).includes("/");
  const providerHost = hasHostPrefix
    ? value.slice(0, separatorIndex)
    : fallbackProviderHost;
  const fullName = hasHostPrefix ? value.slice(separatorIndex + 1) : value;

  return {
    providerHost,
    fullName,
    key: repositoryKey(providerHost, fullName),
  };
}

export function repositoryRoute(providerHost: string, fullName: string): string {
  return `/repositories/${encodeURIComponent(providerHost)}/${fullName}`;
}

/**
 * One-time migration of repository-settings keys saved by older builds, which
 * stored bare `owner/repo` keys before host scoping landed. Rewrites any
 * unprefixed key to its canonical `github.com:owner/repo` form so existing
 * selections survive the upgrade instead of rendering unchecked. Returns the
 * same object reference when nothing needs migrating, so callers can skip work.
 */
export function migrateRepositorySettings(
  settings: Record<string, boolean>
): Record<string, boolean> {
  let changed = false;
  const migrated: Record<string, boolean> = {};

  for (const [key, value] of Object.entries(settings)) {
    const canonicalKey = parseRepositoryKey(key).key;
    if (canonicalKey !== key) {
      changed = true;
    }
    // OR-merge so a legacy and an already-prefixed key for the same repo don't
    // let a `false` clobber a `true` (or vice versa).
    migrated[canonicalKey] = migrated[canonicalKey] || value;
  }

  return changed ? migrated : settings;
}
