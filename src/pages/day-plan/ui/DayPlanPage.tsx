import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  parseHHmmToMinutes,
  useDayPlanStore,
} from '@entities/day-plan';
import {
  rescheduleDayPlanNotifications,
  syncPriorityDayStartAlarm,
} from '@features/day-plan-notifications';
import {
  buildLiveActivityPayloadForBlock,
  endLockFlowLiveActivity,
  reconcileLiveActivityFromPlan,
  upsertLiveActivityAndDismiss,
  upsertLockFlowLiveActivity,
} from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadDailyRhythmOnboardingCompleted,
  loadPriorityCatalogFixedRoutineKeys,
  loadPriorityDayStartAlarm,
  markDailyRhythmOnboardingCompleted,
} from '@shared/lib/storage';
import { openSupportMailComposer } from '@shared/lib/support';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  defaultPriorityWindowFromNow,
  getPickerCategoryItem,
  isOvernightHhmmRange,
  PRIMARY,
} from '../lib/dayPlanEditorShared';
import { ensureFixedRoutinesInPriorityOrder } from '../lib/ensureFixedRoutinesInPriorityOrder';
import { normalizeFixedRoutineCategoryKeys } from '../lib/normalizeFixedRoutineCategoryKeys';
import { palette } from '../lib/dayPlanPalette';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { DailyRhythmOnboardingGate } from './DailyRhythmOnboardingGate';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { PlanModeSwitch } from './PlanModeSwitch';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { QuickMemoPlanSection } from './QuickMemoPlanSection';

