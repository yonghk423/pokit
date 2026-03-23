import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  formatBlockTimeRange,
  getBlockTimelineIcon,
  getFirstPendingBlock,
  parseHHmmToMinutes,
  sortDayPlanBlocks,
  totalPlannedMinutes,
} from '@entities/day-plan';
import { useDayPlanStore } from '@entities/day-plan/model';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import type { DayPlanBlock } from '@entities/day-plan';

const PRIMARY = 'rgb(249, 115, 22)';

/** 카테고리 UI 제거 시 신규 블록에 붙는 고정 라벨 */
const DEFAULT_BLOCK_CATEGORY = '리듬';

/** 첫 미완료 블록은 `getFirstPendingBlock`으로 계산 (구 `selectFirstPendingBlock` 구독 제거) */
export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [newTaskName, setNewTaskName] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('09:30');
  /** 연속 탭으로 addBlock이 두 번 들어가는 것 방지 */
  const addTaskInFlightRef = useRef(false);

  const { blocks, completedBlockIds, skippedBlockIds, addBlock, removeBlock } = useDayPlanStore(
    useShallow((s) => ({
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
      addBlock: s.addBlock,
      removeBlock: s.removeBlock,
    })),
  );

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  const sortedBlocks = useMemo(() => sortDayPlanBlocks(blocks), [blocks]);

  /** 같은 스토어 구독(blocks·완료·건너뜀)에서 직접 계산 — selector 분리로 인한 불일치 방지 */
  const firstPending = useMemo(
    () => getFirstPendingBlock(blocks, completedBlockIds, skippedBlockIds),
    [blocks, completedBlockIds, skippedBlockIds],
  );

  const progressPercent = useMemo(() => {
    const n = sortedBlocks.length;
    if (n === 0) return 0;
    return Math.round((completedBlockIds.length / n) * 100);
  }, [sortedBlocks.length, completedBlockIds.length]);

  const plannedMinutes = useMemo(() => totalPlannedMinutes(sortedBlocks), [sortedBlocks]);

  const progressLabel = useMemo(() => {
    const n = sortedBlocks.length;
    return `${completedBlockIds.length}/${n} 태스크`;
  }, [sortedBlocks.length, completedBlockIds.length]);

  const helperText = useMemo(() => {
    if (sortedBlocks.length === 0) {
      return '오늘 일정을 추가해 보세요.';
    }
    const h = (plannedMinutes / 60).toFixed(1);
    return `오늘 약 ${h}시간 분량으로 계획했어요. 시작할까요?`;
  }, [sortedBlocks.length, plannedMinutes]);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const chipSoftBg = isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)';
  const lineBg = isDark ? '#334155' : '#e2e8f0';

  const onStartDay = () => {
    if (!firstPending) {
      if (sortedBlocks.length === 0) {
        Alert.alert('리듬 없음', '먼저 아래에서 리듬을 추가해 주세요.');
      } else {
        Alert.alert('시작할 리듬 없음', '오늘 일정이 모두 완료되었거나 건너뛰었습니다.');
      }
      return;
    }
    router.push({
      pathname: '/activity-session',
      params: { blockId: firstPending.id },
    });
  };

  const resetEditorForm = () => {
    setNewTaskName('');
    setStartTimeStr('09:00');
    setEndTimeStr('09:30');
  };

  const onAddTask = () => {
    if (addTaskInFlightRef.current) return;
    addTaskInFlightRef.current = true;

    const title = newTaskName.trim();
    if (!title) {
      Alert.alert('입력 필요', '리듬 이름을 입력해 주세요.');
      addTaskInFlightRef.current = false;
      return;
    }
    const startMin = parseHHmmToMinutes(startTimeStr);
    if (startMin === null) {
      Alert.alert('시각 형식', '시작 시각은 09:00 형식(24시간)으로 입력해 주세요.');
      addTaskInFlightRef.current = false;
      return;
    }
    const endMin = parseHHmmToMinutes(endTimeStr);
    if (endMin === null) {
      Alert.alert('시각 형식', '종료 시각은 09:00 형식(24시간)으로 입력해 주세요.');
      addTaskInFlightRef.current = false;
      return;
    }
    if (endMin <= startMin) {
      Alert.alert('시간 구간', '종료 시각은 시작 시각보다 늦어야 합니다.');
      addTaskInFlightRef.current = false;
      return;
    }

    const result = addBlock({
      title,
      category: DEFAULT_BLOCK_CATEGORY,
      startMinutes: startMin,
      endMinutes: endMin,
    });

    if (!result.ok) {
      if (result.reason === 'overlap') {
        const r = formatBlockTimeRange(result.conflicting);
        Alert.alert(
          '시간 중복',
          `「${result.conflicting.title}」(${r})와 겹치는 시간입니다.\n다른 시각을 선택해 주세요.`,
        );
      } else if (result.reason === 'invalid_range') {
        Alert.alert('시간 구간', '종료 시각은 시작 시각보다 늦어야 합니다.');
      }
      addTaskInFlightRef.current = false;
      return;
    }

    resetEditorForm();
    addTaskInFlightRef.current = false;
  };

  const onCancelEditor = () => {
    resetEditorForm();
  };

  const confirmRemoveBlock = (block: DayPlanBlock) => {
    Alert.alert(
      '리듬 삭제',
      `「${block.title}」을(를) 오늘 일정에서 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => removeBlock(block.id),
        },
      ],
    );
  };

  const renderBlockRow = (block: DayPlanBlock) => {
    const completed = completedBlockIds.includes(block.id);
    const skipped = skippedBlockIds.includes(block.id);
    const isCurrent = firstPending?.id === block.id;
    const iconName = getBlockTimelineIcon(block);
    const timeRange = formatBlockTimeRange(block);

    let dot: ReactNode;
    if (completed) {
      dot = (
        <View style={[styles.dotFilled, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
          <IconSymbol name="checkmark" size={18} color={PRIMARY} />
        </View>
      );
    } else if (skipped) {
      dot = (
        <View style={[styles.dotDashed, { borderColor: muted, backgroundColor: chipSoftBg }]}>
          <IconSymbol name="forward.fill" size={16} color={muted} />
        </View>
      );
    } else if (isCurrent) {
      dot = (
        <View style={[styles.dotRing, { borderColor: PRIMARY, backgroundColor: surface }]}>
          <IconSymbol name={iconName} size={20} color={PRIMARY} />
        </View>
      );
    } else {
      dot = (
        <View style={[styles.dotMuted, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
          <IconSymbol name={iconName} size={20} color={muted} />
        </View>
      );
    }

    const cardMuted = !isCurrent && !completed && !skipped;

    return (
      <View key={block.id} style={styles.timelineRow}>
        <View style={styles.dotCol}>{dot}</View>
        <View
          style={[
            styles.timelineCard,
            {
              backgroundColor: surface,
              borderColor: border,
              opacity: completed || skipped ? (isDark ? 0.85 : 0.9) : 1,
            },
            cardMuted && styles.timelineCardMuted,
          ]}>
          <View style={styles.cardRow}>
            <View style={cardMuted ? { opacity: 0.65 } : undefined}>
              <ThemedText style={[styles.cardTitle, { color: text }]}>{block.title}</ThemedText>
              <ThemedText
                style={[
                  styles.cardTime,
                  { color: cardTimeColor(completed, skipped, isCurrent, muted) },
                ]}>
                {timeRange}
              </ThemedText>
            </View>
            <View style={styles.cardRowRight}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: badgeBg(completed, skipped, chipSoftBg, isDark),
                  },
                ]}>
                <ThemedText
                  style={[styles.badgeText, { color: badgeTextColor(completed, skipped, PRIMARY, muted) }]}>
                  {badgeLabel(block.category, completed, skipped)}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${block.title} 삭제`}
                hitSlop={8}
                style={styles.deleteIconBtn}
                onPress={() => confirmRemoveBlock(block)}>
                <IconSymbol name="trash" size={18} color={muted} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border, backgroundColor: bg }]}>
          <Pressable
            accessibilityRole="button"
            style={styles.headerIconBtn}
            onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={22} color={text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: text }]}>오늘 리듬 구성</ThemedText>
          <Pressable accessibilityRole="button" style={styles.headerIconBtn}>
            <IconSymbol name="ellipsis" size={22} color={text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.section}>
            <View style={styles.progressHeaderRow}>
              <View>
                <ThemedText style={[styles.kicker, { color: PRIMARY }]}>오늘을 위한 계획</ThemedText>
                <ThemedText style={[styles.sectionTitle, { color: text }]}>리듬을 확정하세요</ThemedText>
              </View>
              <View style={styles.progressNums}>
                <ThemedText style={[styles.percentText, { color: text }]}>{progressPercent}%</ThemedText>
                <ThemedText style={[styles.tasksHint, { color: muted }]}>{progressLabel}</ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: lineBg }]}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <ThemedText style={[styles.helper, { color: muted }]}>{helperText}</ThemedText>
          </View>

          {/* Timeline */}
          <View style={styles.timelineWrap}>
            <View style={[styles.timelineLine, { backgroundColor: lineBg, left: 19 }]} />

            {sortedBlocks.map((block) => renderBlockRow(block))}

            {/* 새 리듬 추가 → dayPlanStore.addBlock */}
            <View style={styles.timelineRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dotDashed, { borderColor: PRIMARY, backgroundColor: chipSoftBg }]}>
                  <IconSymbol name="plus" size={20} color={PRIMARY} />
                </View>
              </View>
              <View style={[styles.editorCard, { borderColor: PRIMARY, backgroundColor: chipSoftBg }]}>
                <ThemedText style={[styles.editorKicker, { color: PRIMARY }]}>새 리듬 추가</ThemedText>
                <ThemedText style={[styles.inputLabel, { color: muted }]}>리듬 이름</ThemedText>
                <TextInput
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  placeholder="딥워크 세션"
                  placeholderTextColor={muted}
                  style={[
                    styles.input,
                    { color: text, borderColor: border, backgroundColor: surface },
                  ]}
                />
                <View style={styles.timeRow}>
                  <View style={styles.timeCol}>
                    <ThemedText style={[styles.inputLabel, { color: muted }]}>시작 시각</ThemedText>
                    <TextInput
                      value={startTimeStr}
                      onChangeText={setStartTimeStr}
                      placeholder="09:00"
                      placeholderTextColor={muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.input,
                        { color: text, borderColor: border, backgroundColor: surface },
                      ]}
                    />
                  </View>
                  <View style={styles.timeCol}>
                    <ThemedText style={[styles.inputLabel, { color: muted }]}>종료 시각</ThemedText>
                    <TextInput
                      value={endTimeStr}
                      onChangeText={setEndTimeStr}
                      placeholder="10:30"
                      placeholderTextColor={muted}
                      keyboardType="numbers-and-punctuation"
                      style={[
                        styles.input,
                        { color: text, borderColor: border, backgroundColor: surface },
                      ]}
                    />
                  </View>
                </View>
                <ThemedText style={[styles.editorHint, { color: muted }]}>
                  같은 날 기준 · 종료는 시작보다 늦게(24:00까지)
                </ThemedText>
                <View style={styles.editorActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.addTaskBtn, { backgroundColor: PRIMARY }]}
                    onPress={onAddTask}>
                    <ThemedText style={styles.addTaskBtnText}>리듬 추가</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                    ]}
                    onPress={onCancelEditor}>
                    <ThemedText style={[styles.cancelBtnText, { color: text }]}>취소</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { borderTopColor: border, backgroundColor: bg }]}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !firstPending }}
              style={[
                styles.startDayBtn,
                { backgroundColor: PRIMARY },
                !firstPending && styles.startDayBtnDisabled,
              ]}
              onPress={onStartDay}>
              <IconSymbol name="play.fill" size={22} color="#fff" />
              <ThemedText style={styles.startDayText}>
                {firstPending ? '하루 시작하기' : '남은 일정이 없어요'}
              </ThemedText>
            </Pressable>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function cardTimeColor(completed: boolean, skipped: boolean, _isCurrent: boolean, muted: string) {
  if (skipped || completed) return muted;
  return PRIMARY;
}

