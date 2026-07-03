import { useCallback, useEffect, useState } from 'react';

import { getNativeAppVersion } from '@shared/lib/app-version/nativeAppVersion';
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
      highlights: resolveReleaseNoteHighlights(detection.currentVersion),
    });
  }, [appReady, enabled]);

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
