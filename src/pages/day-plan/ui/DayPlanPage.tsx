import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  filterDayPlanFlowBlocks,
  getFlowCompletionCategoryKeysForBlock,
  getFlowCompletionUnitCountForBlock,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isPriorityWindowEligible,
  isPriorityWindowEndedForToday,
  notifyFixedFlowApplyScheduleChanged,
  parseHHmmToMinutes,
  resolveBlockCategoryKey,
  syncTodayTabWithFixedRoutineApply,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
  useDayPlanTodoStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import {
  rescheduleDayPlanNotifications,
  syncPriorityDayStartAlarm,
} from '@features/day-plan-notifications';
import {
  buildLiveActivityPayloadForBlock,
  endLiveActivityAndDismiss,
  endPokitLiveActivity,
  reconcileLiveActivityFromPlan,
  suspendPokitApp,
  upsertLiveActivityAndDismiss,
  upsertPokitLiveActivity,
} from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadDailyRhythmOnboardingCompleted,
  loadPriorityDayStartAlarm,
  loadWelcomeIntroSeen,
  markDailyRhythmOnboardingCompletedAndFlush,
  saveRoutineCatalogSelectionKeys,
} from '@shared/lib/storage';
import { coerceDayPlanLayoutMode } from '@shared/lib/storage/dayPlanLayoutModeVisibility';
import { ThemedView } from '@shared/ui/themed-view';
import { prefetchWelcomeIntroAssets } from '@shared/lib/welcome-intro-assets';
import { t } from '@shared/lib/i18n';

import {
  defaultPriorityWindowFromNow,
  getPickerCategoryLabel,
  isOvernightHhmmRange,
  PRIMARY,
} from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { DailyRhythmOnboardingGate } from './DailyRhythmOnboardingGate';
import { DayNotePlanSection } from './DayNotePlanSection';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import type { DayPlanLayoutMode } from './DayPlanLayoutModeTabs';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { QuickMemoPlanSection } from './QuickMemoPlanSection';
import { ReadingPlanSection } from './ReadingPlanSection';

