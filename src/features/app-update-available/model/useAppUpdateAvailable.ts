import { useCallback, useEffect, useState } from 'react';

import { getNativeAppVersion } from '@shared/lib/app-version/nativeAppVersion';
import { resolveAppUpdateManifestUrl } from '@shared/config/appUpdateRemote';
import {
  loadDismissedUpdateAvailableVersion,
  saveDismissedUpdateAvailableVersion,
} from '@shared/lib/storage/updateAvailableDismissStorage';

import type { AppVersionManifestStoreUrls } from '../lib/appVersionManifest';
import { detectUpdateAvailable } from '../lib/detectUpdateAvailable';
import { fetchLatestAppVersionManifest } from '../lib/fetchLatestAppVersionManifest';
import { openAppStoreListing } from '../lib/openAppStoreListing';

export type AppUpdateAvailableState = {
  currentVersion: string;
  latestVersion: string;
  highlights: string[];
  storeUrls: AppVersionManifestStoreUrls;
};

export function useAppUpdateAvailable(appReady: boolean) {
  const [resolved, setResolved] = useState(false);
  const [notice, setNotice] = useState<AppUpdateAvailableState | null>(null);

  useEffect(() => {
    if (!appReady) return;

    let cancelled = false;

    void (async () => {
      const currentVersion = getNativeAppVersion();
      const manifest = await fetchLatestAppVersionManifest(resolveAppUpdateManifestUrl());
      if (cancelled) return;

      const detection = detectUpdateAvailable(currentVersion, manifest);
      if (detection.kind !== 'update_available') {
        setNotice(null);
        setResolved(true);
        return;
      }

      const dismissedVersion = loadDismissedUpdateAvailableVersion();
      if (dismissedVersion === detection.latestVersion) {
        setNotice(null);
        setResolved(true);
        return;
      }

      setNotice({
        currentVersion: detection.currentVersion,
        latestVersion: detection.latestVersion,
        highlights: detection.highlights,
        storeUrls: detection.storeUrls,
      });
      setResolved(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [appReady]);

  const dismissLater = useCallback(() => {
    setNotice((prev) => {
      if (prev) saveDismissedUpdateAvailableVersion(prev.latestVersion);
      return null;
    });
  }, []);

  const openStore = useCallback(async () => {
    const current = notice;
    if (!current) return false;
    saveDismissedUpdateAvailableVersion(current.latestVersion);
    const opened = await openAppStoreListing(current.storeUrls);
    setNotice(null);
    return opened;
  }, [notice]);

  return {
    resolved,
    notice,
    visible: notice != null,
    dismissLater,
    openStore,
  };
}
