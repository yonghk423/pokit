import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  // Metro·React Compiler(shallow 번들)에서 하위 UI가 이 모듈 스코프의 TextInput을 참조할 수 있어 import 유지
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- 위 호환용
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
  defaultEditorBlockTimesAfterPreviousEnd,
  defaultEditorBlockTimesFromNow,
  defaultPriorityWindowFromNow,
  getOrderedPriorityLines,
  makeBlockId,
  MIN_BLOCK_DURATION_MINUTES,
  PRIMARY,
  rangesOverlapMinutes,
  sortBlocksByAddedSeq,
  type PlanMode,
  type PriorityTask,
  type TimeBlock,
} from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { PlanModeSwitch } from './PlanModeSwitch';
import { PriorityBasedPlanSection } from './PriorityBasedPlanSection';
import { QuickMemoPlanSection } from './QuickMemoPlanSection';
import { TimeBasedPlanSection } from './TimeBasedPlanSection';

export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: winW } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [planMode, setPlanMode] = useState<PlanMode>('time');

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [priorityStart, setPriorityStart] = useState(
    () => defaultPriorityWindowFromNow().startTime,
  );
  const [priorityEnd, setPriorityEnd] = useState(() => defaultPriorityWindowFromNow().endTime);
  /** 카테고리를 누른 순서(플로 순서). 첫 항목이 일정 블록의 대표 카테고리로 쓰입니다. */
  const [priorityCategoryOrder, setPriorityCategoryOrder] = useState<string[]>(() => ['work']);
  const [priorityCategoryKey, setPriorityCategoryKey] = useState('work');
  const [priorityTasks, setPriorityTasks] = useState<PriorityTask[]>(() => [
    { id: makeBlockId(), title: '중요 이메일 회신 및 일정 정리', categoryKey: 'work' },
    { id: makeBlockId(), title: '신규 프로젝트 제안서 초안 작성', categoryKey: 'work' },
  ]);
  const [priorityTaskDraft, setPriorityTaskDraft] = useState('');
  const [quickMemoDraft, setQuickMemoDraft] = useState('');

  const [startNotifOn, setStartNotifOn] = useState(true);
  const [endNotifOn, setEndNotifOn] = useState(false);
  const [notifTiming, setNotifTiming] = useState<'5min' | 'atStart'>('5min');

  const { addBlock, quickMemos, updateQuickMemoText, removeQuickMemo, toggleQuickMemoDone } =
    useDayPlanStore(
      useShallow((s) => ({
        addBlock: s.addBlock,
        quickMemos: s.quickMemos,
        updateQuickMemoText: s.updateQuickMemoText,
        removeQuickMemo: s.removeQuickMemo,
        toggleQuickMemoDone: s.toggleQuickMemoDone,
      })),
    );

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (planMode !== 'priority') return;
    const w = defaultPriorityWindowFromNow();
    setPriorityStart(w.startTime);
    setPriorityEnd(w.endTime);
  }, [planMode]);

  const c = useMemo(() => palette(isDark), [isDark]);

  const blocksInAddOrder = useMemo(() => sortBlocksByAddedSeq(timeBlocks), [timeBlocks]);

  const gridGap = 12;
  const padH = 24;
  const safeWinW = Number.isFinite(winW) && winW > 0 ? winW : 390;
  const rawCellW = Math.floor((safeWinW - padH * 2 - gridGap * 3) / 4);
  const cellW = Number.isFinite(rawCellW) ? Math.max(48, rawCellW) : 72;

  const bottomBarReserve = useMemo(() => {
    const extra =
      planMode === 'time'
        ? timeBlocks.length * 12
        : planMode === 'priority'
          ? 24 + priorityTasks.length * 10
          : 140 + quickMemos.length * 72;
    return 160 + extra + insets.bottom;
  }, [insets.bottom, timeBlocks.length, planMode, priorityTasks.length, quickMemos.length]);

  const handleCategoryPress = (categoryKey: string) => {
    const selected = selectedBlockId != null ? timeBlocks.find((b) => b.id === selectedBlockId) : null;
    // 같은 카테고리 재탭:
    // - 미확정 블록이면 취소(제거)
    // - 확정 블록이면 "중복 추가" 의도로 간주해 아래 추가 로직으로 진행
    if (selected && selected.categoryKey === categoryKey && selected.timeCommitted === false) {
      setTimeBlocks((prev) => {
        const next = prev.filter((b) => b.id !== selected.id);
        const sorted = sortBlocksByAddedSeq(next);
        setSelectedBlockId(sorted[0]?.id ?? null);
        return next;
      });
      return;
    }

    const drafts = timeBlocks.filter((b) => b.timeCommitted === false);
    const sameCatDraft = drafts.find((b) => b.categoryKey === categoryKey);
    if (sameCatDraft) {
      setSelectedBlockId(sameCatDraft.id);
      return;
    }
    if (drafts.length > 0) {
      const d = drafts[0];
      Alert.alert(
        '시간 먼저 확정',
        '편집 중인 블록의 「시간 확정」을 눌러 일정에 반영한 뒤, 같은 카테고리를 추가하거나 다른 카테고리를 고를 수 있어요.',
        [{ text: '확인', onPress: () => setSelectedBlockId(d.id) }],
      );
      return;
    }

    const id = makeBlockId();
    const nextSeq = Math.max(0, ...timeBlocks.map((b) => b.addedSeq ?? 0)) + 1;
    let startTime: string;
    let endTime: string;
    if (timeBlocks.length === 0) {
      const t = defaultEditorBlockTimesFromNow();
      startTime = t.startTime;
      endTime = t.endTime;
    } else {
      const ordered = sortBlocksByAddedSeq(timeBlocks);
      const prev = ordered[ordered.length - 1];
      const chained = defaultEditorBlockTimesAfterPreviousEnd(prev.endTime);
      if (chained) {
        startTime = chained.startTime;
        endTime = chained.endTime;
      } else {
        const t = defaultEditorBlockTimesFromNow();
        startTime = t.startTime;
        endTime = t.endTime;
      }
    }
    setTimeBlocks((prev) => [
      ...prev,
      {
        id,
        categoryKey,
        startTime,
        endTime,
        title: '',
        timeCommitted: false,
        addedSeq: nextSeq,
      },
    ]);
    setSelectedBlockId(id);
  };

  const commitBlockTime = (id: string) => {
    const block = timeBlocks.find((b) => b.id === id);
    if (!block || block.timeCommitted !== false) return;

    const ps = parseHHmmToMinutes(block.startTime);
    const pe = parseHHmmToMinutes(block.endTime);
    if (ps === null || pe === null || pe <= ps) {
      Alert.alert('시간 구간', '시작·종료 시각을 올바르게 입력한 뒤 확정해 주세요.');
      return;
    }
    if (pe - ps < MIN_BLOCK_DURATION_MINUTES) {
      Alert.alert(
        '최소 시간',
        `블록은 최소 ${MIN_BLOCK_DURATION_MINUTES}분 이상이어야 확정할 수 있어요.`,
      );
      return;
    }

    for (const other of timeBlocks) {
      if (other.id === block.id) continue;
      const os = parseHHmmToMinutes(other.startTime);
      const oe = parseHHmmToMinutes(other.endTime);
      if (os === null || oe === null || oe <= os) continue;
      if (rangesOverlapMinutes({ s: ps, e: pe }, { s: os, e: oe })) {
        Alert.alert('시간 겹침', '다른 블록과 겹치지 않게 조정한 뒤 확정해 주세요.');
        return;
      }
    }

    setTimeBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, timeCommitted: true } : b)),
    );
  };

  const updateBlock = (
    id: string,
    patch: Partial<Pick<TimeBlock, 'startTime' | 'endTime' | 'title'>>,
  ) => {
    setTimeBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    setTimeBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      const sorted = sortBlocksByAddedSeq(next);
      setSelectedBlockId((cur) => {
        if (cur !== id) return cur;
        return sorted[0]?.id ?? null;
      });
      return next;
    });
  };

  const handlePriorityCategoryPress = useCallback((key: string) => {
    setPriorityCategoryKey(key);
    setPriorityCategoryOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const addPriorityTaskRow = () => {
    const t = priorityTaskDraft.trim();
    if (!t) return;
    setPriorityTasks((prev) => [
      ...prev,
      { id: makeBlockId(), title: t, categoryKey: priorityCategoryKey },
    ]);
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

  /** 목표 상세 설정에서 사용자가 입력한 플로우 이름으로 덮어쓰기 전 임시 제목 */
  const TEMP_FLOW_BLOCK_TITLE = '플로우';

  const onSave = () => {
    if (planMode === 'quickMemo') {
      const lines = [
        ...quickMemos
        .filter((m) => !m.isDone)
        .map((m) => m.text.trim())
        .filter((t) => t.length > 0),
        quickMemoDraft.trim(),
      ].filter((t) => t.length > 0);
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
        category: '기타',
        replaceOverlapping: true,
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
      setQuickMemoDraft('');

      router.replace({ pathname: '/activity-session', params: { blockId: result.blockId } });
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
      const headKey = priorityCategoryOrder[0] ?? priorityCategoryKey;
      const catLabel = CATEGORIES.find((x) => x.key === headKey)?.label ?? '플로우';
      const lines = getOrderedPriorityLines(priorityCategoryOrder, priorityTasks);
      const blockTitle =
        lines.length > 0
          ? lines.map((line, i) => `${i + 1}. ${line}`).join('\n')
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
        pathname: '/goal-detail-settings',
        params: {
          categoryKey: headKey,
          startBlockId: result.blockId,
          blockIds: JSON.stringify([result.blockId]),
        },
      });
      return;
    }

    if (timeBlocks.length === 0) {
      Alert.alert('카테고리 필요', '최소 한 개의 카테고리를 선택해 주세요.');
      return;
    }

    if (timeBlocks.some((b) => b.timeCommitted !== true)) {
      Alert.alert(
        '미확정 블록',
        '모든 블록에 대해 「시간 확정」을 눌러 일정에 반영한 뒤 저장해 주세요.',
      );
      return;
    }

    const resolved = blocksInAddOrder.map((block) => {
      const parsedStart = parseHHmmToMinutes(block.startTime);
      const parsedEnd = parseHHmmToMinutes(block.endTime);
      const catLabel = CATEGORIES.find((x) => x.key === block.categoryKey)?.label ?? '플로우';
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
      if (!(r.block.title ?? '').trim()) {
        Alert.alert(
          '제목 필요',
          `「${r.catLabel}」블록에 플로우 제목을 입력해 주세요. 시간 설정 카드에서 제목을 적을 수 있어요.`,
        );
        return;
      }
    }

    const addedBlockIds: string[] = [];
    for (const r of resolved) {
      const result = addBlock({
        title: (r.block.title ?? '').trim(),
        startMinutes: r.parsedStart!,
        endMinutes: r.parsedEnd!,
        category: r.catLabel,
        replaceOverlapping: true,
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
      addedBlockIds.push(result.blockId);
    }

    // 시간 모드는 "추가 순서"가 기준이므로 항상 가장 먼저 추가된 블록부터 시작한다.
    const firstResolved = resolved[0];
    const startBlockId = addedBlockIds[0];
    const startBlockCategoryKey = firstResolved?.block.categoryKey ?? 'other';
    router.push({
      pathname: '/goal-detail-settings',
      params: {
        categoryKey: startBlockCategoryKey ?? 'other',
        startBlockId,
        blockIds: JSON.stringify(addedBlockIds),
      },
    });
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: c.headerBg, borderBottomColor: c.border }]}>
          <View style={styles.headerEdge} />
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>새 플로우 설정</ThemedText>
          <View style={styles.headerEdge}>
            <Pressable onPress={onSave} hitSlop={8}>
              <ThemedText style={styles.saveText}>저장</ThemedText>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarReserve }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <PlanModeSwitch
            planMode={planMode}
            onSelectTime={() => setPlanMode('time')}
            onSelectPriority={() => setPlanMode('priority')}
            onSelectQuickMemo={() => setPlanMode('quickMemo')}
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
              onCommitBlock={commitBlockTime}
            />
          ) : planMode === 'priority' ? (
            <PriorityBasedPlanSection
              c={c}
              priorityStart={priorityStart}
              priorityEnd={priorityEnd}
              onChangePriorityStart={setPriorityStart}
              onChangePriorityEnd={setPriorityEnd}
              priorityCategoryOrder={priorityCategoryOrder}
              priorityCategoryKey={priorityCategoryKey}
              onSelectCategory={handlePriorityCategoryPress}
              priorityTasks={priorityTasks}
              priorityTaskDraft={priorityTaskDraft}
              onChangePriorityTaskDraft={setPriorityTaskDraft}
              onUpdatePriorityTask={updatePriorityTask}
              onRemovePriorityTask={removePriorityTask}
              onAddPriorityTaskRow={addPriorityTaskRow}
            />
          ) : (
            <QuickMemoPlanSection
              c={c}
              memos={quickMemos}
              draft={quickMemoDraft}
              onChangeDraft={setQuickMemoDraft}
              onUpdateText={updateQuickMemoText}
              onToggleDone={toggleQuickMemoDone}
              onRemove={removeQuickMemo}
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
                      플로우 시작 알림
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
                    플로우 종료 알림
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
        </ScrollView>

        <View style={[styles.bottomDock, { backgroundColor: c.bg }]}>
          <View style={[styles.bottomFade, { backgroundColor: c.bg }]} />
          <SafeAreaView edges={['bottom']} style={styles.bottomInner}>
            <Pressable style={styles.primaryCta} onPress={onSave}>
              <ThemedText style={styles.primaryCtaText}>플로우 설정 완료</ThemedText>
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
  headerEdge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
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
