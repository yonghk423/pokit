import { getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { loadComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  syncTodayTabWithFixedRoutineApply,
  syncPinnedRoutineToWidget,
  getLocalDateKey,
  ensureBookstoreNoteWidgetLifecycle,
  syncBookstoreAndNoteWidgets,
  seedPokitWeekTourIntoTodayIfNeeded,
  seedReadingBookstoreIfNeeded,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanChromeSettingsStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
  useGoalDetailSettingsStore,
  seedRoutineStartTimesFromLegacySources,
  useRoutineStartTimesStore,
  useScheduledRoutinePlanStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { usePuzzleHistoryStore } from '@entities/puzzle-history';
import { useAppSessionStore } from '@shared/lib/app-session';
import {
  reconcileReminderTemplateNotificationRules,
  syncCategoryReminderNotifications,
} from '@features/category-reminder-notifications';
import {
  syncIncompleteRoutineReminderNotifications,
  syncMedicineReminderNotifications,
  syncPriorityDayEndAlarm,
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
import { logAppOpen } from '@shared/lib/analytics';
import { initCrashlytics } from '@shared/lib/crashlytics';

import { useAppearanceStore } from '@shared/lib/appearance/appearanceStore';
import { t, useAppLocaleStore } from '@shared/lib/i18n';
import { useAppFontStore } from '@shared/lib/ui-font';
import {
  ensureDefaultPriorityCatalog,
  flushLocalStorageClientWrites,
  initLocalStorageClient,
  loadDailyRhythmOnboardingCompleted,
  loadPriorityDayEndAlarm,
  loadPriorityDayStartAlarm,
  savePriorityDayRollMode,
} from '@shared/lib/storage';
import { prefetchDailyRhythmOnboardingAssets } from '@pages/day-plan/lib/dailyMateOnboardingAssets';

/** 저장소 → 전역 스토어 hydrate. 시작 시와 `restartAppSession()` 때 실행한다. */
function hydrateAppState() {
  ensureDefaultPriorityCatalog();
  seedReadingBookstoreIfNeeded();
  // 「하루가 지나면 담기 유지」임시 비활성 — keep 잔존 설정이 롤오버에 영향을 주지 않도록 reset 고정
  savePriorityDayRollMode('reset');
  useAppearanceStore.getState().hydrate();
  useAppFontStore.getState().hydrate();
  useDayPlanLayoutModeVisibilityStore.getState().hydrate();
  useDayPlanChromeSettingsStore.getState().hydrate();

  useDayPlanStore.getState().hydrate();
  useDayPlanDraftStore.getState().hydrate();
  useFixedFlowSetsStore.getState().hydrate();
  useRoutineStartTimesStore.getState().hydrate();
  useScheduledRoutinePlanStore.getState().hydrate();
  useGoalDetailSettingsStore.getState().reloadAllFromStorage();
  useHistoryStore.getState().reloadFromStorage();
  useHorizonCompletionStore.getState().reloadFromStorage();
  usePuzzleHistoryStore.getState().reloadFromStorage();
  seedRoutineStartTimesFromLegacySources();
  useDayPlanDraftStore.getState().rollPriorityPlanForwardIfEnded();
  useDayPlanStore.getState().prunePastEndedBlocks();
  syncTodayTabWithFixedRoutineApply();
  syncPinnedRoutineToWidget();
  loadComicDiaryLibrary(getLocalDateKey(), number => t('comicDiary.defaultTitle', { number }));
  ensureBookstoreNoteWidgetLifecycle();
  syncBookstoreAndNoteWidgets();
  seedPokitWeekTourIntoTodayIfNeeded();
  registerOtherCategoryResolverFromStorage();
  const plan = useDayPlanStore.getState();
  useDayPlanRuntimeStore.getState().buildTimelineFromBlocks({
    dateKey: plan.dateKey,
    blocks: plan.blocks,
  });
}

/**
 * 앱 전역 부트스트랩: hydrate + 알림 리스너 + Live Activity 동기화.
 * Expo Router `app/_layout.tsx`의 루트 컴포넌트에서 한 번 호출한다.
 */
export function useAppBootstrap() {
  const router = useRouter();
  useLocalNotifications();
  const [isReady, setIsReady] = useState(false);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);
  const waterReminderSyncEpoch = useDayPlanDraftStore((s) => s.waterReminderSyncEpoch);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initLocalStorageClient();
      if (cancelled) return;

      // 첫 화면 시간 설정이 켜져 있을 때만 온보딩 이미지를 미리 올린다.
      if (FEATURE_FLAGS.dailyRhythmWindow && !loadDailyRhythmOnboardingCompleted()) {
        void prefetchDailyRhythmOnboardingAssets();
      }

      if (__DEV__) {
        const { ensureDevelopmentMockData } = await import('./development/mockData');
        const { registerDevelopmentMockMenu } = await import('./development/mockMenu');
        const profile = getDevelopmentStorageProfile();
        if (profile) { useAppLocaleStore.getState().setLocale(profile); ensureDevelopmentMockData(); }
        registerDevelopmentMockMenu();
      }
      const mockLocale = getDevelopmentStorageProfile();
      if (mockLocale) useAppLocaleStore.getState().setLocale(mockLocale);
      else useAppLocaleStore.getState().hydrateFromDevice();
      hydrateAppState();

      if (FEATURE_FLAGS.dailyRhythmWindow && !loadDailyRhythmOnboardingCompleted()) {
        await prefetchDailyRhythmOnboardingAssets();
      }
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

      /** Analytics도 선택 경로 — 네이티브 모듈/네트워크 실패가 스플래시를 막지 않게 한다. */
      void logAppOpen().catch((error) => {
        console.warn('[analytics] background init failed', error);
      });
      void initCrashlytics().catch((error) => {
        console.warn('[crashlytics] background init failed', error);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Runs synchronously inside restart(), so stores are fresh before the keyed tree remounts.
  useEffect(() => useAppSessionStore.subscribe((state, prev) => {
    if (state.epoch === prev.epoch) return;
    useDayPlanRuntimeStore.getState().stopTicker();
    useDayPlanRuntimeStore.getState().clearRuntime();
    hydrateAppState();
  }), []);


  useEffect(() => {
    if (!isReady) return;
    const { enabled: startEnabled } = loadPriorityDayStartAlarm();
    const endAlarm = loadPriorityDayEndAlarm();
    const { priorityStart: initialPriorityStart } = useDayPlanDraftStore.getState();
    void (async () => {
      await syncPriorityDayStartAlarm({ enabled: startEnabled, startHhmm: initialPriorityStart });
      await syncPriorityDayEndAlarm({
        enabled: endAlarm.enabled,
        reminderHhmm: endAlarm.reminderHhmm,
        reminderNextDay: endAlarm.reminderNextDay,
      });
      reconcileReminderTemplateNotificationRules();
      await syncCategoryReminderNotifications();
      await syncMedicineReminderNotifications();
      await syncRoutineStartNotifications();
      await syncIncompleteRoutineReminderNotifications();
    })();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    return useDayPlanStore.subscribe((state, prev) => {
      if (state.blocks !== prev.blocks || state.dateKey !== prev.dateKey) {
        void syncCategoryReminderNotifications();
        void syncMedicineReminderNotifications();
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
      void syncMedicineReminderNotifications();
      void syncRoutineStartNotifications();
    });
  }, [isReady]);

  /** 담기에서 저장한 전역 루틴 시작 시각 변경 시 시작 알림 재예약 */
  useEffect(() => {
    if (!isReady) return;
    return useRoutineStartTimesStore.subscribe((state, prev) => {
      if (state.byCategoryKey === prev.byCategoryKey) return;
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
      void syncMedicineReminderNotifications();
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
        router.push('/day-plan');
        return;
      }
      if (data.eventType === 'routineStart') {
        router.push('/day-plan');
        return;
      }
      if (data.eventType === 'incompleteRoutineReminder') {
        router.push('/day-plan');
        return;
      }
      if (data.eventType === 'priorityDayEnd') {
        router.push('/day-plan');
        return;
      }
      if (data.eventType === 'medicineDoseReminder') {
        const bid = typeof data.blockId === 'string' ? data.blockId : '';
        if (bid) {
          router.push({ pathname: '/activity-session', params: { blockId: bid } });
        } else {
          router.push('/day-plan');
        }
        return;
      }
      if (data.eventType === 'waterIntervalReminder') {
        const bid = typeof data.blockId === 'string' ? data.blockId : '';
        if (bid) {
          router.push({ pathname: '/activity-session', params: { blockId: bid } });
        } else {
          router.push('/day-plan');
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
        seedPokitWeekTourIntoTodayIfNeeded();
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
