import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { useDayPlanStore } from '@entities/day-plan/model';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  CATEGORIES,
  PRIMARY,
  defaultEditorBlockTimesFromNow,
  makeBlockId,
  rangesOverlapMinutes,
  sortBlocksByCategoryOrder,
  type PlanMode,
  type PriorityTask,
  type TimeBlock,
} from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { TimeBasedPlanSection } from './TimeBasedPlanSection';

export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [planMode, setPlanMode] = useState<PlanMode>('time');

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [priorityStart, setPriorityStart] = useState('09:00');
  const [priorityEnd, setPriorityEnd] = useState('12:00');
  const [priorityCategoryKey, setPriorityCategoryKey] = useState('work');
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>(() => [
    { id: makeBlockId(), title: '중요 이메일 회신 및 일정 정리' },
    { id: makeBlockId(), title: '신규 프로젝트 제안서 초안 작성' },
  ]);
  const [priorityTaskDraft, setPriorityTaskDraft] = useState('');

  const [startNotifOn, setStartNotifOn] = useState(true);
  const [endNotifOn, setEndNotifOn] = useState(false);
  const [notifTiming, setNotifTiming] = useState<'5min' | 'atStart'>('5min');
  const [notes, setNotes] = useState('');

  const { addBlock } = useDayPlanStore(
    useShallow((s) => ({
      addBlock: s.addBlock,
    })),
  );

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  const c = useMemo(() => palette(isDark), [isDark]);

  const sortedBlocks = useMemo(() => sortBlocksByCategoryOrder(timeBlocks), [timeBlocks]);

  const gridGap = 12;
  const padH = 24;
  const cellW = Math.floor((winW - padH * 2 - gridGap * 3) / 4);

  const bottomBarReserve = useMemo(() => {
    const extra =
      planMode === 'time' ? timeBlocks.length * 12 : 24 + priorityTasks.length * 10;
    return 160 + extra + insets.bottom;
  }, [insets.bottom, timeBlocks.length, planMode, priorityTasks.length]);

  const handleCategoryPress = (categoryKey: string) => {
    const existing = timeBlocks.find((b) => b.categoryKey === categoryKey);
    if (existing) {
      if (selectedBlockId === existing.id) {
        const next = timeBlocks.filter((b) => b.id !== existing.id);
        const sorted = sortBlocksByCategoryOrder(next);
        setTimeBlocks(next);
        setSelectedBlockId(sorted[0]?.id ?? null);
        return;
      }
      setSelectedBlockId(existing.id);
      return;
    }
    const id = makeBlockId();
    const { startTime, endTime } = defaultEditorBlockTimesFromNow();
    setTimeBlocks((prev) => [...prev, { id, categoryKey, startTime, endTime }]);
    setSelectedBlockId(id);
  };

  const updateBlock = (id: string, patch: Partial<Pick<TimeBlock, 'startTime' | 'endTime'>>) => {
    setTimeBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    setTimeBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      const sorted = sortBlocksByCategoryOrder(next);
      setSelectedBlockId((cur) => {
        if (cur !== id) return cur;
        return sorted[0]?.id ?? null;
      });
      return next;
    });
  };

  const addPriorityTaskRow = () => {
    const t = priorityTaskDraft.trim();
    if (!t) return;
    setPriorityTasks((prev) => [...prev, { id: makeBlockId(), title: t }]);
    setPriorityTaskDraft('');
  };

  const updatePriorityTask = (id: string, text: string) => {
    setPriorityTasks((prev) => prev.map((p) => (p.id === id ? { ...p, title: text } : p)));
  };

  const removePriorityTask = (id: string) => {
    setPriorityTasks((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  const onSave = () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert('입력 필요', '리듬 이름을 입력해 주세요.');
      return;
    }

    if (planMode === 'priority') {
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
      const catLabel = CATEGORIES.find((x) => x.key === priorityCategoryKey)?.label ?? '리듬';
      const lines = priorityTasks.map((p) => p.title.trim()).filter(Boolean);
      const blockTitle =
        lines.length > 0
          ? `${trimmedTitle}\n${lines.map((line, i) => `${i + 1}. ${line}`).join('\n')}`
          : trimmedTitle;

      const result = addBlock({
        title: blockTitle,
        startMinutes: ps,
        endMinutes: pe,
        category: catLabel,
      });

      if (!result.ok) {
        if (result.reason === 'overlap') {
          Alert.alert('시간 중복', '기존 일정과 겹칩니다. 시간대를 조정해 주세요.');
          return;
        }
        if (result.reason === 'in_the_past') {
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 리듬만 저장할 수 있어요.');
          return;
        }
        Alert.alert('저장 실패', '입력값을 확인해 주세요.');
        return;
      }

      router.push({
        pathname: '/goal-detail-settings',
        params: { rhythmTitle: trimmedTitle },
      });
      return;
    }

    if (timeBlocks.length === 0) {
      Alert.alert('카테고리 필요', '최소 한 개의 카테고리를 선택해 주세요.');
      return;
    }

    const resolved = sortedBlocks.map((block) => {
      const parsedStart = parseHHmmToMinutes(block.startTime);
      const parsedEnd = parseHHmmToMinutes(block.endTime);
      const catLabel = CATEGORIES.find((x) => x.key === block.categoryKey)?.label ?? '리듬';
      return { block, parsedStart, parsedEnd, catLabel };
    });

    for (const r of resolved) {
      if (r.parsedStart === null || r.parsedEnd === null) {
        Alert.alert('시각 형식', `「${r.catLabel}」블록의 시각은 09:00 형식으로 입력해 주세요.`);
        return;
      }
      if (r.parsedEnd <= r.parsedStart) {
        Alert.alert('시간 구간', `「${r.catLabel}」블록의 종료 시각은 시작보다 늦어야 합니다.`);
        return;
      }
    }

    const intervals = resolved.map((r) => ({ s: r.parsedStart!, e: r.parsedEnd! }));
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        if (rangesOverlapMinutes(intervals[i], intervals[j])) {
          Alert.alert(
            '블록 시간 겹침',
            '선택한 블록들의 시간이 서로 겹칩니다. 각 블록의 시작·종료를 조정해 주세요.',
          );
          return;
        }
      }
    }

    for (const r of resolved) {
      const result = addBlock({
        title: trimmedTitle,
        startMinutes: r.parsedStart!,
        endMinutes: r.parsedEnd!,
        category: r.catLabel,
      });

      if (!result.ok) {
        if (result.reason === 'overlap') {
          Alert.alert(
            '시간 중복',
            `「${r.catLabel}」저장 시 기존 일정과 겹칩니다.\n다른 시간대로 조정해 주세요.`,
          );
          return;
        }
        if (result.reason === 'in_the_past') {
          Alert.alert('지난 시간', '종료 시각이 현재보다 이후인 블록만 저장할 수 있어요.');
          return;
        }
        Alert.alert('저장 실패', '입력값을 확인해 주세요.');
        return;
      }
    }

    router.push({
      pathname: '/goal-detail-settings',
      params: { rhythmTitle: trimmedTitle },
    });
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: c.headerBg, borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerIconBtn} hitSlop={8}>
            <IconSymbol name="xmark" size={20} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>새 리듬 설정</ThemedText>
          <Pressable onPress={onSave} hitSlop={8}>
            <ThemedText style={styles.saveText}>저장</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarReserve }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.block}>
            <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>리듬 이름</ThemedText>
            <View style={[styles.namePill, { backgroundColor: c.containerLowest, shadowColor: c.shadow }]}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="무엇에 집중하시겠어요?"
                placeholderTextColor={c.outline}
                style={[styles.nameInput, { color: c.onSurface }]}
              />
              <View style={styles.nameHintRow}>
                <IconSymbol name="pencil" size={14} color={PRIMARY} />
                <ThemedText style={[styles.nameHint, { color: c.onVariant }]}>활동 명칭</ThemedText>
              </View>
            </View>
          </View>

          <PlanModeSwitch
            planMode={planMode}
            onSelectTime={() => setPlanMode('time')}
            onSelectPriority={() => setPlanMode('priority')}
            c={c}
          />

          {planMode === 'time' ? (
            <TimeBasedPlanSection
              c={c}
              cellW={cellW}
              gridGap={gridGap}
              timeBlocks={timeBlocks}
              selectedBlockId={selectedBlockId}
              onPressCategory={handleCategoryPress}
              onSelectBlock={setSelectedBlockId}
              onUpdateBlock={updateBlock}
              onRemoveBlock={removeBlock}
            />
          ) : (
            <PriorityBasedPlanSection
              c={c}
              priorityStart={priorityStart}
              priorityEnd={priorityEnd}
              onChangePriorityStart={setPriorityStart}
              onChangePriorityEnd={setPriorityEnd}
              priorityCategoryKey={priorityCategoryKey}
              onSelectCategory={setPriorityCategoryKey}
              priorityTasks={priorityTasks}
              priorityTaskDraft={priorityTaskDraft}
              onChangePriorityTaskDraft={setPriorityTaskDraft}
              onUpdatePriorityTask={updatePriorityTask}
              onRemovePriorityTask={removePriorityTask}
              onAddPriorityTaskRow={addPriorityTaskRow}
            />
          )}

          <View style={styles.block}>
            <ThemedText style={[styles.labelUpper, { color: c.onVariant, marginBottom: 4 }]}>
              알림 설정
            </ThemedText>
            <View style={styles.notifCol}>
              <View style={[styles.notifCard, { backgroundColor: c.containerLow }]}>
                <View style={styles.notifCardTop}>
                  <View style={styles.notifLeft}>
                    <IconSymbol name="clock.fill" size={20} color={PRIMARY} />
                    <ThemedText style={[styles.notifTitle, { color: c.onSurface }]}>
                      리듬 시작 알림
                    </ThemedText>
                  </View>
                  <Switch
                    trackColor={{ true: PRIMARY, false: c.trackOff }}
                    thumbColor="#fff"
                    value={startNotifOn}
                    onValueChange={setStartNotifOn}
                  />
                </View>
                <View style={[styles.chipRow, { backgroundColor: c.containerLowest }]}>
                  <Pressable
                    onPress={() => setNotifTiming('5min')}
                    style={[
                      styles.chip,
                      notifTiming === '5min' && { backgroundColor: '#fff', ...styles.chipShadow },
                    ]}>
                    <ThemedText
                      style={[
                        styles.chipText,
                        { color: notifTiming === '5min' ? PRIMARY : c.onVariant },
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
                        { color: notifTiming === 'atStart' ? PRIMARY : c.onVariant },
                      ]}>
                      시작 시각
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.notifRowPill, { backgroundColor: c.containerLow }]}>
                <View style={styles.notifLeft}>
                  <IconSymbol name="timer" size={20} color={PRIMARY} />
                  <ThemedText style={[styles.notifTitle, { color: c.onSurface }]}>
                    리듬 종료 알림
                  </ThemedText>
                </View>
                <Switch
                  trackColor={{ true: PRIMARY, false: c.trackOff }}
                  thumbColor="#fff"
                  value={endNotifOn}
                  onValueChange={setEndNotifOn}
                />
              </View>
            </View>
          </View>

          <View style={styles.block}>
            <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>메모 및 목표</ThemedText>
            <View
              style={[
                styles.notesBox,
                { backgroundColor: c.containerLowest, borderColor: 'transparent', shadowColor: c.shadow },
              ]}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="이번 세션의 핵심 집중 영역을 정의하세요..."
                placeholderTextColor={c.outline}
                multiline
                textAlignVertical="top"
                style={[styles.notesInput, { color: c.onSurface }]}
              />
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomDock, { backgroundColor: c.bg }]}>
          <View style={[styles.bottomFade, { backgroundColor: c.bg }]} />
          <SafeAreaView edges={['bottom']} style={styles.bottomInner}>
            <Pressable style={styles.primaryCta} onPress={onSave}>
              <ThemedText style={styles.primaryCtaText}>리듬 설정 완료</ThemedText>
            </Pressable>
            <ThemedText style={[styles.bottomTagline, { color: c.outline }]}>
              모멘텀은 지금부터입니다
            </ThemedText>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: 'rgba(45,47,47,0.06)',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  saveText: { color: PRIMARY, fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, gap: 32 },
  block: { gap: 12 },
  labelUpper: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
  },
  namePill: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 2,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '800',
    padding: 0,
  },
  nameHintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  nameHint: { fontSize: 12, fontWeight: '600' },
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
  notesBox: {
    borderRadius: 28,
    padding: 22,
    borderWidth: 2,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  notesInput: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    minHeight: 100,
    padding: 0,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  primaryCta: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  primaryCtaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
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
});
