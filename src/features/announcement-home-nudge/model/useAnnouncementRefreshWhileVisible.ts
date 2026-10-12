import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@shared/lib/supabase';

/** 오늘 탭에 머무는 동안에도 새 공지를 다시 받는다. */
const ANNOUNCEMENT_REFRESH_MS = 8_000;

export function useAnnouncementRefreshWhileVisible(refresh: () => void | Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      void refreshRef.current();

      const timer = setInterval(() => {
        void refreshRef.current();
      }, ANNOUNCEMENT_REFRESH_MS);

      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refreshRef.current();
      });

      const channel = isSupabaseConfigured()
        ? getSupabaseClient()
            .channel(`announcements-visible-${Date.now()}`)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'announcements' },
              () => {
                void refreshRef.current();
              },
            )
            .subscribe()
        : null;

      return () => {
        clearInterval(timer);
        appStateSub.remove();
        if (channel) void getSupabaseClient().removeChannel(channel);
      };
    }, []),
  );
}
