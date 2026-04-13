import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, type ComponentRef } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { parseHHmmToMinutes, useDayPlanNotificationStore, useDayPlanStore } from '@entities/day-plan';
import { rescheduleDayPlanNotifications } from '@features/day-plan-notifications';
import {
  buildLiveActivityPayloadForBlock,
  endLockFlowLiveActivity,
  reconcileLiveActivityFromPlan,
  upsertLockFlowLiveActivity,
} from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  CATEGORIES,
  defaultPriorityWindowFromNow,
  PRIMARY,
} from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { DAY_PLAN_TAB_BAR_ROW_HEIGHT } from './DayPlanCustomTabBar';
import { PlanModeSwitch } from './PlanModeSwitch';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { QuickMemoPlanSection } from './QuickMemoPlanSection';

export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const {
    planMode,
    isFocusStarted,
    priorityStart,
    priorityEnd,
    priorityCategoryOrder,
    quickMemoDraft,
    setPlanMode,
    setIsFocusStarted,
    setPriorityStart,
    setPriorityEnd,
    setPriorityCategoryOrder,
    setQuickMemoDraft,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      isFocusStarted: s.isFocusStarted,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityCategoryOrder: s.priorityCategoryOrder,
      quickMemoDraft: s.quickMemoDraft,
      setPlanMode: s.setPlanMode,
      setIsFocusStarted: s.setIsFocusStarted,
      setPriorityStart: s.setPriorityStart,
      setPriorityEnd: s.setPriorityEnd,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      setQuickMemoDraft: s.setQuickMemoDraft,
    })),
  );
  const quickMemoInputRef = useRef<TextInput>(null);
  const dayPlanScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

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
  const {
    startNotifOn,
    endNotifOn,
    notifTiming,
    setStartNotifOn,
    setEndNotifOn,
    setNotifTiming,
    hydrate: hydrateNotificationSettings,
  } = useDayPlanNotificationStore(
    useShallow((s) => ({
      startNotifOn: s.startNotifOn,
      endNotifOn: s.endNotifOn,
      notifTiming: s.notifTiming,
      setStartNotifOn: s.setStartNotifOn,
      setEndNotifOn: s.setEndNotifOn,
      setNotifTiming: s.setNotifTiming,
      hydrate: s.hydrate,
    })),
  );

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
    hydrateNotificationSettings();
  }, [hydrateNotificationSettings]);

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

  const c = useMemo(() => palette(isDark), [isDark]);

  const syncScheduledNotifications = useCallback(() => {
    const dayPlanState = useDayPlanStore.getState();
    const notifState = useDayPlanNotificationStore.getState();
    void rescheduleDayPlanNotifications({
      dateKey: dayPlanState.dateKey,
      blocks: dayPlanState.blocks,
      settings: notifState.toSettings(),
      completedBlockIds: dayPlanState.completedBlockIds,
      skippedBlockIds: dayPlanState.skippedBlockIds,
    });
  }, []);

  /** 하단 커스텀 탭 바 높이 + 홈 인디케이터 — 스크롤 끝이 가려지지 않게 */
  const scrollContentBottomPad = useMemo(
    () => 24 + DAY_PLAN_TAB_BAR_ROW_HEIGHT + insets.bottom,
    [insets.bottom],
  );

  const handlePriorityCategoryPress = useCallback(
    (key: string) => {
      setIsFocusStarted(false);
      setPriorityCategoryOrder(
        priorityCategoryOrder.includes(key)
          ? priorityCategoryOrder.filter((k) => k !== key)
          : [...priorityCategoryOrder, key],
      );
    },
    [priorityCategoryOrder, setIsFocusStarted, setPriorityCategoryOrder],
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
      if (ps === null || pe === null || pe <= ps) {
        Alert.alert('시각 형식', '시작·종료 시각을 먼저 확인해 주세요.');
        return;
      }
      const label = CATEGORIES.find((x) => x.key === categoryKey)?.label ?? '플로우';
      const result = addBlock({
        title: label,
        startMinutes: ps,
        endMinutes: pe,
        category: label,
        replaceOverlapping: true,
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

      const blockTitle = lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
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
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 플로우만 저장할 수 있어요.');
          return;
        }
        Alert.alert('저장 실패', '빠른 메모를 플로우로 저장하지 못했습니다.');
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
        void upsertLockFlowLiveActivity(payload);
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
      if (ps === null || pe === null) {
        Alert.alert('시각 형식', '시작·종료 시각은 09:00 형식으로 입력해 주세요.');
        return;
      }
      if (pe <= ps) {
        Alert.alert('시간 구간', '종료 시각은 시작 시각보다 늦어야 합니다.');
        return;
      }
      const headKey = priorityCategoryOrder[0]!;
      const catLabel = CATEGORIES.find((x) => x.key === headKey)?.label ?? '플로우';
      const orderedLabels = priorityCategoryOrder.map(
        (key) => CATEGORIES.find((x) => x.key === key)?.label ?? '사용자',
      );
      const blockTitle =
        orderedLabels.length > 0
          ? orderedLabels.map((line, i) => `${i + 1}. ${line}`).join('\n')
          : '플로우';

      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        category: catLabel,
        replaceOverlapping: true,
      });

      if (!result.ok) {
        if (result.reason === 'overlap') {
          Alert.alert('시간 중복', '기존 일정과 겹칩니다. 시간대를 조정해 주세요.');
          return;
        }
        if (result.reason === 'in_the_past') {
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 플로우만 저장할 수 있어요.');
          return;
        }
        Alert.alert('시작 실패', '우선순위 플로우를 시작하지 못했습니다.');
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

  const handleStopFocus = useCallback(() => {
    Alert.alert('플로우 종료', '지금 진행 중인 플로우를 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: () => {
          setIsFocusStarted(false);
          void endLockFlowLiveActivity();
        },
      },
    ]);
  }, [setIsFocusStarted]);

  const handleAllFocusCompleted = useCallback(() => {
    setIsFocusStarted(false);
    void endLockFlowLiveActivity();
  }, [setIsFocusStarted]);

  const tabBridge = useDayPlanTabBridge();
  useEffect(() => {
    const disabled = planMode === 'priority' && priorityCategoryOrder.length === 0;
    if (planMode === 'priority' && isFocusStarted) {
      tabBridge.registerPrimaryAction(handleStopFocus, { disabled: false, label: '정지' });
      return () => tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기' });
    }
    const label = planMode === 'quickMemo' ? '메모 저장' : '시작하기';
    tabBridge.registerPrimaryAction(() => onSaveRef.current(), { disabled, label });
    return () => tabBridge.registerPrimaryAction(null, { disabled: true, label: '시작하기' });
  }, [tabBridge, planMode, priorityCategoryOrder.length, isFocusStarted, handleStopFocus]);

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
  const notifPalette = c;

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
                  /** 우선순위 모드: 상단 패딩이 ScrollView 기본(흰색) 위에 c.bg 띠로 보임 → 0 */
                  paddingTop: planMode === 'quickMemo' ? 12 : 0,
                  paddingBottom: scrollContentBottomPad,
                  ...(planMode === 'quickMemo' ? { flexGrow: 1 } : {}),
                },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              onScrollBeginDrag={planMode === 'quickMemo' ? onQuickMemoScrollBeginDrag : undefined}>
              {planMode === 'quickMemo' ? (
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                  <View style={styles.quickMemoDismissWrap} collapsable={false}>
                    {planModeSwitchEl}
                    <View style={styles.contentPad}>
                      <QuickMemoPlanSection
                        ref={quickMemoInputRef}
                        c={c}
                        memos={quickMemos}
                        draft={quickMemoDraft}
                        onChangeDraft={setQuickMemoDraft}
                        onInputContentSizeChange={onQuickMemoInputContentSizeChange}
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
                    priorityStart={priorityStart}
                    priorityEnd={priorityEnd}
                    onChangePriorityStart={setPriorityStart}
                    onChangePriorityEnd={setPriorityEnd}
                    priorityCategoryOrder={priorityCategoryOrder}
                    onSelectCategory={handlePriorityCategoryPress}
                    onOpenCategorySettings={handleOpenCategorySettings}
                    onOpenFocusDetail={handleOpenFocusDetail}
                    onAllFocusCompleted={handleAllFocusCompleted}
                  />
                </View>
              )}

              {planMode !== 'quickMemo' ? (
                <View style={[styles.contentPad, styles.block]}>
                  <ThemedText
                    style={[styles.labelUpper, { color: notifPalette.onVariant, marginBottom: 4 }]}
                    lightColor={notifPalette.onVariant}
                    darkColor={notifPalette.onVariant}>
                    알림 설정
                  </ThemedText>
                  <View style={styles.notifCol}>
                    <View style={[styles.notifCard, { backgroundColor: notifPalette.containerLow }]}>
                      <View style={styles.notifCardTop}>
                        <View style={styles.notifLeft}>
                          <IconSymbol name="clock.fill" size={20} color={PRIMARY} />
                          <ThemedText
                            style={[styles.notifTitle, { color: notifPalette.onSurface }]}
                            lightColor={notifPalette.onSurface}
                            darkColor={notifPalette.onSurface}>
                            플로우 시작 알림
                          </ThemedText>
                        </View>
                        <Switch
                          trackColor={{
                            true: PRIMARY,
                            false: notifPalette.trackOff,
                          }}
                          thumbColor="#fff"
                          value={startNotifOn}
                          onValueChange={setStartNotifOn}
                        />
                      </View>
                      <View style={[styles.chipRow, { backgroundColor: notifPalette.containerLowest }]}>
                        <Pressable
                          onPress={() => setNotifTiming('5min')}
                          style={[
                            styles.chip,
                            notifTiming === '5min' && { backgroundColor: '#fff', ...styles.chipShadow },
                          ]}>
                          <ThemedText
                            style={[
                              styles.chipText,
                              {
                                color: notifTiming === '5min' ? PRIMARY : notifPalette.onVariant,
                              },
                            ]}>
                            5분 전
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => setNotifTiming('atStart')}
                          style={[
                            styles.chip,
                            notifTiming === 'atStart' && { backgroundColor: '#fff', ...styles.chipShadow },
                          ]}>
                          <ThemedText
                            style={[
                              styles.chipText,
                              {
                                color:
                                  notifTiming === 'atStart' ? PRIMARY : notifPalette.onVariant,
                              },
                            ]}>
                            시작 시각
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>

                    <View style={[styles.notifRowPill, { backgroundColor: notifPalette.containerLow }]}>
                      <View style={styles.notifLeft}>
                        <IconSymbol name="timer" size={20} color={PRIMARY} />
                        <ThemedText
                          style={[styles.notifTitle, { color: notifPalette.onSurface }]}
                          lightColor={notifPalette.onSurface}
                          darkColor={notifPalette.onSurface}>
                          플로우 종료 알림
                        </ThemedText>
                      </View>
                      <Switch
                        trackColor={{
                          true: PRIMARY,
                          false: notifPalette.trackOff,
                        }}
                        thumbColor="#fff"
                        value={endNotifOn}
                        onValueChange={setEndNotifOn}
                      />
                    </View>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  priorityModeStack: { width: '100%', gap: 0 },
  /** 다이어리 등 풀블리드 섹션 제외 영역만 좌우 여백 */
  contentPad: { paddingHorizontal: 24 },
  /** 빠른 메모: 스크롤 영역을 채워 빈 곳 탭 시 키보드 dismiss 가 먹도록 */
  quickMemoDismissWrap: { gap: 10, flexGrow: 1 },
  block: { gap: 12 },
  labelUpper: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  notifCol: { gap: 12 },
  notifCard: {
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  notifCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifTitle: { fontSize: 14, fontWeight: '800' },
  chipRow: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  chip: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipText: { fontSize: 10, fontWeight: '800' },
  notifRowPill: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
