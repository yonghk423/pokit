import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useDayPlanStore } from '@entities/day-plan/model';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { syncCategoryReminderNotifications } from '@features/category-reminder-notifications';
import { syncPriorityDayStartAlarm } from '@features/day-plan-notifications';
import { useLocalNotifications } from '@features/local-notifications';
import { useDayPlanDraftStore } from '@pages/day-plan';
import { loadPriorityDayStartAlarm } from '@shared/lib/storage';
import {
  reconcileLiveActivityFromPlan,
  syncLiveActivityIfSessionInProgress,
} from '@features/live-activity-sync';
import {
  addLocalNotificationReceivedListener,
  addLocalNotificationResponseListener,
} from '@shared/lib/notifications';

/**
 * 앱 전역 부트스트랩: hydrate + 알림 리스너 + Live Activity 동기화.
 * Expo Router `app/_layout.tsx`의 루트 컴포넌트에서 한 번 호출한다.
 */
export function useAppBootstrap() {
  const router = useRouter();
  useLocalNotifications();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const { enabled } = loadPriorityDayStartAlarm();
    const start = useDayPlanDraftStore.getState().priorityStart;
    void (async () => {
      await syncPriorityDayStartAlarm({ enabled, startHhmm: start });
      await syncCategoryReminderNotifications();
    })();
  }, []);

  useEffect(() => {
    return addLocalNotificationResponseListener((data) => {
      if (data.eventType === 'categoryReminder') {
        router.push('/(tabs)/day-plan');
        return;
      }
      const blockId = typeof data.blockId === 'string' ? data.blockId : '';
      if (!blockId) return;
      router.push({ pathname: '/activity-session', params: { blockId } });
    });
  }, [router]);

  useEffect(() => {
    return addLocalNotificationReceivedListener((data) => {
      if (data.eventType !== 'start') return;
      if (data.startNotifyKind === 'reminder5m') return;
      const blockId = typeof data.blockId === 'string' ? data.blockId : '';
      if (!blockId) return;
      reconcileLiveActivityFromPlan();
    });
  }, []);

  useEffect(() => {
    syncLiveActivityIfSessionInProgress();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncLiveActivityIfSessionInProgress();
        void useLocalNotificationsStore.getState().refreshPermission();
        void syncCategoryReminderNotifications();
      }
    });
    return () => sub.remove();
  }, []);
}
