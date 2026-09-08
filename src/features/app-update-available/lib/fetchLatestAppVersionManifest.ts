import { getAppLocale } from '@shared/lib/i18n';

import { parseAppVersionManifest } from './appVersionManifest';
import type { AppVersionManifest } from './appVersionManifest';

const DEFAULT_TIMEOUT_MS = 8_000;

export async function fetchLatestAppVersionManifest(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<AppVersionManifest | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json: unknown = await response.json();
    return parseAppVersionManifest(json, getAppLocale());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
