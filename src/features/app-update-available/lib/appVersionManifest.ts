import type { AppLocale } from '@shared/lib/i18n';
import { getAppLocale, t } from '@shared/lib/i18n';

export type AppVersionManifestStoreUrls = {
  ios?: string;
  android?: string;
};

export type AppVersionManifest = {
  latestVersion: string;
  highlights: string[];
  storeUrls: AppVersionManifestStoreUrls;
};

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

function parseHighlightsArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asNonEmptyString(item))
    .filter((item): item is string => item != null);
}

function parseHighlights(row: Record<string, unknown>, locale: AppLocale): string[] {
  const byLocale = row.highlightsByLocale;
  if (byLocale && typeof byLocale === 'object') {
    const map = byLocale as Record<string, unknown>;
    for (const key of [locale, 'en', 'ko'] as const) {
      const lines = parseHighlightsArray(map[key]);
      if (lines.length > 0) return lines;
    }
  }
  const fallback = parseHighlightsArray(row.highlights);
  if (fallback.length > 0) return fallback;
  return [t('appUpdate.release.default', locale)];
}

export function parseAppVersionManifest(
  value: unknown,
  locale: AppLocale = getAppLocale(),
): AppVersionManifest | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const latestVersion = asNonEmptyString(row.latestVersion);
  if (!latestVersion) return null;

  return {
    latestVersion,
    highlights: parseHighlights(row, locale),
    storeUrls: parseStoreUrls(row.storeUrls),
  };
}
