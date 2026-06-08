import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  useDayPlanDraftStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { syncCategoryReminderNotifications } from '@features/category-reminder-notifications';
import {
  syncMedicineReminderNotifications,
  syncPriorityDayStartAlarm,
  syncWaterReminderNotifications,
} from '@features/day-plan-notifications';
import {
  reconcileLiveActivityFromPlan,
  syncLiveActivityIfSessionInProgress,
} from '@features/live-activity-sync';
import { useLocalNotifications } from '@features/local-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import {
  addLocalNotificationReceivedListener,
  addLocalNotificationResponseListener,
} from '@shared/lib/notifications';
import {
  ensureDefaultPriorityCatalog,
  flushLocalStorageClientWrites,
  initLocalStorageClient,
  loadPriorityDayStartAlarm,
} from '@shared/lib/storage';
import { useDevSeedMenu } from './useDevSeedMenu';

/**
 * 앱 전역 부트스트랩: hydrate + 알림 리스너 + Live Activity 동기화.
 * Expo Router `app/_layout.tsx`의 루트 컴포넌트에서 한 번 호출한다.
 */
export function useAppBootstrap() {
  const router = useRouter();
  useLocalNotifications();
  useDevSeedMenu();
  const [isReady, setIsReady] = useState(false);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);
  const waterReminderSyncEpoch = useDayPlanDraftStore((s) => s.waterReminderSyncEpoch);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initLocalStorageClient();
      if (cancelled) return;

      ensureDefaultPriorityCatalog();

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
    const { priorityStart: initialPriorityStart } = useDayPlanDraftStore.getState();
    void (async () => {
      await syncPriorityDayStartAlarm({ enabled, startHhmm: initialPriorityStart });
      await syncCategoryReminderNotifications();
      await syncMedicineReminderNotifications();
    })();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    void syncWaterReminderNotifications({
      routineStartHhmm: priorityStart,
      routineEndHhmm: priorityEnd,
    });
  }, [isReady, priorityStart, priorityEnd, waterReminderSyncEpoch]);

  useEffect(() => {
    if (!isReady) return;
    return addLocalNotificationResponseListener((data) => {
      if (data.eventType === 'categoryReminder') {
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
        useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
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
