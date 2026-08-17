import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  syncTodayTabWithFixedRoutineApply,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { syncCategoryReminderNotifications } from '@features/category-reminder-notifications';
import {
  syncIncompleteRoutineReminderNotifications,
  syncMedicineReminderNotifications,
  syncPriorityDayStartAlarm,
  syncRoutineStartNotifications,
  syncWaterReminderNotifications,
} from '@features/day-plan-notifications';
import {
  reconcileLiveActivityFromPlan,
  syncLiveActivityIfSessionInProgress,
} from '@features/live-activity-sync';
import { useLocalNotifications } from '@features/local-notifications';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useSubscriptionStore } from '@features/subscriptions';
import {
  addLocalNotificationReceivedListener,
  addLocalNotificationResponseListener,
} from '@shared/lib/notifications';
import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
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
      useAppearanceStore.getState().hydrate();
      useDayPlanLayoutModeVisibilityStore.getState().hydrate();

      useDayPlanStore.getState().hydrate();
      useDayPlanDraftStore.getState().hydrate();
      useDayPlanTodoStore.getState().hydrate();
      useFixedFlowSetsStore.getState().hydrate();
      useDayPlanDraftStore.getState().rollPriorityPlanForwardIfEnded();
      useDayPlanStore.getState().prunePastEndedBlocks();
      syncTodayTabWithFixedRoutineApply();
      registerOtherCategoryResolverFromStorage();
      const plan = useDayPlanStore.getState();
      useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
        dateKey: plan.dateKey,
        blocks: plan.blocks,
      });
      if (!cancelled) setIsReady(true);

      /**
       * 구독은 선택 기능이므로 네트워크 상태·RevenueCat 설정 오류가
       * 앱 시작과 스플래시 해제를 막지 않도록 핵심 hydrate와 분리한다.
       */
      void useSubscriptionStore
        .getState()
        .hydrate()
        .catch((error) => {
          console.warn('[subscriptions] background hydrate failed', error);
        });
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
      await syncRoutineStartNotifications();
      await syncIncompleteRoutineReminderNotifications();
    })();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    return useDayPlanStore.subscribe((state, prev) => {
      if (
        state.blocks !== prev.blocks ||
        state.completedBlockIds !== prev.completedBlockIds ||
        state.skippedBlockIds !== prev.skippedBlockIds ||
        state.dateKey !== prev.dateKey
      ) {
        void syncIncompleteRoutineReminderNotifications();
      }
      if (state.blocks !== prev.blocks || state.dateKey !== prev.dateKey) {
        void syncCategoryReminderNotifications();
        void syncRoutineStartNotifications();
      }
    });
  }, [isReady]);

  /** 적용하기 on/off · 그룹 항목 변경 시 시간 알림·시작 알림 예약 재동기화 */
  useEffect(() => {
    if (!isReady) return;
    return useFixedFlowSetsStore.subscribe((state, prev) => {
      if (
        state.todayAppliedRevision === prev.todayAppliedRevision &&
        state.activeSetIds === prev.activeSetIds &&
        state.sets === prev.sets
      ) {
        return;
      }
      void syncCategoryReminderNotifications();
      void syncRoutineStartNotifications();
    });
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    return useDayPlanDraftStore.subscribe((state, prev) => {
      if (
        state.priorityCategoryOrder === prev.priorityCategoryOrder &&
        state.prioritySectionsCategoryOrder === prev.prioritySectionsCategoryOrder
      ) {
        return;
      }
      void syncCategoryReminderNotifications();
      void syncRoutineStartNotifications();
    });
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
      if (data.eventType === 'routineStart') {
        router.push('/(tabs)/day-plan');
        return;
      }
      if (data.eventType === 'incompleteRoutineReminder') {
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
        useDayPlanDraftStore.getState().rollPriorityPlanForwardIfEnded();
        useDayPlanStore.getState().prunePastEndedBlocks();
        syncTodayTabWithFixedRoutineApply();
        syncLiveActivityIfSessionInProgress();
        void useLocalNotificationsStore.getState().refreshPermission();
        void syncCategoryReminderNotifications();
        void syncMedicineReminderNotifications();
        void syncRoutineStartNotifications();
        void syncIncompleteRoutineReminderNotifications();
        useDayPlanDraftStore.getState().bumpWaterReminderSyncEpoch();
        registerOtherCategoryResolverFromStorage();
        void useSubscriptionStore.getState().refreshCustomerInfo();
      } else {
        /** 백그라운드/비활성 전환 시 대기 중인 저장 write를 즉시 정리 */
        void flushLocalStorageClientWrites();
      }
    });
    return () => sub.remove();
  }, [isReady]);

  return isReady;
}
