import { getSupabaseUrl } from '@shared/config/supabase';
import { migrateHeroAiAuthSession } from '@shared/lib/supabase/heroAiSecureStorage';
import { initializeHeroCardEditHint } from '@shared/lib/storage/heroCardEditHintStorage';
import { initializeHeroCharacterNameHint } from '@shared/lib/storage/heroCharacterNameHintStorage';
import { getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { loadComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
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
import { usePuzzleHistoryStore } from '@entities/puzzle-history';
import { useAppSessionStore } from '@shared/lib/app-session';
import {
  reconcileLiveActivityFromPlan,
  syncLiveActivityIfSessionInProgress,
} from '@features/live-activity-sync';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useSubscriptionStore } from '@features/subscriptions';
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
 * 앱 전역 부트스트랩: hydrate + Live Activity 동기화.
 * Expo Router `app/_layout.tsx`의 루트 컴포넌트에서 한 번 호출한다.
 */
export function useAppBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await initLocalStorageClient();
      if (cancelled) return;
      // Best-effort launch migration; AI requests retry securely if storage is temporarily unavailable.
      void migrateHeroAiAuthSession(getSupabaseUrl()).catch(() => undefined);
      initializeHeroCardEditHint();
      initializeHeroCharacterNameHint();

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
    syncLiveActivityIfSessionInProgress();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useDayPlanDraftStore.getState().rollPriorityPlanForwardIfEnded();
        useDayPlanStore.getState().prunePastEndedBlocks();
        syncTodayTabWithFixedRoutineApply();
        seedPokitWeekTourIntoTodayIfNeeded();
        syncLiveActivityIfSessionInProgress();
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