function badgeBg(completed: boolean, skipped: boolean, chipSoftBg: string, isDark: boolean) {
  if (skipped) return isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.15)';
  if (completed) return isDark ? '#334155' : '#f1f5f9';
  return chipSoftBg;
}

function badgeTextColor(completed: boolean, skipped: boolean, primary: string, muted: string) {
  if (skipped) return muted;
  if (completed) return muted;
  return primary;
}

function badgeLabel(category: string, completed: boolean, skipped: boolean) {
  if (skipped) return '건너뜀';
  if (completed) return '완료';
  return category;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    padding: 16,
    gap: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  progressNums: {
    alignItems: 'flex-end',
  },
  percentText: {
    fontSize: 22,
    fontWeight: '700',
  },
  tasksHint: {
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  timelineWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    bottom: 48,
    width: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  dotCol: {
    width: 40,
    alignItems: 'center',
  },
  dotFilled: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dotRing: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotDashed: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotMuted: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  timelineCardMuted: {
    borderStyle: 'dashed',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteIconBtn: {
    padding: 6,
    marginRight: -4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  editorCard: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 4,
  },
  editorKicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  editorHint: {
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 4,
  },
  input: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  timeCol: {
    flex: 1,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  addTaskBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  addTaskBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 2,
    elevation: 8,
  },
  startDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  startDayBtnDisabled: {
    opacity: 0.45,
  },
  startDayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
