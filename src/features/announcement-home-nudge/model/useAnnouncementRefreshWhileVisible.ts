import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import { getSupabaseClient, isSupabaseConfigured } from '@shared/lib/supabase';

/** 오늘 탭에 머무는 동안에도 새 공지를 다시 받는다. */
const ANNOUNCEMENT_REFRESH_MS = 8_000;

type AnnouncementRealtimeChannel = ReturnType<ReturnType<typeof getSupabaseClient>['channel']>;

/**
 * 오늘 탭은 홈 넛지와 상단 버튼이 이 훅을 같이 쓴다.
 * `channel(name)`은 같은 이름을 재사용하고, 이미 join 중이면 `.on('postgres_changes')`가 던진다.
 * 포커스 이펙트가 같은 틱에 두 번 돌면 `Date.now()` 이름이 겹치므로 채널은 하나만 둔다.
 */
const refreshListeners = new Set<() => void>();
let realtimeChannel: AnnouncementRealtimeChannel | null = null;
let channelSeq = 0;

function notifyAnnouncementListeners() {
  refreshListeners.forEach((listener) => {
    listener();
  });
}

function retainAnnouncementRealtime() {
  if (!isSupabaseConfigured() || realtimeChannel) return;

  const channel = getSupabaseClient().channel(`announcements-visible-${++channelSeq}`);
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
    notifyAnnouncementListeners();
  });
  channel.subscribe();
  realtimeChannel = channel;
}

function releaseAnnouncementRealtime() {
  if (refreshListeners.size > 0) return;
  const channel = realtimeChannel;
  realtimeChannel = null;
  if (!channel || !isSupabaseConfigured()) return;
  void getSupabaseClient().removeChannel(channel);
}

export function useAnnouncementRefreshWhileVisible(refresh: () => void | Promise<void>) {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      const listener = () => {
        void refreshRef.current();
      };
      refreshListeners.add(listener);
      listener();

      const timer = setInterval(listener, ANNOUNCEMENT_REFRESH_MS);
      const appStateSub = AppState.addEventListener('change', (state) => {
        if (state === 'active') listener();
      });

      retainAnnouncementRealtime();

      return () => {
        clearInterval(timer);
        appStateSub.remove();
        refreshListeners.delete(listener);
        releaseAnnouncementRealtime();
      };
    }, []),
  );
}