export function DayPlanPage() {
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
    priorityCatalogFixedRoutineEpoch,
    quickMemoDraft,
    setPlanMode,
    setIsFocusStarted,
    setPriorityPlanDateKey,
    setPriorityPlanDateKeyEnd,
    applyPriorityPlanCalendarRange,
    syncOvernightPriorityPlanDates,
    setPriorityStart,
    setPriorityEnd,
    setPriorityCategoryOrder,
    setQuickMemoDraft,
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
      priorityCatalogFixedRoutineEpoch: s.priorityCatalogFixedRoutineEpoch,
      quickMemoDraft: s.quickMemoDraft,
      setPlanMode: s.setPlanMode,
      setIsFocusStarted: s.setIsFocusStarted,
      setPriorityPlanDateKey: s.setPriorityPlanDateKey,
      setPriorityPlanDateKeyEnd: s.setPriorityPlanDateKeyEnd,
      applyPriorityPlanCalendarRange: s.applyPriorityPlanCalendarRange,
      syncOvernightPriorityPlanDates: s.syncOvernightPriorityPlanDates,
      setPriorityStart: s.setPriorityStart,
      setPriorityEnd: s.setPriorityEnd,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      setQuickMemoDraft: s.setQuickMemoDraft,
    })),
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
  const dayPlanScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const lastPriorityAutostartAttemptKey = useRef('');

  const priorityAutostartKey = useMemo(
    () =>
      `${priorityPlanDateKey}|${priorityPlanDateKeyEnd}|${priorityStart}|${priorityEnd}|${priorityCategoryOrder.join('>')}`,
    [
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      priorityStart,
      priorityEnd,
      priorityCategoryOrder,
    ],
  );

  const { addBlock, quickMemos, removeQuickMemo } = useDayPlanStore(
    useShallow((s) => ({
      addBlock: s.addBlock,
      quickMemos: s.quickMemos,
      removeQuickMemo: s.removeQuickMemo,
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

  /** 데이플랜에서 시작 시각만 바꿔도 알람 시각이 따라가게 */
  useEffect(() => {
    if (!loadPriorityDayStartAlarm().enabled) return;
    void syncPriorityDayStartAlarm({ enabled: true, startHhmm: priorityStart });
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

  /** 당일(우선 순위 적용 구간에 오늘이 포함될 때) 고정 루틴 키를 우선 순위 목록 앞에 자동 보강 */
  useEffect(() => {
    if (planMode !== 'priority') return;
    const today = getLocalDateKey();
    if (today < priorityPlanDateKey || today > priorityPlanDateKeyEnd) return;

    const fixedRaw = loadPriorityCatalogFixedRoutineKeys();
    const fixedOrder = normalizeFixedRoutineCategoryKeys(fixedRaw);
    if (fixedOrder.length === 0) return;

    setPriorityCategoryOrder((prev) => {
      const next = ensureFixedRoutinesInPriorityOrder(prev, fixedOrder);
      if (next.length === prev.length && next.every((k, i) => k === prev[i])) return prev;
      return next;
    });
  }, [
    planMode,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    priorityCategoryOrder,
    priorityCatalogFixedRoutineEpoch,
    setPriorityCategoryOrder,
  ]);

  const c = useMemo(() => palette(isDark), [isDark]);

  const handleRhythmConfirm = useCallback(
    (start: string, end: string) => {
      setPriorityStart(start);
      setPriorityEnd(end);
      syncOvernightPriorityPlanDates();
      markDailyRhythmOnboardingCompleted();
      setRhythmGateOpen(false);
    },
    [setPriorityEnd, setPriorityStart, syncOvernightPriorityPlanDates],
  );

  const handleRhythmSkip = useCallback(() => {
    markDailyRhythmOnboardingCompleted();
    setRhythmGateOpen(false);
  }, []);

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
    },
    [priorityCategoryOrder, setPriorityCategoryOrder],
  );

  const handleOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [router],
  );

  const handleOpenFocusDetail = useCallback(
    (categoryKey: string) => {
      const ps = parseHHmmToMinutes(priorityStart);
      const pe = parseHHmmToMinutes(priorityEnd);
      const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
      if (ps === null || pe === null) {
        Alert.alert('시각 형식', '시작·종료 시각을 먼저 확인해 주세요.');
        return;
      }
      if (!overnight && pe <= ps) {
        Alert.alert('시각 형식', '시작·종료 시각을 먼저 확인해 주세요.');
        return;
      }
      const label = getPickerCategoryItem(categoryKey)?.label ?? '항목';
      const result = addBlock({
        title: label,
        startMinutes: ps,
        endMinutes: pe,
        endsNextCalendarDay: overnight,
        category: label,
        replaceOverlapping: true,
        planDateKey: getLocalDateKey(),
      });
      if (!result.ok) {
        Alert.alert('열기 실패', '해당 카테고리 몰입 화면을 열지 못했습니다.');
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
      const memoLines = quickMemos
        .filter((m) => !m.isDone)
        .map((m) => m.text.trim())
        .filter((t) => t.length > 0);
      const lines = draftLines.length > 0 ? draftLines : memoLines;
      if (lines.length === 0) {
        Alert.alert('메모 필요', '라이브 액티비티에 표시할 빠른 메모를 하나 이상 입력해 주세요.');
        return;
      }

      const w = defaultPriorityWindowFromNow();
      const ps = parseHHmmToMinutes(w.startTime);
      const pe = parseHHmmToMinutes(w.endTime);
      if (ps === null || pe === null || pe <= ps) {
        Alert.alert('저장 실패', '기본 시간대를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const blockTitle = lines.join('\n');
      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        category: '사용자',
        replaceOverlapping: true,
        blockOrigin: 'quickMemo',
      });

      if (!result.ok) {
        if (result.reason === 'in_the_past') {
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 일정만 저장할 수 있어요.');
          return;
        }
        Alert.alert('저장 실패', '빠른 메모를 일정으로 저장하지 못했습니다.');
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
            await upsertLockFlowLiveActivity(payload);
          }
        })();
      }
      return;
    }

    if (planMode === 'priority') {
      if (priorityCategoryOrder.length === 0) {
        Alert.alert('카테고리 필요', '저장하려면 카테고리를 하나 이상 선택해 주세요.');
        return;
      }
      const ps = parseHHmmToMinutes(priorityStart);
      const pe = parseHHmmToMinutes(priorityEnd);
      const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);
      if (ps === null || pe === null) {
        Alert.alert('시각 형식', '시작·종료 시각은 09:00 형식으로 입력해 주세요.');
        return;
      }
      if (!overnight && pe <= ps) {
        Alert.alert('시간 구간', '종료 시각은 시작 시각보다 늦어야 합니다.');
        return;
      }
      const headKey = priorityCategoryOrder[0]!;
      const catLabel = getPickerCategoryItem(headKey)?.label ?? '항목';
      const orderedLabels = priorityCategoryOrder.map(
        (key) => getPickerCategoryItem(key)?.label ?? '사용자',
      );
      const blockTitle = orderedLabels.length > 0 ? orderedLabels.join('\n') : '항목';

      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        endsNextCalendarDay: overnight,
        category: catLabel,
        replaceOverlapping: true,
        planDateKey: getLocalDateKey(),
      });

      if (!result.ok) {
        if (result.reason === 'overlap') {
          Alert.alert('시간 중복', '기존 일정과 겹칩니다. 시간대를 조정해 주세요.');
          return;
        }
        if (result.reason === 'in_the_past') {
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 일정만 저장할 수 있어요.');
          return;
        }
        Alert.alert('시작 실패', '우선 순위 일정을 시작하지 못했습니다.');
        return;
      }

      syncScheduledNotifications();
      reconcileLiveActivityFromPlan();

      const payload = buildLiveActivityPayloadForBlock({
        blockId: result.blockId,
        status: 'active',
      });
      if (payload) {
        void upsertLockFlowLiveActivity(payload);
      }
      setIsFocusStarted(true);
      return;
    }
  };

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  /**
   * 우선순위 모드 자동 시작:
   * - 적용일 범위 안이고 집중 구간이 아직 끝나지 않았으면(시작 시각 이전 포함) 카테고리만 있어도 바로 시작
   * - 구간이 끝난 뒤·적용일 밖이면 자동 정지
   */
  useEffect(() => {
    if (planMode !== 'priority') return;
    const ps = parseHHmmToMinutes(priorityStart);
    const pe = parseHHmmToMinutes(priorityEnd);
    if (ps === null || pe === null) return;
    if (priorityCategoryOrder.length === 0) {
      lastPriorityAutostartAttemptKey.current = '';
      if (isFocusStarted) {
        setIsFocusStarted(false);
        void endLockFlowLiveActivity();
      }
      return;
    }

    const rangeLo =
      priorityPlanDateKey <= priorityPlanDateKeyEnd
        ? priorityPlanDateKey
        : priorityPlanDateKeyEnd;
    const rangeHi =
      priorityPlanDateKey <= priorityPlanDateKeyEnd
        ? priorityPlanDateKeyEnd
        : priorityPlanDateKey;
    const nowKey = getLocalDateKey();
    const nowMin = getLocalMinutesOfDayNow();
    const overnight = isOvernightHhmmRange(priorityStart, priorityEnd);

    const inRange = nowKey >= rangeLo && nowKey <= rangeHi;
    /** 구간 종료 전까지는 '시작됨' 유지(시작 시각 이전에도 담기·우선순위 UI가 집중 모드로 보이게) */
    let stillInPrioritySegment = false;
    if (inRange) {
      if (!overnight) {
        stillInPrioritySegment = nowMin < pe;
      } else if (nowKey === rangeLo) {
        // 자정 넘김: 첫날은 시작 시각 이전이어도 구간 종료 전(말일 아침 pe 이전)과 동일하게 집중 UI 유지
        stillInPrioritySegment = true;
      } else if (nowKey === rangeHi) {
        stillInPrioritySegment = nowMin < pe;
      } else {
        stillInPrioritySegment = nowKey > rangeLo && nowKey < rangeHi;
      }
    }

    if (inRange && stillInPrioritySegment) {
      if (!isFocusStarted) {
        if (lastPriorityAutostartAttemptKey.current !== priorityAutostartKey) {
          lastPriorityAutostartAttemptKey.current = priorityAutostartKey;
          onSaveRef.current();
        }
      }
      return;
    }

    lastPriorityAutostartAttemptKey.current = '';
    if (isFocusStarted) {
      setIsFocusStarted(false);
      void endLockFlowLiveActivity();
    }
  }, [
    planMode,
    priorityStart,
    priorityEnd,
    priorityCategoryOrder.length,
    priorityAutostartKey,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    isFocusStarted,
    setIsFocusStarted,
  ]);

  const tabBridge = useDayPlanTabBridge();
  useEffect(() => {
    if (planMode === 'priority') {
      tabBridge.registerPrimaryAction(null, { disabled: true, label: '자동 시작', hidden: true });
      return () => tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기', hidden: false });
    }
    if (planMode === 'quickMemo') {
      tabBridge.registerPrimaryAction(null, { disabled: true, label: '메모 저장', hidden: true });
      return () => tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기', hidden: false });
    }
    tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기', hidden: false });
    return () => tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기', hidden: false });
  }, [tabBridge, planMode]);

  /** on-drag 만 쓰면 키보드만 내려가고 포커스는 남아, 다음 터치에 패드가 다시 뜨는 경우가 있어 스크롤 시 blur 로 포커스를 끈다. */
  const onQuickMemoScrollBeginDrag = useCallback(() => {
    quickMemoInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  /** 엔터로 줄이 늘어난 뒤 레이아웃이 반영되면 맨 아래로 스크롤 (내부 TextInput 스크롤 비활성화와 함께 사용) */
  const onQuickMemoInputContentSizeChange = useCallback(() => {
    requestAnimationFrame(() => {
      dayPlanScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const planModeSwitchEl = (
    <PlanModeSwitch
      planMode={planMode}
      onSelectPriority={() => setPlanMode('priority')}
      onSelectQuickMemo={() => setPlanMode('quickMemo')}
      c={c}
    />
  );

  /** 스위치·본문·하단을 한 면으로 — c.bg(#fafafa) 대신 containerLow로 틈·밝은 띠 제거 */
  const shellBg = c.containerLow;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <SafeAreaView style={[styles.safe, { backgroundColor: shellBg }]} edges={['top']}>
        <KeyboardAvoidingView
          style={[styles.keyboardColumn, { backgroundColor: shellBg }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}>
          <View style={[styles.mainColumn, { backgroundColor: shellBg }]}>
            <ScrollView
              ref={dayPlanScrollRef}
              style={[styles.scroll, { backgroundColor: shellBg }]}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  /** 메모/우선순위 동일 상단 inset — 모드 전환 시 토글 세로 위치 고정 */
                  paddingTop: 12,
                  paddingBottom: scrollContentBottomPad,
                  /** 우선순위: 타임라인·탭 사이 불필요한 세로 간격 축소 */
                  ...(planMode === 'priority' ? { gap: 6 } : null),
                  /**
                   * flexGrow: 1 은 콘텐츠가 짧아도 스크롤 영역을 화면 높이로 늘려 **빈 스크롤**이 생김.
                   * 빠른 메모만(빈 곳 탭으로 키보드 내리기) 영역을 채우기 위해 사용.
                   */
                  ...(planMode === 'quickMemo' ? { flexGrow: 1 } : null),
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              onScrollBeginDrag={planMode === 'quickMemo' ? onQuickMemoScrollBeginDrag : undefined}>
              <View style={[styles.contentPad, styles.supportActionRow]}>
                <Pressable
                  onPress={() => void openSupportMailComposer()}
                  accessibilityRole="button"
                  accessibilityLabel="문의하기"
                  style={[
                    styles.supportIconButton,
                    {
                      borderColor: c.catBorderIdle,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                    },
                  ]}>
                  <IconSymbol name="paperplane.fill" size={16} color={c.onSurface} />
                </Pressable>
              </View>
              {planMode === 'quickMemo' ? (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                  <View style={styles.quickMemoDismissWrap} collapsable={false}>
                    {planModeSwitchEl}
                    <View style={styles.contentPad}>
                      <QuickMemoPlanSection
                        ref={quickMemoInputRef}
                        c={c}
                        isDark={isDark}
                        memos={quickMemos}
                        draft={quickMemoDraft}
                        onChangeDraft={setQuickMemoDraft}
                        onInputContentSizeChange={onQuickMemoInputContentSizeChange}
                        onSavePress={() => onSaveRef.current()}
                      />
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              ) : (
                <View style={[styles.priorityModeStack, { backgroundColor: c.containerLow }]}>
                  {/*
                    ScrollView `gap`이 플로팅 스위치와 다이어리 사이에 c.bg(거의 흰색) 띠를 만듦.
                    한 컬럼으로 묶어 두 블록 사이 간격 제거.
                    동일 톤 배경으로 서브픽셀/레이어 사이 밝은 끊김 완화.
                  */}
                  {planModeSwitchEl}
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
                    onOpenFocusDetail={handleOpenFocusDetail}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <DailyRhythmOnboardingGate
        visible={rhythmGateOpen}
        isDark={isDark}
        c={c}
        onConfirm={handleRhythmConfirm}
        onSkip={handleRhythmSkip}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  keyboardColumn: { flex: 1 },
  /** 키보드 회피 시 본문이 위로 밀리도록 */
  mainColumn: { flex: 1 },
  saveText: { color: PRIMARY, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  /** paddingTop은 quickMemo만(12). 우선순위는 0 — 상단이 ScrollView 흰 배경 위에 띠처럼 보이는 문제 방지 */
  scrollContent: { paddingHorizontal: 0, gap: 16 },
  supportActionRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: -6,
  },
  supportIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityModeStack: { width: '100%', gap: 0 },
  /** 다이어리 등 풀블리드 섹션 제외 영역만 좌우 여백 */
  contentPad: { paddingHorizontal: 24 },
  /** 빠른 메모: 스크롤 영역을 채워 빈 곳 탭 시 키보드 dismiss 가 먹도록 */
  quickMemoDismissWrap: { gap: 10, flexGrow: 1 },
});
