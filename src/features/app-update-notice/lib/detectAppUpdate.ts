import { compareAppVersions } from '@shared/lib/app-version/compareAppVersions';

export type AppUpdateDetection =
  | { kind: 'unknown_version' }
  | { kind: 'first_launch'; currentVersion: string }
  | { kind: 'no_change'; currentVersion: string }
  | { kind: 'downgrade'; currentVersion: string }
  | { kind: 'updated'; currentVersion: string; previousVersion: string };

export function detectAppUpdate(
  currentVersion: string | null,
  lastSeenVersion: string | null,
): AppUpdateDetection {
  if (!currentVersion) return { kind: 'unknown_version' };
  if (!lastSeenVersion) return { kind: 'first_launch', currentVersion };
  if (compareAppVersions(currentVersion, lastSeenVersion) > 0) {
    return {
      kind: 'updated',
      currentVersion,
      previousVersion: lastSeenVersion,
    };
  }
  if (compareAppVersions(currentVersion, lastSeenVersion) < 0) {
    return { kind: 'downgrade', currentVersion };
  }
  return { kind: 'no_change', currentVersion };
}
