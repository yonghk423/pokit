import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useDayPlanRuntimeStore, useDayPlanStore } from '@entities/day-plan/model';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { syncCategoryReminderNotifications } from '@features/category-reminder-notifications';
import {
  syncGoalDetailIncompleteReminderNotifications,
  syncMedicineReminderNotifications,
  syncPriorityDayStartAlarm,
  syncWaterReminderNotifications,
} from '@features/day-plan-notifications';
import { useLocalNotifications } from '@features/local-notifications';
import { useDayPlanDraftStore } from '@pages/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  flushLocalStorageClientWrites,
  initLocalStorageClient,
  loadPriorityDayStartAlarm,
} from '@shared/lib/storage';
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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initLocalStorageClient();
      if (cancelled) return;

      useDayPlanStore.getState().hydrate();
      useDayPlanDraftStore.getState().hydrate();
      registerOtherCategoryResolverFromStorage();

      const plan = useDayPlanStore.getState();
      useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
        dateKey: plan.dateKey,
        blocks: plan.blocks,
      });
      if (!cancelled) setIsReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const { enabled } = loadPriorityDayStartAlarm();
    const { priorityStart, priorityEnd } = useDayPlanDraftStore.getState();
    void (async () => {
      await syncPriorityDayStartAlarm({ enabled, startHhmm: priorityStart });
      await syncCategoryReminderNotifications();
      await syncMedicineReminderNotifications();
      await syncWaterReminderNotifications({
        routineStartHhmm: priorityStart,
        routineEndHhmm: priorityEnd,
      });
      await syncGoalDetailIncompleteReminderNotifications();
    })();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    return addLocalNotificationResponseListener((data) => {
      if (data.eventType === 'categoryReminder') {
        router.push('/(tabs)/day-plan');
        return;
      }
      if (data.eventType === 'goalDetailIncompleteReminder') {
        router.push('/(tabs)/day-plan');
        return;
      }
      if (data.eventType === 'medicineDoseReminder') {
        const bid = typeof data.blockId === 'string' ? data.blockId : '';
        if (bid) {
          router.push({ pathname: '/activity-session', params: { blockId: bid } });
        } else {
          router.push('/(tabs)/day-plan');
        }
        return;
      }
      if (data.eventType === 'waterIntervalReminder') {
        const bid = typeof data.blockId === 'string' ? data.blockId : '';
        if (bid) {
          router.push({ pathname: '/activity-session', params: { blockId: bid } });
        } else {
          router.push('/(tabs)/day-plan');
        }
        return;
      }
      const blockId = typeof data.blockId === 'string' ? data.blockId : '';
      if (!blockId) return;
      router.push({ pathname: '/activity-session', params: { blockId } });
    });
  }, [isReady, router]);

  useEffect(() => {
    if (!isReady) return;
    return addLocalNotificationReceivedListener((data) => {
      if (data.eventType !== 'start') return;
      if (data.startNotifyKind === 'reminder5m') return;
      const blockId = typeof data.blockId === 'string' ? data.blockId : '';
      if (!blockId) return;
      reconcileLiveActivityFromPlan();
    });
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    syncLiveActivityIfSessionInProgress();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncLiveActivityIfSessionInProgress();
        void useLocalNotificationsStore.getState().refreshPermission();
        void syncCategoryReminderNotifications();
        void syncMedicineReminderNotifications();
        const { priorityStart: ps, priorityEnd: pe } = useDayPlanDraftStore.getState();
        void syncWaterReminderNotifications({ routineStartHhmm: ps, routineEndHhmm: pe });
        void syncGoalDetailIncompleteReminderNotifications();
        registerOtherCategoryResolverFromStorage();
      } else {
        /** 백그라운드/비활성 전환 시 대기 중인 저장 write를 즉시 정리 */
        void flushLocalStorageClientWrites();
      }
    });
    return () => sub.remove();
  }, [isReady]);

  return isReady;
}
