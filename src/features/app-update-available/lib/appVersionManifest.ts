export type AppVersionManifestStoreUrls = {
  ios?: string;
  android?: string;
};

export type AppVersionManifest = {
  latestVersion: string;
  highlights: string[];
  storeUrls: AppVersionManifestStoreUrls;
};

const DEFAULT_HIGHLIGHTS = ['앱 안정성과 사용 경험을 개선했어요.'];

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseStoreUrls(value: unknown): AppVersionManifestStoreUrls {
  if (!value || typeof value !== 'object') return {};
  const row = value as Record<string, unknown>;
  const ios = asNonEmptyString(row.ios);
  const android = asNonEmptyString(row.android);
  return {
    ...(ios ? { ios } : {}),
    ...(android ? { android } : {}),
  };
}

function parseHighlights(value: unknown): string[] {
  if (!Array.isArray(value)) return DEFAULT_HIGHLIGHTS;
  const highlights = value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => item != null);
  return highlights.length > 0 ? highlights : DEFAULT_HIGHLIGHTS;
}

export function parseAppVersionManifest(value: unknown): AppVersionManifest | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const latestVersion = asNonEmptyString(row.latestVersion);
  if (!latestVersion) return null;

  return {
    latestVersion,
    highlights: parseHighlights(row.highlights),
    storeUrls: parseStoreUrls(row.storeUrls),
  };
}
