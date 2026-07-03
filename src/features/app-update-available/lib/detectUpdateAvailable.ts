import { compareAppVersions } from '@shared/lib/app-version/compareAppVersions';

import type { AppVersionManifest } from './appVersionManifest';

export type UpdateAvailableDetection =
  | { kind: 'unknown_current_version' }
  | { kind: 'no_remote_manifest' }
  | { kind: 'up_to_date'; currentVersion: string; latestVersion: string }
  | {
      kind: 'update_available';
      currentVersion: string;
      latestVersion: string;
      highlights: string[];
      storeUrls: AppVersionManifest['storeUrls'];
    };

export function detectUpdateAvailable(
  currentVersion: string | null,
  manifest: AppVersionManifest | null,
): UpdateAvailableDetection {
  if (!currentVersion) return { kind: 'unknown_current_version' };
  if (!manifest) return { kind: 'no_remote_manifest' };

  if (compareAppVersions(manifest.latestVersion, currentVersion) <= 0) {
    return {
      kind: 'up_to_date',
      currentVersion,
      latestVersion: manifest.latestVersion,
    };
  }

  return {
    kind: 'update_available',
    currentVersion,
    latestVersion: manifest.latestVersion,
    highlights: manifest.highlights,
    storeUrls: manifest.storeUrls,
  };
}
