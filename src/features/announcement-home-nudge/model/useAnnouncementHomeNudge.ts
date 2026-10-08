import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import {
  fetchAnnouncements,
  type Announcement,
  type AnnouncementLocale,
} from '@entities/announcement';
import { useAppLocaleStore } from '@shared/lib/i18n';
import {
  loadAnnouncementReadIds,
  markAnnouncementRead,
} from '@shared/lib/storage';
import { getAppStoreListingUrl } from '@shared/lib/support';

import { pickHomeNudgeAnnouncement } from '../lib/pickHomeNudgeAnnouncement';

export function useAnnouncementHomeNudge() {
  const locale = useAppLocaleStore((s) => s.locale) as AnnouncementLocale;
  const [notice, setNotice] = useState<Announcement | null>(null);
  /** in-flight fetch가 dismiss 이후 notice를 다시 덮어쓰지 않게 */
  const fetchGenRef = useRef(0);

  const refresh = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    const result = await fetchAnnouncements(locale);
    if (gen !== fetchGenRef.current) return;
    if (!result.ok) {
      setNotice(null);
      return;
    }
    const readIds = new Set(loadAnnouncementReadIds());
    setNotice(pickHomeNudgeAnnouncement(result.items, readIds));
  }, [locale]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const dismiss = useCallback(() => {
    fetchGenRef.current += 1;
    setNotice((prev) => {
      if (prev) markAnnouncementRead(prev.id);
      return null;
    });
  }, []);

  const openStore = useCallback(async () => {
    fetchGenRef.current += 1;
    setNotice((prev) => {
      if (prev) markAnnouncementRead(prev.id);
      return null;
    });
    const url = getAppStoreListingUrl(Platform.OS, { locale });
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return false;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }, [locale]);

  return {
    notice,
    visible: notice != null,
    dismiss,
    openStore,
    refresh,
  };
}