export function DayPlanPage({
  renderRoutineInlineSettings,
}: {
  renderRoutineInlineSettings?: (
    categoryKey: string,
    theme: { ink: string; muted: string; border: string; isDark: boolean },
  ) => ReactNode;
} = {}) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [rhythmGateOpen, setRhythmGateOpen] = useState(
    () => !loadDailyRhythmOnboardingCompleted(),
  );

  const {
    planMode,
    isFocusStarted,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityPlanExplicitMultiDay,
    priorityStart,
    priorityEnd,
    priorityCategoryOrder,
    quickMemoDraft,
    priorityMealSlotLayoutEnabled,
    prioritySpineLayoutEnabled,
    setPlanMode,
    setIsFocusStarted,
    setPriorityPlanDateKey,
    setPriorityPlanDateKeyEnd,
    applyPriorityPlanCalendarRange,
    syncOvernightPriorityPlanDates,
    rollPriorityPlanForwardIfEnded,
    setPriorityStart,
    setPriorityEnd,
    setPriorityCategoryOrder,
    bumpCategoryLabelEpoch,
    clearCompletedFocusCategoryKeys,
    clearPlanCompletionDismissedKeys,
    setQuickMemoDraft,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      isFocusStarted: s.isFocusStarted,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      priorityPlanExplicitMultiDay: s.priorityPlanExplicitMultiDay,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityCategoryOrder: s.priorityCategoryOrder,
      quickMemoDraft: s.quickMemoDraft,
      priorityMealSlotLayoutEnabled: s.priorityMealSlotLayoutEnabled,
      prioritySpineLayoutEnabled: s.prioritySpineLayoutEnabled,
      setPlanMode: s.setPlanMode,
      setIsFocusStarted: s.setIsFocusStarted,
      setPriorityPlanDateKey: s.setPriorityPlanDateKey,
      setPriorityPlanDateKeyEnd: s.setPriorityPlanDateKeyEnd,
      applyPriorityPlanCalendarRange: s.applyPriorityPlanCalendarRange,
      syncOvernightPriorityPlanDates: s.syncOvernightPriorityPlanDates,
      rollPriorityPlanForwardIfEnded: s.rollPriorityPlanForwardIfEnded,
      setPriorityStart: s.setPriorityStart,
      setPriorityEnd: s.setPriorityEnd,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      bumpCategoryLabelEpoch: s.bumpCategoryLabelEpoch,
      clearCompletedFocusCategoryKeys: s.clearCompletedFocusCategoryKeys,
      clearPlanCompletionDismissedKeys: s.clearPlanCompletionDismissedKeys,
      setQuickMemoDraft: s.setQuickMemoDraft,
      setPriorityMealSlotLayoutEnabled: s.setPriorityMealSlotLayoutEnabled,
      setPrioritySpineLayoutEnabled: s.setPrioritySpineLayoutEnabled,
    })),
  );

  const layoutMode: DayPlanLayoutMode = useMemo(() => {
    if (prioritySpineLayoutEnabled) return 'spine';
    return priorityMealSlotLayoutEnabled ? 'sections' : 'bag';
  }, [priorityMealSlotLayoutEnabled, prioritySpineLayoutEnabled]);

  const visibility = useDayPlanLayoutModeVisibilityStore((s) => s.visibility);
  const coerceLayoutMode = useDayPlanLayoutModeVisibilityStore((s) => s.coerceMode);
  const hydrateLayoutModeVisibility = useDayPlanLayoutModeVisibilityStore((s) => s.hydrate);
  const visibleLayoutModes = useMemo(
    () => (['bag', 'sections', 'spine'] as const).filter((mode) => visibility[mode]),
    [visibility],
  );

  const effectiveLayoutMode = useMemo(
    () => coerceDayPlanLayoutMode(layoutMode, visibility),
    [layoutMode, visibility],
  );

  const {
    todayAppliedRevision,
    fixedFlowSets,
    hydrate: hydrateFixedFlowSets,
    refreshTodayAppliedCategoryKeys,
    setFixedRoutineApplyLayoutMode,
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      todayAppliedRevision: s.todayAppliedRevision,
      fixedFlowSets: s.sets,
      hydrate: s.hydrate,
      refreshTodayAppliedCategoryKeys: s.refreshTodayAppliedCategoryKeys,
      setFixedRoutineApplyLayoutMode: s.setFixedRoutineApplyLayoutMode,
    })),
  );

  useEffect(() => {
    hydrateLayoutModeVisibility();
  }, [hydrateLayoutModeVisibility]);

  useEffect(() => {
    if (!loadWelcomeIntroSeen()) {
      void prefetchWelcomeIntroAssets();
    }
  }, []);

  useEffect(() => {
    if (effectiveLayoutMode === layoutMode) return;
    setPlanMode('priority');
    setPriorityMealSlotLayoutEnabled(effectiveLayoutMode === 'sections');
    setPrioritySpineLayoutEnabled(effectiveLayoutMode === 'spine');
    setFixedRoutineApplyLayoutMode(effectiveLayoutMode);
    notifyFixedFlowApplyScheduleChanged();
  }, [
    effectiveLayoutMode,
    layoutMode,
    setPlanMode,
    setPriorityMealSlotLayoutEnabled,
    setPrioritySpineLayoutEnabled,
    setFixedRoutineApplyLayoutMode,
  ]);

  const onSelectLayoutMode = useCallback(
    (mode: DayPlanLayoutMode) => {
      const nextMode = coerceLayoutMode(mode);
      setPlanMode('priority');
      setPriorityMealSlotLayoutEnabled(nextMode === 'sections');
      setPrioritySpineLayoutEnabled(nextMode === 'spine');
      setFixedRoutineApplyLayoutMode(nextMode);
      notifyFixedFlowApplyScheduleChanged();
    },
    [coerceLayoutMode, setPlanMode, setPriorityMealSlotLayoutEnabled, setPrioritySpineLayoutEnabled, setFixedRoutineApplyLayoutMode],
  );

  useEffect(() => {
    hydrateFixedFlowSets();
  }, [hydrateFixedFlowSets]);

  useFocusEffect(
    useCallback(() => {
      hydrateLayoutModeVisibility();
      setFixedRoutineApplyLayoutMode(effectiveLayoutMode);
      refreshTodayAppliedCategoryKeys();
      syncTodayTabWithFixedRoutineApply();
    }, [hydrateLayoutModeVisibility, refreshTodayAppliedCategoryKeys, setFixedRoutineApplyLayoutMode, effectiveLayoutMode]),
  );

  useFocusEffect(
    useCallback(() => {
      // 적용 구간이 지난 날짜에 끝났다면 오늘 기준으로 날짜를 전진
      rollPriorityPlanForwardIfEnded();
      // 목표 상세(모달)에서 복귀할 때 카테고리 라벨 즉시 재평가
      bumpCategoryLabelEpoch();
      // 탭 전환/화면 freeze 이후에도 담기 순서 키를 최신 스토어 스냅샷으로 동기화
      const latestOrder = useDayPlanDraftStore.getState().priorityCategoryOrder;
      setPriorityCategoryOrder([...latestOrder]);
      // 온보딩 플래그가 디스크에 반영됐으면 게이트를 닫는다
      if (loadDailyRhythmOnboardingCompleted()) {
        setRhythmGateOpen(false);
      }
    }, [bumpCategoryLabelEpoch, rollPriorityPlanForwardIfEnded, setPriorityCategoryOrder]),
  );

  useEffect(() => {
    syncOvernightPriorityPlanDates();
  }, [
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityStart,
    priorityEnd,
    syncOvernightPriorityPlanDates,
  ]);

  const quickMemoInputRef = useRef<TextInput>(null);

  const [nowTick, setNowTick] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  /** 구간이 완전히 끝났으면(지난 날짜 종료 포함) 오늘 기준으로 날짜 전진 — 앱이 떠 있는 채 자정/종료를 넘겨도 갱신 */
  useEffect(() => {
    rollPriorityPlanForwardIfEnded();
  }, [nowTick, planMode, rollPriorityPlanForwardIfEnded]);

  /** 우선순위 적용일·집중 구간 안이면 true — FAB 노출·자동 종료 판단에 공통 사용 */
  const priorityWindowCtx = useMemo(
    () => ({
      planMode,
      priorityStart,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      nowKey: getLocalDateKey(),
      nowMin: getLocalMinutesOfDayNow(),
    }),
    [planMode, priorityStart, priorityEnd, priorityPlanDateKey, priorityPlanDateKeyEnd, nowTick],
  );

  const priorityWindowEligible = useMemo(
    () => isPriorityWindowEligible(priorityWindowCtx),
    [priorityWindowCtx],
  );

  /** 당일 기준으로 집중 구간이 이미 끝났는지(시작 전 아님) */
  const priorityWindowEndedForToday = useMemo(
    () => isPriorityWindowEndedForToday(priorityWindowCtx),
    [priorityWindowCtx],
  );

  const setTodoActiveDateKey = useDayPlanTodoStore((s) => s.setActiveDateKey);
  const todayKey = getLocalDateKey();

  useEffect(() => {
    setTodoActiveDateKey(todayKey);
  }, [todayKey, nowTick, setTodoActiveDateKey]);

  const { addBlock, quickMemos, removeQuickMemo, completeBlocks } = useDayPlanStore(
    useShallow((s) => ({
      addBlock: s.addBlock,
      quickMemos: s.quickMemos,
      removeQuickMemo: s.removeQuickMemo,
      prunePastEndedBlocks: s.prunePastEndedBlocks,
      completeBlocks: s.completeBlocks,
    })),
  );
  const { dayPlanBlocks, completedBlockIds, skippedBlockIds } = useDayPlanStore(
    useShallow((s) => ({
      dayPlanBlocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
    })),
  );
  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  /** 종료 시각이 지난 항목은 리스트에서 자동 정리 */
  useEffect(() => {
    const run = () => {
      useDayPlanStore.getState().prunePastEndedBlocks();
    };
    run();
    const id = setInterval(run, 30 * 1000);
    return () => clearInterval(id);
  }, []);

  /** 데이플랜에서 시작 시각만 바꿔도 알람 시각이 따라가게 (연속 호출·중복 예약 방지) */
  const priorityStartAlarmSyncRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loadPriorityDayStartAlarm().enabled) return;
    const timer = setTimeout(() => {
      if (priorityStartAlarmSyncRef.current === priorityStart) return;
      priorityStartAlarmSyncRef.current = priorityStart;
      void syncPriorityDayStartAlarm({ enabled: true, startHhmm: priorityStart });
    }, 400);
    return () => clearTimeout(timer);
  }, [priorityStart]);

  useEffect(() => {
    if (planMode !== 'priority') return;
    if (priorityCategoryOrder.length > 0) return;
    const hasValidRange =
      parseHHmmToMinutes(priorityStart) !== null && parseHHmmToMinutes(priorityEnd) !== null;
    if (hasValidRange) return;
    const w = defaultPriorityWindowFromNow();
    setPriorityStart(w.startTime);
    setPriorityEnd(w.endTime);
  }, [planMode, priorityCategoryOrder.length, priorityEnd, priorityStart, setPriorityEnd, setPriorityStart]);

  /** 고정 루틴「오늘 적용」상태와 오늘 탭 담기·구간 동기화 */
  useEffect(() => {
    if (planMode !== 'priority') return;
    syncTodayTabWithFixedRoutineApply();
  }, [planMode, todayAppliedRevision, fixedFlowSets]);

  const c = useMemo(() => palette(isDark), [isDark]);

  const handleRhythmEndDateChoice = useCallback(
    (start: string, end: string, target: 'today' | 'nextDay') => {
      setPriorityStart(start);
      setPriorityEnd(end);
      const lo = getLocalDateKey();
      const endDate = target === 'nextDay' ? addDaysToLocalDateKey(lo, 1) : lo;
      applyPriorityPlanCalendarRange(lo, endDate);
    },
    [applyPriorityPlanCalendarRange, setPriorityEnd, setPriorityStart],
  );

  const handleRhythmConfirm = useCallback(
    (start: string, end: string) => {
      setPriorityStart(start);
      setPriorityEnd(end);
      // 온보딩에서 당일/다음 날을 이미 골랐다면 explicit multi-day가 유지되고,
      // 아니면 overnight 시각 규칙으로 날짜를 맞춘다.
      syncOvernightPriorityPlanDates();
      void markDailyRhythmOnboardingCompletedAndFlush().then(() => {
        setRhythmGateOpen(false);
        if (!loadWelcomeIntroSeen()) {
          void prefetchWelcomeIntroAssets().finally(() => {
            router.push('/welcome-intro');
          });
        }
      });
    },
    [router, setPriorityEnd, setPriorityStart, syncOvernightPriorityPlanDates],
  );

  const syncScheduledNotifications = useCallback(() => {
    void rescheduleDayPlanNotifications();
  }, []);

  /** 씬은 탭 아래까지 이미 분리됨 — 스크롤 말줄임만 최소(기본 6px) */
  const scrollContentBottomPad = useMemo(() => tabBarScrollBottomInset(insets.bottom), [insets.bottom]);

  const handlePriorityCategoryPress = useCallback(
    (key: string) => {
      const nextOrder = priorityCategoryOrder.includes(key)
        ? priorityCategoryOrder.filter((k) => k !== key)
        : [...priorityCategoryOrder, key];
      setPriorityCategoryOrder(nextOrder);
      saveRoutineCatalogSelectionKeys(nextOrder);
    },
    [priorityCategoryOrder, setPriorityCategoryOrder],
  );

  const handleOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey, source: 'today' },
      });
    },
    [router],
  );

  const handleOpenFixedRoutine = useCallback(() => {
    router.push('/(tabs)/fixed-routines');
  }, [router]);

  const handleOpenFocusDetail = useCallback(
    (categoryKey: string) => {
      const ps = parseHHmmToMinutes(priorityStart);
      const pe = parseHHmmToMinutes(priorityEnd);
      const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
      if (ps === null || pe === null) {
        Alert.alert(t('alert.timeFormat.title'), t('alert.timeFormat.checkStartEnd'));
        return;
      }
      if (!overnight && pe <= ps) {
        Alert.alert(t('alert.timeFormat.title'), t('alert.timeFormat.checkStartEnd'));
        return;
      }
      const label = getPickerCategoryLabel(categoryKey);
      const result = addBlock({
        title: label,
        startMinutes: ps,
        endMinutes: pe,
        endsNextCalendarDay: overnight,
        category: label,
        categoryKey: categoryKey,
        replaceOverlapping: true,
        planDateKey: getLocalDateKey(),
      });
      if (!result.ok) {
        Alert.alert(t('alert.openFailed.title'), t('alert.openFailed.focusDetail'));
        return;
      }
      router.push({
        pathname: '/activity-session',
        params: { blockId: result.blockId },
      });
    },
    [addBlock, priorityEnd, priorityStart, router],
  );

  const onSave = () => {
    if (planMode === 'quickMemo') {
      const draftLines = quickMemoDraft
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((t) => t.length > 0);
      if (draftLines.length === 0) {
        const planState = useDayPlanStore.getState();
        for (const block of [...planState.blocks].filter((b) => b.blockOrigin === 'quickMemo')) {
          planState.removeBlock(block.id);
        }
        for (const memo of [...planState.quickMemos]) {
          planState.removeQuickMemo(memo.id);
        }
        setQuickMemoDraft('');
        syncScheduledNotifications();
        reconcileLiveActivityFromPlan();
        void (async () => {
          const dismissed = await endLiveActivityAndDismiss();
          if (!dismissed) {
            await suspendPokitApp();
          }
        })();
        return;
      }

      const w = defaultPriorityWindowFromNow();
      const ps = parseHHmmToMinutes(w.startTime);
      const pe = parseHHmmToMinutes(w.endTime);
      if (ps === null || pe === null || pe <= ps) {
        Alert.alert(t('alert.saveFailed.title'), t('alert.saveFailed.defaultWindow'));
        return;
      }

      const blockTitle = draftLines.join('\n');
      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        category: t('category.userFallback'),
        replaceOverlapping: true,
        blockOrigin: 'quickMemo',
      });

      if (!result.ok) {
        if (result.reason === 'in_the_past') {
          Alert.alert(t('alert.pastTime.title'), t('alert.pastTime.endMustBeFuture'));
          return;
        }
        Alert.alert(t('alert.saveFailed.title'), t('alert.saveFailed.quickMemo'));
        return;
      }

      for (const m of quickMemos) {
        removeQuickMemo(m.id);
      }

      syncScheduledNotifications();
      reconcileLiveActivityFromPlan();

      const payload = buildLiveActivityPayloadForBlock({
        blockId: result.blockId,
        status: 'active',
      });
      if (payload) {
        void (async () => {
          const dismissed = await upsertLiveActivityAndDismiss(payload);
          if (!dismissed) {
            await upsertPokitLiveActivity(payload);
          }
        })();
      }
      return;
    }

    if (planMode === 'priority') {
      if (priorityCategoryOrder.length === 0) {
        Alert.alert(t('alert.categoryRequired.title'), t('alert.categoryRequired.message'));
        return;
      }
      const today = getLocalDateKey();
      let effectiveStart = priorityStart;
      let effectiveEnd = priorityEnd;
      if (!priorityWindowEligible) {
        const fresh = defaultPriorityWindowFromNow();
        effectiveStart = fresh.startTime;
        effectiveEnd = fresh.endTime;
        const freshOvernight = isOvernightHhmmRange(effectiveStart, effectiveEnd);
        setPriorityStart(effectiveStart);
        setPriorityEnd(effectiveEnd);
        applyPriorityPlanCalendarRange(
          today,
          freshOvernight ? addDaysToLocalDateKey(today, 1) : today,
        );
        clearCompletedFocusCategoryKeys();
        clearPlanCompletionDismissedKeys();
      }

      const ps = parseHHmmToMinutes(effectiveStart);
      const pe = parseHHmmToMinutes(effectiveEnd);
      const overnight = isOvernightHhmmRange(effectiveStart, effectiveEnd);
      if (ps === null || pe === null) {
        Alert.alert(t('alert.timeFormat.title'), t('alert.timeFormat.useHhmm'));
        return;
      }
      if (!overnight && pe <= ps) {
        Alert.alert(t('alert.timeRange.title'), t('alert.timeRange.endAfterStart'));
        return;
      }

      const headKey = priorityCategoryOrder[0]!;
      const catLabel = getPickerCategoryLabel(headKey);
      const orderedLabels = priorityCategoryOrder.map((key) => getPickerCategoryLabel(key));
      const blockTitle = orderedLabels.length > 0 ? orderedLabels.join('\n') : t('dayPlan.blockFallback');

      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        endsNextCalendarDay: overnight,
        category: catLabel,
        categoryKey: headKey,
        replaceOverlapping: true,
        blockOrigin: 'prioritySession',
        planDateKey: today,
      });

      if (!result.ok) {
        if (result.reason === 'overlap') {
          Alert.alert(t('alert.overlap.title'), t('alert.overlap.message'));
          return;
        }
        if (result.reason === 'in_the_past') {
          Alert.alert(t('alert.pastTime.title'), t('alert.pastTime.endMustBeFuture'));
          return;
        }
        Alert.alert(t('alert.startFailed.title'), t('alert.startFailed.priorityPlan'));
        return;
      }

      syncScheduledNotifications();
      endFocusedLiveActivity();
      setIsFocusStarted(true);
      return;
    }
  };

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const handleQuickMemoSavePress = useCallback(() => {
    quickMemoInputRef.current?.blur();
    Keyboard.dismiss();
    onSaveRef.current();
  }, []);

  /**
   * 우선순위 모드: 담기에 루틴이 있으면 집중 세션을 자동으로 연다.
   * 적용일·집중 구간 밖이거나 담기가 비면 집중 상태·Live Activity를 자동으로 정리한다.
   */
  const endFocusedLiveActivity = useCallback(() => {
    const activeBlockId = useDayPlanRuntimeStore.getState().activeBlockId;
    const focusBlockId = useDayPlanStore.getState().liveActivityChecklistFocusBlockId;
    const target = activeBlockId ?? focusBlockId;
    if (target) {
      void endPokitLiveActivity(target);
    }
  }, []);

  useEffect(() => {
    if (planMode !== 'priority') return;
    if (priorityCategoryOrder.length === 0) {
      if (isFocusStarted) {
        setIsFocusStarted(false);
        endFocusedLiveActivity();
      }
      return;
    }

    if (priorityWindowEligible) {
      return;
    }

    // 구간 밖·종료 후: 집중/완료 상태만 정리.
    // 담기 목록 리셋은 rollPriorityPlanForwardIfEnded·만료 effect에서
    // 고정 루틴 재적용과 함께 처리한다(여기서 비우면 고정 루틴까지 사라짐).
    if (priorityWindowEndedForToday || isFocusStarted) {
      setIsFocusStarted(false);
      clearCompletedFocusCategoryKeys();
      clearPlanCompletionDismissedKeys();
      endFocusedLiveActivity();
    }
  }, [
    planMode,
    priorityCategoryOrder.length,
    priorityWindowEligible,
    priorityWindowEndedForToday,
    isFocusStarted,
    setIsFocusStarted,
    clearCompletedFocusCategoryKeys,
    clearPlanCompletionDismissedKeys,
    endFocusedLiveActivity,
  ]);

  /** 전체 루틴 시간 만료 → 진행 중 블록 자동 완료 + 담기 리스트 초기화 */
  const priorityWindowScheduleKey = useMemo(
    () => `${priorityPlanDateKey}|${priorityPlanDateKeyEnd}|${priorityStart}|${priorityEnd}`,
    [priorityPlanDateKey, priorityPlanDateKeyEnd, priorityStart, priorityEnd],
  );
  const priorityWindowAutoFinishedRef = useRef(false);
  useEffect(() => {
    priorityWindowAutoFinishedRef.current = false;
  }, [priorityWindowScheduleKey]);

  useEffect(() => {
    if (planMode !== 'priority') return;
    if (!priorityWindowEndedForToday) return;
    if (priorityWindowAutoFinishedRef.current) return;
    priorityWindowAutoFinishedRef.current = true;

    const { blocks, completedBlockIds: cIds, skippedBlockIds: sIds } = useDayPlanStore.getState();
    const done = new Set([...cIds, ...sIds]);
    const todayFlowBlocks = filterDayPlanFlowBlocks(blocks);
    const pendingFlowBlocks = todayFlowBlocks.filter((b) => !done.has(b.id));
    if (pendingFlowBlocks.length > 0) {
      const history = useHistoryStore.getState();
      history.hydrate();
      const plannedUnitCount = todayFlowBlocks.reduce((sum, flowBlock) => {
        const units = getFlowCompletionUnitCountForBlock(flowBlock);
        return sum + (Number.isFinite(units) && units > 0 ? units : 1);
      }, 0);
      const plannedCountForDay = Math.max(1, plannedUnitCount);
      for (const block of pendingFlowBlocks) {
        const categoryKeysRaw = getFlowCompletionCategoryKeysForBlock(block);
        const fallbackCategoryKey =
          resolveBlockCategoryKey({ category: block.category, categoryKey: block.categoryKey }) ?? 'other';
        const categoryKeys = categoryKeysRaw.length > 0 ? categoryKeysRaw : [fallbackCategoryKey];
        for (const categoryKey of categoryKeys) {
          history.recordFocusSession({
            dateKey: useDayPlanStore.getState().dateKey,
            categoryKey,
            completed: true,
            plannedCountForDay,
          });
        }
      }
      completeBlocks(pendingFlowBlocks.map((b) => b.id));
      void rescheduleDayPlanNotifications();
    }

    setIsFocusStarted(false);
    clearCompletedFocusCategoryKeys();
    clearPlanCompletionDismissedKeys();
    setPriorityCategoryOrder([]);
    // reset: 수동 담기만 비우고, 오늘 적용 중인 고정 루틴은 다시 반영
    syncTodayTabWithFixedRoutineApply();
    endFocusedLiveActivity();
  }, [
    planMode,
    priorityWindowEndedForToday,
    completeBlocks,
    setIsFocusStarted,
    clearCompletedFocusCategoryKeys,
    clearPlanCompletionDismissedKeys,
    setPriorityCategoryOrder,
    endFocusedLiveActivity,
  ]);

  /** 담기·루틴 탭에서 항목이 선택되면 시작 버튼 없이 바로 집중 세션을 연다 */
  useEffect(() => {
    if (planMode !== 'priority') return;
    if (isFocusStarted) return;
    if (priorityCategoryOrder.length === 0) return;

    onSaveRef.current();
  }, [planMode, isFocusStarted, priorityCategoryOrder]);

  const { registerPrimaryAction } = useDayPlanTabBridge();

  /** 마운트 해제 시 primary 를 idle로 되돌림 */
  useEffect(() => {
    return () => {
      registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.start'), hidden: false });
    };
  }, [registerPrimaryAction]);

  useEffect(() => {
    if (planMode === 'priority') {
      registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.autoStart'), hidden: true });
      return;
    }
    if (planMode === 'quickMemo') {
      registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.saveQuickMemo'), hidden: true });
      return;
    }
    if (planMode === 'dayNote') {
      registerPrimaryAction(null, { disabled: true, label: t('planMode.dayNote'), hidden: true });
      return;
    }
    if (planMode === 'todoList') {
      registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.addTodo'), hidden: true });
      return;
    }
    if (planMode === 'reading') {
      registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.readingSettings'), hidden: true });
      return;
    }
    registerPrimaryAction(null, { disabled: true, label: t('dayPlan.primary.start'), hidden: false });
  }, [registerPrimaryAction, planMode]);

  const shellBg = c.containerLow;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <KeyboardAvoidingView
        style={[styles.keyboardColumn, { backgroundColor: shellBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={planMode !== 'dayNote' && planMode !== 'quickMemo'}
        keyboardVerticalOffset={0}>
        <View style={[styles.mainColumn, { backgroundColor: shellBg }]}>
          {planMode === 'quickMemo' ? (
            <View style={[styles.quickMemoColumn, { backgroundColor: shellBg }]}>
              <View style={[styles.contentPad, styles.quickMemoContentPad]}>
                <QuickMemoPlanSection
                  ref={quickMemoInputRef}
                  c={c}
                  isDark={isDark}
                  memos={quickMemos}
                  draft={quickMemoDraft}
                  onChangeDraft={setQuickMemoDraft}
                  onSavePress={handleQuickMemoSavePress}
                />
              </View>
            </View>
          ) : planMode === 'dayNote' ? (
            <View style={[styles.priorityModeStack, { backgroundColor: c.containerLow }]}>
              <DayNotePlanSection c={c} isDark={isDark} />
            </View>
          ) : planMode === 'reading' ? (
            <View style={[styles.priorityModeStack, { backgroundColor: c.containerLow }]}>
              <ReadingPlanSection c={c} isDark={isDark} />
            </View>
          ) : (
            <View style={[styles.priorityModeStack, { backgroundColor: c.containerLow }]}>
              <PriorityBasedPlanSection
                c={c}
                isFocusStarted={isFocusStarted}
                priorityPlanDateKey={priorityPlanDateKey}
                onChangePriorityPlanDateKey={setPriorityPlanDateKey}
                priorityPlanDateKeyEnd={priorityPlanDateKeyEnd}
                onChangePriorityPlanDateKeyEnd={setPriorityPlanDateKeyEnd}
                applyPriorityPlanCalendarRange={applyPriorityPlanCalendarRange}
                priorityPlanExplicitMultiDay={priorityPlanExplicitMultiDay}
                priorityStart={priorityStart}
                priorityEnd={priorityEnd}
                onChangePriorityStart={setPriorityStart}
                onChangePriorityEnd={setPriorityEnd}
                priorityCategoryOrder={priorityCategoryOrder}
                onSelectCategory={handlePriorityCategoryPress}
                onOpenCategorySettings={handleOpenCategorySettings}
                renderRoutineInlineSettings={renderRoutineInlineSettings}
                onOpenFocusDetail={handleOpenFocusDetail}
                onOpenFixedRoutine={handleOpenFixedRoutine}
                layoutMode={effectiveLayoutMode}
                onSelectLayoutMode={onSelectLayoutMode}
                visibleLayoutModes={visibleLayoutModes}
                showTodoList={planMode === 'todoList'}
                onPressTodoList={() => setPlanMode('todoList')}
                onExitTodoList={() => setPlanMode('priority')}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <DailyRhythmOnboardingGate
        visible={rhythmGateOpen}
        isDark={isDark}
        c={c}
        onConfirm={handleRhythmConfirm}
        onEndDateChoice={handleRhythmEndDateChoice}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  keyboardColumn: { flex: 1 },
  /** 키보드 회피 시 본문이 위로 밀리도록 */
  mainColumn: { flex: 1 },
  saveText: { color: PRIMARY, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 0, gap: 16 },
  priorityModeStack: { flex: 1, minHeight: 0, width: '100%', gap: 0 },
  /** 다이어리 등 풀블리드 섹션 제외 영역만 좌우 여백 */
  contentPad: { paddingHorizontal: 24 },
  quickMemoColumn: { flex: 1, minHeight: 0, width: '100%' },
  quickMemoContentPad: { flex: 1, minHeight: 0 },
});
