import { useCallback, useEffect, useState } from 'react';

import { getNativeAppVersion } from '@shared/lib/app-version/nativeAppVersion';
import { useAppLocaleStore } from '@shared/lib/i18n';
import {
  loadLastSeenAppVersion,
  saveLastSeenAppVersion,
} from '@shared/lib/storage/lastSeenAppVersionStorage';

import { detectAppUpdate } from '../lib/detectAppUpdate';
import { resolveReleaseNoteHighlights } from '../lib/releaseNotes';

export type AppUpdateNoticeState = {
  version: string;
  highlights: string[];
};

export function useAppUpdateNotice(appReady: boolean, enabled = true) {
  const locale = useAppLocaleStore((s) => s.locale);
  const [notice, setNotice] = useState<AppUpdateNoticeState | null>(null);

  useEffect(() => {
    if (!appReady || !enabled) return;

    const currentVersion = getNativeAppVersion();
    const lastSeenVersion = loadLastSeenAppVersion();
    const detection = detectAppUpdate(currentVersion, lastSeenVersion);

    if (detection.kind === 'unknown_version') return;

    if (
      detection.kind === 'first_launch' ||
      detection.kind === 'no_change' ||
      detection.kind === 'downgrade'
    ) {
      saveLastSeenAppVersion(detection.currentVersion);
      return;
    }

    setNotice({
      version: detection.currentVersion,
      highlights: resolveReleaseNoteHighlights(detection.currentVersion, locale),
    });
  }, [appReady, enabled, locale]);

  const dismiss = useCallback(() => {
    setNotice((prev) => {
      if (prev) saveLastSeenAppVersion(prev.version);
      return null;
    });
  }, []);

  return {
    notice,
    visible: notice != null,
    dismiss,
  };
}
