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
  Switch,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useShallow } from 'zustand/react/shallow';

import { parseHHmmToMinutes, useDayPlanNotificationStore, useDayPlanStore } from '@entities/day-plan';
import { rescheduleDayPlanNotifications } from '@features/day-plan-notifications';
import {
  buildLiveActivityPayloadForBlock,
  reconcileLiveActivityFromPlan,
  upsertLiveActivityAndDismiss,
} from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  CATEGORIES,
  defaultPriorityWindowFromNow,
  PRIMARY,
  type PlanMode,
} from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { QuickMemoPlanSection } from './QuickMemoPlanSection';

/* ─── Zipper Slider (Slide-to-confirm) ─── */

const SLIDER_H = 64;
const THUMB_SZ = 52;
const SLIDER_PAD = 6;

function ZipperSlider({
  onComplete,
  disabled = false,
}: {
  onComplete: () => void;
  disabled?: boolean;
}) {
  const trackWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const isCompleted = useSharedValue(false);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      trackWidth.value = e.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const fireComplete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      if (isCompleted.value) return;
      const maxX = trackWidth.value - THUMB_SZ - SLIDER_PAD * 2;
      translateX.value = Math.max(0, Math.min(e.translationX, maxX));
    })
    .onEnd(() => {
      if (isCompleted.value) return;
      const maxX = trackWidth.value - THUMB_SZ - SLIDER_PAD * 2;
      if (translateX.value > maxX * 0.85) {
        isCompleted.value = true;
        translateX.value = withSpring(maxX, { damping: 16, stiffness: 300 });
        runOnJS(fireComplete)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 350 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const textOpacity = useAnimatedStyle(() => {
    const maxX = trackWidth.value - THUMB_SZ - SLIDER_PAD * 2;
    return {
      opacity: maxX > 0
        ? interpolate(translateX.value, [0, maxX * 0.5], [1, 0], Extrapolation.CLAMP)
        : 1,
    };
  });

  const trackFillStyle = useAnimatedStyle(() => {
    const maxX = trackWidth.value - THUMB_SZ - SLIDER_PAD * 2;
    return {
      backgroundColor: maxX > 0
        ? interpolateColor(
            translateX.value,
            [0, maxX],
            ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.28)'],
          )
        : 'rgba(0,0,0,0.08)',
    };
  });

  return (
    <View style={[styles.zipperTrackOuter, disabled && styles.zipperDisabled]}>
      <Animated.View
        style={[styles.zipperTrack, trackFillStyle]}
        onLayout={onLayout}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.zipperThumb, disabled && styles.zipperThumbDisabled, thumbStyle]}>
            <IconSymbol name="chevron.right.2" size={20} color={disabled ? 'rgba(255,255,255,0.4)' : '#fff'} />
          </Animated.View>
        </GestureDetector>
        <Animated.View style={[styles.zipperLabelWrap, textOpacity]}>
          <ThemedText style={[styles.zipperLabel, disabled && styles.zipperLabelDisabled]}>
            {disabled ? '카테고리를 담아주세요' : '시작하기'}
          </ThemedText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const [planMode, setPlanMode] = useState<PlanMode>('priority');

  const [priorityStart, setPriorityStart] = useState(
    () => defaultPriorityWindowFromNow().startTime,
  );
  const [priorityEnd, setPriorityEnd] = useState(() => defaultPriorityWindowFromNow().endTime);
  /** 카테고리를 누른 순서(플로 순서). 첫 항목이 일정 블록의 대표 카테고리로 쓰입니다. */
  const [priorityCategoryOrder, setPriorityCategoryOrder] = useState<string[]>(() => []);
  const [quickMemoDraft, setQuickMemoDraft] = useState('');
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
    const w = defaultPriorityWindowFromNow();
    setPriorityStart(w.startTime);
    setPriorityEnd(w.endTime);
  }, [planMode]);

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

  const scrollContentBottomPad = useMemo(() => 28 + insets.bottom, [insets.bottom]);

  const handlePriorityCategoryPress = useCallback((key: string) => {
    setPriorityCategoryOrder((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  }, []);

  const handleOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [router],
  );

  /** 목표 상세 설정에서 사용자가 입력한 플로우 이름으로 덮어쓰기 전 임시 제목 */
  const TEMP_FLOW_BLOCK_TITLE = '플로우';

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
        void upsertLiveActivityAndDismiss(payload);
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
          : TEMP_FLOW_BLOCK_TITLE;

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
        Alert.alert('저장 실패', '입력값을 확인해 주세요.');
        return;
      }

      router.push({
        pathname: '/activity-session',
        params: { blockId: result.blockId },
      });
      return;
    }
  };

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
                    priorityStart={priorityStart}
                    priorityEnd={priorityEnd}
                    onChangePriorityStart={setPriorityStart}
                    onChangePriorityEnd={setPriorityEnd}
                    priorityCategoryOrder={priorityCategoryOrder}
                    onSelectCategory={handlePriorityCategoryPress}
                    onOpenCategorySettings={handleOpenCategorySettings}
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

            <View style={[styles.bottomDock, { backgroundColor: shellBg }]}>
              <Pressable
                style={[styles.bottomFade, { backgroundColor: shellBg }]}
                onPress={() => planMode === 'quickMemo' && Keyboard.dismiss()}
              />
              <SafeAreaView
                edges={['bottom']}
                style={[styles.bottomInner, planMode === 'quickMemo' && styles.bottomInnerQuickMemo]}>
                {planMode === 'quickMemo' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="메모 저장"
                    style={[
                      styles.primaryCta,
                      styles.primaryCtaQuickMemo,
                      styles.primaryCtaSaveIconOnly,
                      { backgroundColor: c.containerHigh, borderColor: c.border },
                    ]}
                    onPress={onSave}>
                    <IconSymbol name="square.and.arrow.down" size={26} color={c.onSurface} />
                  </Pressable>
                ) : (
                  <ZipperSlider
                    onComplete={onSave}
                    disabled={priorityCategoryOrder.length === 0}
                  />
                )}
              </SafeAreaView>
            </View>
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
  /** 스크롤 + 하단 CTA를 세로로 쌓아 키보드 회피 시 버튼이 키보드 위로 올라가게 함 */
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
  bottomDock: {
    position: 'relative',
    width: '100%',
    zIndex: 20,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -40,
    height: 40,
    opacity: 0.95,
  },
  bottomInner: {
    paddingHorizontal: 0,
    paddingTop: 16,
    paddingBottom: 4,
  },
  bottomInnerQuickMemo: {
    paddingHorizontal: 20,
  },
  primaryCta: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  /** 빠른 메모: 검정·흰 글자 대신 면 톤만 사용 */
  primaryCtaQuickMemo: {
    borderWidth: 1,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** 메모 저장: 텍스트 대신 아이콘만 — 터치 영역 유지 */
  primaryCtaSaveIconOnly: {
    paddingVertical: 16,
    minHeight: 52,
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomTagline: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  zipperTrackOuter: {
    borderRadius: SLIDER_H / 2,
    overflow: 'hidden',
  },
  zipperTrack: {
    height: SLIDER_H,
    borderRadius: SLIDER_H / 2,
    padding: SLIDER_PAD,
    justifyContent: 'center',
  },
  zipperThumb: {
    width: THUMB_SZ,
    height: THUMB_SZ,
    borderRadius: THUMB_SZ / 2,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 2,
  },
  zipperLabelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  zipperLabel: {
    color: PRIMARY,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  zipperDisabled: {
    opacity: 0.45,
  },
  zipperThumbDisabled: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0,
    elevation: 0,
  },
  zipperLabelDisabled: {
    color: 'rgba(0,0,0,0.35)',
  },
});
