import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  blockDurationSec,
  emptyCategorySessionConfigs,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  getNextPendingAfter,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeMeditationDetailConfig,
  normalizeOtherDetailConfig,
  normalizeReadingLiveActivityConfig,
  readingDisplayTitle,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  normalizeYogaDetailConfig,
  parseNumberedFlowLines,
  useDayPlanNotificationStore,
  useDayPlanRuntimeStore,
  useDayPlanStore,
} from '@entities/day-plan';
import { rescheduleDayPlanNotifications } from '@features/day-plan-notifications';
import {
  buildLiveActivityChecklistRows,
  buildLiveActivityPayloadForBlock,
  endLockFlowLiveActivity,
  upsertFinishedLiveActivityForBlockId,
  useLiveActivitySync,
} from '@features/live-activity-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { ActiveSessionCard } from '@widgets/active-session-card';
import { formatDurationMinKo } from '@widgets/active-session-card/ui/sessionCardShared';

import { FastingGradientRing } from './FastingGradientRing';
import { SessionProgressRing } from './SessionProgressRing';

const PRIMARY = 'rgb(0, 0, 0)';
/** 수분섭취 풀스크린 세션 */
const WATER_SESSION_BG = '#070f1a';
const WATER_CYAN = '#22d3ee';
const MED_PRIMARY = '#1a1a1a';
const MED_PRIMARY_DIM = '#525252';
/** 독서 풀스크린 — Tailwind emerald-400/500 계열 */
const READING_EMERALD_TEXT = 'rgb(52, 211, 153)';
const READING_EMERALD = 'rgb(16, 185, 129)';
const RING_SIZE = 232;
const RING_STROKE = 14;
const CATEGORY_KEY_BY_LABEL: Record<string, string> = {
  러닝: 'other',
  업무: 'work',
  작업: 'work',
  독서: 'reading',
  헬스: 'other',
  운동: 'other',
  피트니스: 'other',
  공부: 'other',
  명상: 'meditation',
  요가: 'yoga',
  휴식: 'other',
  단식: 'fasting',
  수분: 'water',
  수분섭취: 'water',
  '약 복용': 'medicine',
  스트레칭: 'other',
  피트티스: 'other',
  기타: 'other',
  사용자: 'other',
  사용쟈: 'other',
};

function pickParam(value: string | string[] | undefined, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return fallback;
}

function safeRouterBack(router: ReturnType<typeof useRouter>) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/day-plan');
  }
}

/** mm:ss */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** HH:mm:ss */
function formatClockHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function resolveCategoryKeyFromLabel(label: string): string | null {
  if (!label) return null;
  return CATEGORY_KEY_BY_LABEL[label] ?? null;
}

function fastingGoalLabelKo(fastingMin: number): string {
  const m = Math.max(0, Math.round(fastingMin));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h}시간 단식`;
  if (h === 0) return `${r}분 단식`;
  return `${h}시간 ${r}분 단식`;
}

/** 단식 누적 비율(0~1)에 따른 안내 단계 (참고용) */
function fastingStageLabelKo(elapsedOverGoal: number): string {
  const f = Math.min(1, Math.max(0, elapsedOverGoal));
  if (f < 0.2) return '공복 적응 단계';
  if (f < 0.45) return '인슐린 안정 단계';
  if (f < 0.7) return '지방 연소 단계';
  return '깊은 단식 단계';
}

function formatMeridiemClock(minuteOfDay: number): { hhmm: string; meridiem: 'AM' | 'PM' } {
  const safe = ((Math.floor(minuteOfDay) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h24 = Math.floor(safe / 60);
  const mm = safe % 60;
  const meridiem: 'AM' | 'PM' = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hhmm: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, meridiem };
}

function medicineSlotKo(index: number): string {
  if (index === 0) return '아침';
  if (index === 1) return '점심';
  if (index === 2) return '저녁';
  return '추가';
}

export function ActivitySessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ blockId?: string; liveAction?: string }>();
  const blockId = pickParam(params.blockId, '');
  const liveAction = pickParam(params.liveAction, '');

  const { blocks, completedBlockIds, skippedBlockIds, completeBlock, skipBlock } = useDayPlanStore(
    useShallow((s) => ({
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
      completeBlock: s.completeBlock,
      skipBlock: s.skipBlock,
    })),
  );

  const block = useMemo(
    () => (blockId ? blocks.find((b) => b.id === blockId) : undefined),
    [blocks, blockId],
  );
  const runtimeTiming = useDayPlanRuntimeStore((s) => (blockId ? s.timelineByBlockId[blockId] : undefined));
  const startTicker = useDayPlanRuntimeStore((s) => s.startTicker);
  const stopTicker = useDayPlanRuntimeStore((s) => s.stopTicker);
  const setActiveBlockId = useDayPlanRuntimeStore((s) => s.setActiveBlockId);
  const setLiveActivityChecklistFocusBlockId = useDayPlanStore((s) => s.setLiveActivityChecklistFocusBlockId);

  const totalSec = block ? blockDurationSec(block) : 0;
  const startAtMs = runtimeTiming?.startAtMs ?? null;
  const endAtMs = runtimeTiming?.endAtMs ?? null;

  const [phaseNowMs, setPhaseNowMs] = useState(Date.now);
  const isWaitingToStart = startAtMs != null && phaseNowMs < startAtMs;
  const waitRemainingSec =
    startAtMs != null ? Math.max(0, Math.ceil((startAtMs - phaseNowMs) / 1000)) : 0;

  const [remainingSec, setRemainingSec] = useState(totalSec);
  const [isPaused, setIsPaused] = useState(false);
  const [runningEndAtMs, setRunningEndAtMs] = useState<number | null>(null);
  const [workTasks, setWorkTasks] = useState<{ id: string; text: string; done: boolean }[] | null>(null);
  /** 수분섭취 세션에서 목표 상세 저장과 동기화되는 섭취량(ml) */
  const [waterSessionDrankMl, setWaterSessionDrankMl] = useState<number | null>(null);
  const autoFinishTriggeredRef = useRef(false);
  const handledLiveActionRef = useRef<string | null>(null);

  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const chipSoftBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const ringTrack = isDark ? '#334155' : '#e2e8f0';

  const activityTitle = block?.title ?? '';
  const rawCategoryLabel = block?.category ?? '';
  const categoryLabel = rawCategoryLabel === '사용쟈' ? '사용자' : rawCategoryLabel;
  const categoryKey = resolveCategoryKeyFromLabel(categoryLabel);
  const timeRange = block ? formatBlockTimeRange(block) : '';
  const isQuickMemoSession = block?.blockOrigin === 'quickMemo';

  const categoryConfigs = useMemo(() => {
    const base = emptyCategorySessionConfigs();
    if (!categoryKey) return base;
    const raw = loadGoalDetailCategoryConfig(categoryKey);
    switch (categoryKey) {
      case 'reading':
        return { ...base, reading: normalizeReadingLiveActivityConfig(raw) };
      case 'work':
        return { ...base, work: normalizeWorkDetailConfig(raw ?? {}) };
      case 'meditation':
        return { ...base, meditation: normalizeMeditationDetailConfig(raw ?? {}) };
      case 'yoga':
        return { ...base, yoga: normalizeYogaDetailConfig(raw ?? {}) };
      case 'fasting':
        return { ...base, fasting: normalizeFastingDetailConfig(raw ?? {}) };
      case 'water':
        return { ...base, water: normalizeWaterDetailConfig(raw ?? {}) };
      case 'medicine':
        return { ...base, medicine: normalizeMedicineDetailConfig(raw ?? {}) };
      case 'other':
        return { ...base, other: normalizeOtherDetailConfig(raw ?? {}) };
      default:
        return base;
    }
  }, [categoryKey]);

  useEffect(() => {
    if (categoryKey !== 'work' || !categoryConfigs.work) {
      setWorkTasks(null);
      return;
    }
    setWorkTasks(categoryConfigs.work.tasks);
  }, [categoryKey, categoryConfigs.work]);

  useEffect(() => {
    if (categoryKey !== 'water' || !categoryConfigs.water) {
      setWaterSessionDrankMl(null);
      return;
    }
    setWaterSessionDrankMl(categoryConfigs.water.drankMl);
  }, [categoryKey, categoryConfigs.water]);

  const addWaterIntakeMl = useCallback(
    (deltaMl: number) => {
      if (!block || categoryKey !== 'water' || !categoryConfigs.water || deltaMl <= 0) return;
      const w = categoryConfigs.water;
      setWaterSessionDrankMl((prev) => {
        const base = prev ?? w.drankMl;
        const next = Math.max(0, Math.min(w.goalMl, base + deltaMl));
        const payload = normalizeWaterDetailConfig({ ...w, drankMl: next });
        saveGoalDetailCategoryConfig('water', payload);
        saveGoalDetailBlockConfig(block.id, payload);
        return next;
      });
    },
    [block, categoryKey, categoryConfigs.water],
  );

  const toggleWorkTaskDone = useCallback(
    (taskId: string) => {
      if (categoryKey !== 'work' || !categoryConfigs.work) return;
      setWorkTasks((prev) => {
        const base = prev ?? categoryConfigs.work?.tasks ?? [];
        const next = base.map((task) =>
          task.id === taskId ? { ...task, done: !task.done } : task,
        );
        saveGoalDetailCategoryConfig('work', { ...categoryConfigs.work, tasks: next });
        return next;
      });
    },
    [categoryKey, categoryConfigs.work],
  );

  const flowBlocks = useMemo(() => filterDayPlanFlowBlocks(blocks), [blocks]);

  const nextBlock = useMemo(() => {
    if (!block || block.blockOrigin === 'quickMemo') return null;
    return getNextPendingAfter(flowBlocks, block.id, completedBlockIds, skippedBlockIds);
  }, [block, flowBlocks, completedBlockIds, skippedBlockIds]);

  const progress = useMemo(() => {
    if (isQuickMemoSession) return 0;
    if (totalSec <= 0) return 0;
    return Math.min(1, Math.max(0, (totalSec - remainingSec) / totalSec));
  }, [isQuickMemoSession, totalSec, remainingSec]);

  const pausedRemainingSeconds = isPaused ? remainingSec : null;
  const checklist = useMemo(
    () =>
      block
        ? buildLiveActivityChecklistRows({
          focusBlockId: block.id,
          status: isWaitingToStart ? 'standby' : isPaused ? 'paused' : 'active',
        })
        : {
          checklistTitle: '오늘 플로우 목록',
          checklistCountLabel: '0개',
          checklistRows: [],
          checklistSummaryLine1: '완료 0개 · 건너뜀 0개 · 남은 0개',
          checklistSummaryLine2: '오늘 남은 플로우가 없어요',
        },
    [block, isPaused, isWaitingToStart],
  );

  const liveActivityPayload = useMemo(() => {
    if (!block) return null;
    const status = isWaitingToStart ? 'standby' : isPaused ? 'paused' : 'active';
    const base = buildLiveActivityPayloadForBlock({
      blockId: block.id,
      status,
      pausedRemainingSeconds: isWaitingToStart ? null : pausedRemainingSeconds,
    });
    if (!base) return null;
    if (categoryKey === 'reading' && categoryConfigs.reading) {
      return { ...base, readingDataConfig: categoryConfigs.reading };
    }
    return base;
  }, [
    block,
    categoryConfigs.reading,
    categoryKey,
    checklist,
    isPaused,
    isWaitingToStart,
    pausedRemainingSeconds,
  ]);

  useLiveActivitySync(liveActivityPayload);

  useEffect(() => {
    const id = setInterval(() => setPhaseNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    startTicker();
    return () => stopTicker();
  }, [startTicker, stopTicker]);

  useEffect(() => {
    setActiveBlockId(block?.id ?? null);
  }, [block?.id, setActiveBlockId]);

  useEffect(() => {
    if (block?.id) setLiveActivityChecklistFocusBlockId(block.id);
  }, [block?.id, setLiveActivityChecklistFocusBlockId]);

  const navigateAfterComplete = useCallback(() => {
    if (!block) {
      safeRouterBack(router);
      return;
    }
    completeBlock(block.id);
    const s = useDayPlanStore.getState();
    void rescheduleDayPlanNotifications({
      dateKey: s.dateKey,
      blocks: s.blocks,
      settings: useDayPlanNotificationStore.getState().toSettings(),
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
    });
    const next = getNextPendingAfter(
      filterDayPlanFlowBlocks(s.blocks),
      block.id,
      s.completedBlockIds,
      s.skippedBlockIds,
    );
    if (next) {
      router.replace({ pathname: '/activity-session', params: { blockId: next.id } });
    } else {
      void endLockFlowLiveActivity();
      safeRouterBack(router);
    }
  }, [block, completeBlock, router]);

  const navigateAfterSkip = useCallback(() => {
    if (!block) {
      safeRouterBack(router);
      return;
    }
    skipBlock(block.id);
    const s = useDayPlanStore.getState();
    void rescheduleDayPlanNotifications({
      dateKey: s.dateKey,
      blocks: s.blocks,
      settings: useDayPlanNotificationStore.getState().toSettings(),
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
    });
    const next = getNextPendingAfter(
      filterDayPlanFlowBlocks(s.blocks),
      block.id,
      s.completedBlockIds,
      s.skippedBlockIds,
    );
    if (next) {
      router.replace({ pathname: '/activity-session', params: { blockId: next.id } });
    } else {
      void endLockFlowLiveActivity();
      safeRouterBack(router);
    }
  }, [block, router, skipBlock]);

  const togglePause = useCallback(() => {
    if (!block) return;
    if (block.blockOrigin === 'quickMemo') return;
    if (isWaitingToStart) return;

    if (isPaused) {
      setRunningEndAtMs(Date.now() + remainingSec * 1000);
      setIsPaused(false);
      return;
    }

    const nextRemaining =
      runningEndAtMs === null ? remainingSec : Math.max(0, Math.ceil((runningEndAtMs - Date.now()) / 1000));
    setRemainingSec(nextRemaining);
    setRunningEndAtMs(null);
    setIsPaused(true);
  }, [block, isPaused, isWaitingToStart, remainingSec, runningEndAtMs]);

  useEffect(() => {
    if (!block) return;
    if (!liveAction) return;
    const token = `${block.id}:${liveAction}`;
    if (handledLiveActionRef.current === token) return;
    handledLiveActionRef.current = token;

    if (liveAction === 'togglePause') {
      togglePause();
      router.replace({ pathname: '/activity-session', params: { blockId: block.id } });
      return;
    }

    if (liveAction === 'complete') {
      navigateAfterComplete();
    }
  }, [block, liveAction, navigateAfterComplete, router, togglePause]);

  useEffect(() => {
    if (!blockId) {
      safeRouterBack(router);
      return;
    }
    if (!block) {
      void endLockFlowLiveActivity();
      safeRouterBack(router);
    }
  }, [block, blockId, router]);

  useEffect(() => {
    autoFinishTriggeredRef.current = false;
    setIsPaused(false);
    if (!block) {
      setRemainingSec(0);
      setRunningEndAtMs(null);
      return;
    }
    if (block.blockOrigin === 'quickMemo') {
      setRemainingSec(0);
      setRunningEndAtMs(null);
      return;
    }
    const bootEndAtMs = runtimeTiming?.endAtMs ?? Date.now() + blockDurationSec(block) * 1000;
    setRemainingSec(Math.max(0, Math.ceil((bootEndAtMs - Date.now()) / 1000)));
    setRunningEndAtMs(
      bootEndAtMs,
    );
  }, [block?.id, block, runtimeTiming?.endAtMs]);

  useEffect(() => {
    if (!block || block.blockOrigin === 'quickMemo') return;
    if (isPaused || runningEndAtMs === null) return;

    const id = setInterval(() => {
      const nextRemaining = Math.max(0, Math.ceil((runningEndAtMs - Date.now()) / 1000));
      setRemainingSec(nextRemaining);
    }, 1000);

    return () => clearInterval(id);
  }, [block?.id, isPaused, block, runningEndAtMs]);

  useEffect(() => {
    if (!block || block.blockOrigin === 'quickMemo') return;
    if (isPaused) return;
    if (remainingSec > 0) return;
    if (autoFinishTriggeredRef.current) return;
    autoFinishTriggeredRef.current = true;
    void upsertFinishedLiveActivityForBlockId(block.id);
    navigateAfterComplete();
  }, [remainingSec, block, isPaused, navigateAfterComplete]);

  if (!block) {
    return null;
  }

  // ── Full-screen work session ──
  if (categoryKey === 'work' && !isQuickMemoSession && categoryConfigs.work) {
    const workCfg = categoryConfigs.work;
    const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
    const effectiveTasks = workTasks ?? workCfg.tasks;
    const useTaskChecklist = effectiveTasks.length > 0;
    const workRows =
      useTaskChecklist
        ? effectiveTasks.map((task, idx) => ({
            blockId: task.id || `work-task-${idx}`,
            title: task.text,
            timeLabel: '',
            state: (task.done ? 'completed' : 'upcoming') as
              | 'upcoming'
              | 'completed'
              | 'skipped'
              | 'current',
          }))
        : checklist.checklistRows;
    const workRemainingCount = workRows.filter((r) => r.state !== 'completed' && r.state !== 'skipped').length;

    return (
      <View style={workStyles.screen}>
        <SafeAreaView style={workStyles.safe} edges={['top', 'bottom']}>
          <View style={workStyles.topBar}>
            <View style={workStyles.headerBtn} />
            <ThemedText style={workStyles.topBarTitle} numberOfLines={1}>
              {activityTitle || '작업'}
            </ThemedText>
            <View style={workStyles.headerBtn} />
          </View>

          <ScrollView
            style={workStyles.scroll}
            contentContainerStyle={workStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces>
            <View style={workStyles.anchorOuter}>
              <IconSymbol name="briefcase.fill" size={100} color="rgba(255,255,255,0.85)" weight="light" />
              <View style={workStyles.motionLines}>
                <View style={[workStyles.motionLine, { width: 40 }]} />
                <View style={[workStyles.motionLine, { width: 64 }]} />
                <View style={[workStyles.motionLine, { width: 48 }]} />
              </View>
            </View>

            <View style={workStyles.timerBlock}>
              <ThemedText
                style={workStyles.timerHMS}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.45}>
                {formatClockHMS(timerSec)}
              </ThemedText>
              <View style={workStyles.focusRow}>
                <View style={workStyles.pulseDot} />
                <ThemedText style={workStyles.focusKicker}>
                  {isPaused
                    ? '작업 일시정지'
                    : isWaitingToStart
                      ? '시작 대기'
                      : '작업에 집중 중'}
                </ThemedText>
              </View>
              {workCfg.planMin > 0 ? (
                <ThemedText style={workStyles.planHint}>
                  집중 플랜 {workCfg.planMin}분 · 기록 {workCfg.doneMin}분
                </ThemedText>
              ) : null}
            </View>

            <View style={workStyles.checklistSection}>
              <View style={workStyles.checklistHeaderRow}>
                <ThemedText style={workStyles.checklistTitle}>해야 할 작업 리스트</ThemedText>
                <ThemedText style={workStyles.checklistRemain}>
                  남은 {workRemainingCount}개
                </ThemedText>
              </View>
              <View style={workStyles.checklistList}>
                {workRows.length === 0 ? (
                  <View style={[workStyles.glassPanel, workStyles.checklistEmpty]}>
                    <ThemedText style={workStyles.checklistEmptyText}>표시할 플로우가 없습니다</ThemedText>
                  </View>
                ) : (
                  workRows.map((row) => {
                    const done = row.state === 'completed';
                    const current = row.state === 'current';
                    const skipped = row.state === 'skipped';
                    return (
                      <View
                        key={row.blockId}
                        style={[
                          workStyles.glassPanel,
                          workStyles.checklistItem,
                          current && workStyles.checklistItemCurrent,
                        ]}>
                        <View style={workStyles.checklistItemTextCol}>
                          <ThemedText
                            style={[
                              workStyles.checklistItemTitle,
                              done && workStyles.checklistItemTitleDone,
                              skipped && workStyles.checklistItemTitleSkip,
                            ]}
                            numberOfLines={2}>
                            {row.title}
                          </ThemedText>
                          {row.timeLabel ? (
                            <ThemedText style={workStyles.checklistItemMeta} numberOfLines={1}>
                              {row.timeLabel}
                            </ThemedText>
                          ) : null}
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={done ? '작업 체크 해제' : '작업 체크'}
                          disabled={!useTaskChecklist}
                          onPress={() => {
                            if (!useTaskChecklist) return;
                            toggleWorkTaskDone(row.blockId);
                          }}
                          style={workStyles.checkBox}>
                          <IconSymbol
                            name={done ? 'checkmark' : skipped ? 'minus' : 'checkmark'}
                            size={22}
                            color={
                              done
                                ? PRIMARY
                                : skipped
                                  ? 'rgba(255,255,255,0.12)'
                                  : 'rgba(255,255,255,0.2)'
                            }
                          />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            <View style={workStyles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={[workStyles.btnSecondary, isWaitingToStart && { opacity: 0.5 }]}
                onPress={togglePause}
                disabled={isWaitingToStart}>
                <IconSymbol
                  name={isPaused ? 'play.circle' : 'pause.circle'}
                  size={22}
                  color="#fff"
                />
                <ThemedText style={workStyles.btnSecondaryText}>
                  {isPaused ? '계속하기' : '잠시 휴식'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={workStyles.btnPrimary}
                onPress={navigateAfterComplete}>
                <IconSymbol name="power" size={22} color="#fff" />
                <ThemedText style={workStyles.btnPrimaryText}>작업 종료</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Full-screen reading session (독서) ──
  if (categoryKey === 'reading' && !isQuickMemoSession && categoryConfigs.reading) {
    const readingCfg = categoryConfigs.reading;
    const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
    const bookTitle = readingDisplayTitle(activityTitle, readingCfg);
    const pageRange = `${readingCfg.startPage}p ~ ${readingCfg.targetPage}p`;

    return (
      <View style={readStyles.screen}>
        <SafeAreaView style={readStyles.safe} edges={['top', 'bottom']}>
          <View style={readStyles.topBar}>
            <View style={readStyles.headerBtn} />
            <ThemedText style={readStyles.topBarTitle} numberOfLines={1}>
              독서
            </ThemedText>
            <View style={readStyles.headerBtn} />
          </View>

          <ScrollView
            style={readStyles.scroll}
            contentContainerStyle={readStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces>
            <View style={readStyles.bookIconWrap}>
              <View style={readStyles.bookCircle}>
                <IconSymbol name="book.fill" size={56} color={READING_EMERALD_TEXT} weight="light" />
              </View>
            </View>

            <View style={readStyles.infoBlock}>
              <ThemedText style={readStyles.bookKicker}>몰입 중인 도서</ThemedText>
              <ThemedText style={readStyles.bookTitle}>{bookTitle}</ThemedText>

              <View style={readStyles.rangeBlock}>
                <ThemedText style={readStyles.rangeLabel}>오늘의 목표 범위</ThemedText>
                <ThemedText style={readStyles.rangeValue}>{pageRange}</ThemedText>
              </View>
            </View>

            <View style={readStyles.timerSection}>
              <ThemedText
                style={readStyles.timerHMS}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.4}>
                {formatClockHMS(timerSec)}
              </ThemedText>
              <View style={readStyles.readingStatusRow}>
                <View style={readStyles.pulseDotReading} />
                <ThemedText style={readStyles.readingStatusText}>
                  {isPaused ? '독서 일시정지' : isWaitingToStart ? '시작 대기' : '독서 중'}
                </ThemedText>
              </View>
            </View>

            <View style={readStyles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={[readStyles.btnSecondary, isWaitingToStart && { opacity: 0.5 }]}
                onPress={togglePause}
                disabled={isWaitingToStart}>
                <IconSymbol
                  name={isPaused ? 'play.circle' : 'pause.circle'}
                  size={22}
                  color="#fff"
                />
                <ThemedText style={readStyles.btnSecondaryText}>
                  {isPaused ? '계속하기' : '잠시 멈춤'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={readStyles.btnPrimaryReading}
                onPress={navigateAfterComplete}>
                <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
                <ThemedText style={readStyles.btnPrimaryReadingText}>독서 완료</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Full-screen fasting session (단식) ──
  if (categoryKey === 'fasting' && !isQuickMemoSession && categoryConfigs.fasting) {
    const fastingCfg = categoryConfigs.fasting;
    const elapsedSec = isWaitingToStart ? 0 : Math.max(0, totalSec - remainingSec);
    const goalSec = Math.max(60, fastingCfg.fastingMin * 60);
    const fastProgress = Math.min(1, elapsedSec / goalSec);
    const ringStroke = 20;
    const ringSize = 288;

    return (
      <View style={fastStyles.screen}>
        <SafeAreaView style={fastStyles.safe} edges={['top', 'bottom']}>
          <View style={fastStyles.topBar}>
            <Pressable accessibilityRole="button" style={fastStyles.headerBtn} onPress={() => safeRouterBack(router)}>
              <IconSymbol name="chevron.left" size={22} color={PRIMARY} />
            </Pressable>
            <ThemedText style={fastStyles.topBarTitle} numberOfLines={1}>
              단식
            </ThemedText>
            <View style={fastStyles.headerBtn} />
          </View>

          <ScrollView
            style={fastStyles.scroll}
            contentContainerStyle={fastStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces>
            <View style={[fastStyles.ringWrap, { width: ringSize, height: ringSize }]}>
              <FastingGradientRing
                size={ringSize}
                strokeWidth={ringStroke}
                progress={fastProgress}
                gradientId={`fastingRing-${block.id}`}
              />
              <View style={fastStyles.ringIconOverlay} pointerEvents="none">
                <View style={fastStyles.ringCenterIcon}>
                  <IconSymbol name="clock.badge.checkmark" size={40} color="rgba(255,255,255,0.85)" />
                </View>
              </View>
            </View>

            <View style={fastStyles.timerBlock}>
              <ThemedText
                style={fastStyles.timerHMS}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.45}>
                {formatClockHMS(elapsedSec)}
              </ThemedText>
              <ThemedText style={fastStyles.timerCaption}>단식 진행 시간</ThemedText>
            </View>

            <View style={fastStyles.cards}>
              <View style={[fastStyles.glassCard, fastStyles.cardRow]}>
                <View style={fastStyles.cardIconWrap}>
                  <IconSymbol name="hourglass" size={26} color="rgb(251, 146, 60)" />
                </View>
                <View style={fastStyles.cardTextCol}>
                  <ThemedText style={fastStyles.cardLabel}>마지막 식사</ThemedText>
                  <ThemedText style={fastStyles.cardValue}>
                    {elapsedSec < 60
                      ? '방금 시작'
                      : `${formatDurationMinKo(Math.floor(elapsedSec / 60))} 경과`}
                  </ThemedText>
                </View>
              </View>

              <View style={[fastStyles.glassCard, fastStyles.cardRow]}>
                <View style={[fastStyles.cardIconWrap, fastStyles.cardIconWrapPrimary]}>
                  <IconSymbol name="chart.line.uptrend.xyaxis" size={26} color={PRIMARY} />
                </View>
                <View style={fastStyles.cardTextCol}>
                  <ThemedText style={fastStyles.cardLabel}>현재 상태</ThemedText>
                  <ThemedText style={[fastStyles.cardValue, fastStyles.cardValuePrimary]}>
                    {fastingStageLabelKo(fastProgress)}
                  </ThemedText>
                </View>
              </View>

              <View style={[fastStyles.glassCard, fastStyles.cardRow]}>
                <View style={fastStyles.cardIconWrap}>
                  <IconSymbol name="clock.badge.checkmark" size={26} color={PRIMARY} />
                </View>
                <View style={fastStyles.cardTextCol}>
                  <ThemedText style={fastStyles.cardLabel}>목표 시간</ThemedText>
                  <ThemedText style={fastStyles.cardValue}>
                    {fastingGoalLabelKo(fastingCfg.fastingMin)}
                  </ThemedText>
                </View>
              </View>
            </View>

            <View style={fastStyles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={[fastStyles.btnSecondary, isWaitingToStart && { opacity: 0.5 }]}
                onPress={togglePause}
                disabled={isWaitingToStart}>
                <IconSymbol
                  name={isPaused ? 'play.circle' : 'pause.circle'}
                  size={22}
                  color="#fff"
                />
                <ThemedText style={fastStyles.btnSecondaryText}>
                  {isPaused ? '계속하기' : '잠시 멈춤'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={fastStyles.btnPrimaryFast}
                onPress={navigateAfterComplete}>
                <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
                <ThemedText style={fastStyles.btnPrimaryFastText}>단식 완료</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Full-screen medicine session (약 복용) ──
  if (categoryKey === 'medicine' && !isQuickMemoSession && categoryConfigs.medicine) {
    const medCfg = categoryConfigs.medicine;
    const totalDoses = Math.max(1, medCfg.dosesPerDay);
    const takenCount = Math.max(0, Math.min(totalDoses, medCfg.takenCount));
    const activeIndex = Math.min(takenCount, totalDoses - 1);
    const scheduleLimit = Math.min(totalDoses, 4);
    const intervalMin = Math.max(60, Math.floor((24 * 60) / totalDoses));
    const progressWidth = `${Math.max(8, Math.round((takenCount / totalDoses) * 100))}%` as `${number}%`;
    const currentSlot = medicineSlotKo(activeIndex);
    const scheduleRows = Array.from({ length: scheduleLimit }, (_, idx) => {
      const slotIndex = idx;
      const atMinutes = (block.startMinutes + intervalMin * slotIndex) % (24 * 60);
      const clock = formatMeridiemClock(atMinutes);
      const status = slotIndex < takenCount ? '완료' : slotIndex === activeIndex ? '진행중' : '예정';
      return {
        key: `${slotIndex}-${atMinutes}`,
        hhmm: clock.hhmm,
        title: `${medicineSlotKo(slotIndex)} 약 복용`,
        status,
        isActive: slotIndex === activeIndex,
        isDone: slotIndex < takenCount,
      };
    });
    const headerClock = formatMeridiemClock(block.startMinutes);

    return (
      <View style={medStyles.screen}>
        <SafeAreaView style={medStyles.safe} edges={['top', 'bottom']}>
          <ScrollView
            style={medStyles.scroll}
            contentContainerStyle={medStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={medStyles.timerSection}>
              <ThemedText style={medStyles.timerText}>
                {headerClock.hhmm}{' '}
                <ThemedText style={medStyles.timerMeridiem}>{headerClock.meridiem}</ThemedText>
              </ThemedText>
              <ThemedText style={medStyles.timerCaption}>예약 시간</ThemedText>
            </View>

            <View style={medStyles.mainCard}>
              <View style={medStyles.cardGlow} />
              <View style={medStyles.cardInner}>
                <View style={medStyles.pillCircle}>
                  <IconSymbol name="pills.fill" size={36} color="#fff" />
                </View>

                <View style={medStyles.titleBlock}>
                  <View style={medStyles.badge}>
                    <ThemedText style={medStyles.badgeText}>복용 시간입니다</ThemedText>
                  </View>
                  <ThemedText style={medStyles.title}>{medCfg.doseLabel}</ThemedText>
                  <ThemedText style={medStyles.subtitle}>
                    {medCfg.doseLabel} ({currentSlot} 복용)
                  </ThemedText>
                </View>

                <View style={medStyles.progressTrack}>
                  <View style={[medStyles.progressFill, { width: progressWidth }]} />
                </View>
              </View>
            </View>

            <View style={medStyles.scheduleSection}>
              <ThemedText style={medStyles.scheduleHeading}>오늘의 일정</ThemedText>
              <View style={medStyles.scheduleList}>
                {scheduleRows.map((row) => (
                  <View
                    key={row.key}
                    style={[medStyles.scheduleCard, row.isActive && medStyles.scheduleCardActive]}>
                    <View style={[medStyles.scheduleLeft, !row.isActive && medStyles.scheduleLeftMuted]}>
                      <ThemedText style={[medStyles.scheduleTime, row.isActive && medStyles.scheduleTimeActive]}>
                        {row.hhmm}
                      </ThemedText>
                      <View>
                        <ThemedText style={medStyles.scheduleTitle}>{row.title}</ThemedText>
                        <ThemedText style={medStyles.scheduleMeta}>
                          {row.isDone ? '완료' : row.isActive ? '현재 복용' : '예정'}
                        </ThemedText>
                      </View>
                    </View>
                    <IconSymbol
                      name={row.isDone || row.isActive ? 'checkmark.circle.fill' : 'clock'}
                      size={20}
                      color={row.isDone || row.isActive ? MED_PRIMARY : 'rgba(156,163,175,0.9)'}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={medStyles.actionRow}>
              <Pressable accessibilityRole="button" style={medStyles.btnGhost} onPress={() => safeRouterBack(router)}>
                <IconSymbol name="chevron.left" size={20} color="#fff" />
                <ThemedText style={medStyles.btnGhostText}>뒤로</ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" style={medStyles.btnPrimary} onPress={navigateAfterComplete}>
                <IconSymbol name="checkmark.circle.fill" size={22} color="#fff" />
                <ThemedText style={medStyles.btnPrimaryText}>복용 완료</ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Full-screen water session (수분섭취) ──
  if (categoryKey === 'water' && !isQuickMemoSession && categoryConfigs.water) {
    const wCfg = categoryConfigs.water;
    const drank = waterSessionDrankMl ?? wCfg.drankMl;
    const drinkProg = wCfg.goalMl > 0 ? Math.min(1, drank / wCfg.goalMl) : 0;
    const remainingMl = Math.max(0, wCfg.goalMl - drank);
    const goalL = (wCfg.goalMl / 1000).toFixed(1);
    const remL = (remainingMl / 1000).toFixed(1);
    const hydrateTrack = Math.max(drinkProg, progress);
    const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
    const addIntakeDisabled = isWaitingToStart || (wCfg.goalMl > 0 && drank >= wCfg.goalMl);

    return (
      <View style={waterStyles.screen}>
        <SafeAreaView style={waterStyles.safe} edges={['top', 'bottom']}>
          <View style={waterStyles.topHeader}>
            <Pressable
              accessibilityRole="button"
              style={waterStyles.headerBtn}
              onPress={() => safeRouterBack(router)}>
              <IconSymbol name="chevron.left" size={22} color={WATER_CYAN} />
            </Pressable>
            <ThemedText style={waterStyles.topHeaderTitle} lightColor="#f4f4f5" darkColor="#f4f4f5">
              {isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : '수분섭취 집중'}
            </ThemedText>
            <View style={waterStyles.headerBtn} />
          </View>

          <ScrollView
            style={waterStyles.scroll}
            contentContainerStyle={[
              waterStyles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 120 },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={waterStyles.anchorOuter}>
              <View style={waterStyles.anchorGlow} />
              <View style={waterStyles.anchorWrap}>
                <IconSymbol name="drop.fill" size={92} color="#ecfeff" weight="light" />
              </View>
              <View style={waterStyles.rippleRow}>
                <View style={[waterStyles.ripple, { width: 36 }]} />
                <View style={[waterStyles.ripple, { width: 56 }]} />
                <View style={[waterStyles.ripple, { width: 44 }]} />
              </View>
            </View>

            <View style={waterStyles.timerBlock}>
              <ThemedText style={waterStyles.timerKicker} lightColor="rgba(34,211,238,0.85)" darkColor="rgba(34,211,238,0.85)">
                수분섭취 세션
              </ThemedText>
              <ThemedText style={waterStyles.timerHms} lightColor="#fff" darkColor="#fff">
                {formatClock(timerSec)}
              </ThemedText>
              <ThemedText style={waterStyles.flowCaption} lightColor="rgba(161,161,170,0.95)" darkColor="rgba(161,161,170,0.95)">
                {activityTitle.trim() ? activityTitle : '오늘의 물 목표에 맞춰요'}
              </ThemedText>
            </View>

            <View style={waterStyles.grid}>
              <View style={[waterStyles.glass, waterStyles.mainStatCard]}>
                <ThemedText style={waterStyles.statLabel} lightColor="rgba(165,243,252,0.65)" darkColor="rgba(165,243,252,0.65)">
                  하루 물 목표
                </ThemedText>
                <View style={waterStyles.goalRow}>
                  <ThemedText style={waterStyles.goalValue} lightColor="#fff" darkColor="#fff">
                    {goalL}
                  </ThemedText>
                  <ThemedText style={waterStyles.goalUnit} lightColor="rgba(255,255,255,0.55)" darkColor="rgba(255,255,255,0.55)">
                    L
                  </ThemedText>
                </View>
                <ThemedText style={waterStyles.metaLine} lightColor="rgba(161,161,170,0.95)" darkColor="rgba(161,161,170,0.95)">
                  {wCfg.goalMl}ml 기준 · 섭취 {drank}ml · 남은 {remL}L
                </ThemedText>
                <View style={waterStyles.hydrateTrack}>
                  <View style={[waterStyles.hydrateFill, { width: `${Math.round(hydrateTrack * 100)}%` }]} />
                </View>
              </View>

              <View style={waterStyles.splitRow}>
                <View style={[waterStyles.glass, waterStyles.halfCard]}>
                  <ThemedText style={waterStyles.halfLabel} lightColor="rgba(161,161,170,0.9)" darkColor="rgba(161,161,170,0.9)">
                    섭취량
                  </ThemedText>
                  <ThemedText style={waterStyles.halfValue} lightColor="#fff" darkColor="#fff">
                    {drank}
                  </ThemedText>
                  <ThemedText style={waterStyles.halfUnit} lightColor="rgba(161,161,170,0.85)" darkColor="rgba(161,161,170,0.85)">
                    ml
                  </ThemedText>
                </View>
                <View style={[waterStyles.glass, waterStyles.halfCard]}>
                  <ThemedText style={waterStyles.halfLabel} lightColor="rgba(161,161,170,0.9)" darkColor="rgba(161,161,170,0.9)">
                    플로우 진행
                  </ThemedText>
                  <ThemedText style={waterStyles.halfValue} lightColor="#fff" darkColor="#fff">
                    {Math.round(progress * 100)}
                  </ThemedText>
                  <ThemedText style={waterStyles.halfUnit} lightColor="rgba(161,161,170,0.85)" darkColor="rgba(161,161,170,0.85)">
                    %
                  </ThemedText>
                </View>
              </View>

              <View style={waterStyles.addSection}>
                <ThemedText style={waterStyles.addSectionTitle} lightColor="#f4f4f5" darkColor="#f4f4f5">
                  섭취 추가
                </ThemedText>
                <ThemedText style={waterStyles.addSectionHint} lightColor="rgba(161,161,170,0.95)" darkColor="rgba(161,161,170,0.95)">
                  마신 만큼 눌러 오늘 할당량에 반영해요. 목표량을 넘기지 않아요.
                </ThemedText>
                <View style={waterStyles.addChipWrap}>
                  {[100, 200, 250, 500].map((ml) => (
                    <Pressable
                      key={ml}
                      accessibilityRole="button"
                      accessibilityLabel={`물 ${ml}밀리리터 추가`}
                      onPress={() => addWaterIntakeMl(ml)}
                      disabled={addIntakeDisabled}
                      style={({ pressed }) => [
                        waterStyles.addChip,
                        addIntakeDisabled && waterStyles.addChipDisabled,
                        pressed && !addIntakeDisabled && waterStyles.addChipPressed,
                      ]}>
                      <ThemedText
                        style={waterStyles.addChipText}
                        lightColor={addIntakeDisabled ? 'rgba(255,255,255,0.35)' : WATER_CYAN}
                        darkColor={addIntakeDisabled ? 'rgba(255,255,255,0.35)' : WATER_CYAN}>
                        +{ml}ml
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[waterStyles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Pressable
              accessibilityRole="button"
              style={[waterStyles.glass, waterStyles.stopBtn]}
              onPress={navigateAfterComplete}>
              <IconSymbol name="stop.circle" size={28} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[waterStyles.pauseBtn, isWaitingToStart && { opacity: 0.5 }]}
              onPress={togglePause}
              disabled={isWaitingToStart}>
              <IconSymbol
                name={isPaused ? 'play.circle.fill' : 'pause.circle.fill'}
                size={44}
                color="#fff"
              />
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const memoLines = parseNumberedFlowLines(block.title);

  const usesHeroBeforeButtons =
    !isQuickMemoSession &&
    categoryKey !== null &&
    categoryKey !== 'reading' &&
    categoryKey !== 'work' &&
    categoryKey !== 'fasting' &&
    categoryKey !== 'water';

  const sessionCardProps = {
    categoryKey,
    categoryConfigs,
    title: activityTitle,
    remainingSec,
    progressPct: Math.round(progress * 100),
    isPaused,
    isWaitingToStart,
    waitRemainingSec,
    checklistTitle: checklist.checklistTitle,
    checklistCountLabel: checklist.checklistCountLabel,
    checklistRows: checklist.checklistRows,
    checklistSummaryLine1: checklist.checklistSummaryLine1,
    checklistSummaryLine2: checklist.checklistSummaryLine2,
  } as const;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: border,
              paddingTop: Math.max(insets.top, 8),
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            style={styles.headerIconBtn}
            onPress={() => safeRouterBack(router)}>
            <IconSymbol name="chevron.left" size={22} color={text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={[styles.kicker, { color: PRIMARY }]}>현재 활동</ThemedText>
            <ThemedText style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
              {activityTitle}
            </ThemedText>
            <View style={[styles.categoryChip, { backgroundColor: chipSoftBg }]}>
              <ThemedText style={[styles.categoryChipText, { color: PRIMARY }]}>
                {categoryLabel}
              </ThemedText>
            </View>
            <ThemedText style={[styles.subMeta, { color: muted }]}>
              {isQuickMemoSession ? '빠른 메모' : timeRange}
            </ThemedText>
          </View>
          <Pressable accessibilityRole="button" style={styles.headerIconBtn}>
            <IconSymbol name="gearshape" size={22} color={text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces>
          {usesHeroBeforeButtons ? (
            <ActiveSessionCard {...sessionCardProps} segment="categoryOnly" />
          ) : null}

          <View style={styles.bodyMain}>
            {isQuickMemoSession ? (
              <View style={[styles.memoBlock, { borderColor: border, backgroundColor: surface }]}>
                {memoLines.map((line, idx) => (
                  <ThemedText key={`${idx}-${line.slice(0, 8)}`} style={[styles.memoLine, { color: text }]}>
                    {line}
                  </ThemedText>
                ))}
                {isWaitingToStart ? (
                  <View style={[styles.pauseBadge, { backgroundColor: chipSoftBg, alignSelf: 'center' }]}>
                    <ThemedText style={[styles.pauseBadgeText, { color: PRIMARY }]}>시작 대기</ThemedText>
                  </View>
                ) : null}
              </View>
            ) : !usesHeroBeforeButtons ? (
              <View style={styles.ringBlock}>
                <SessionProgressRing
                  size={RING_SIZE}
                  strokeWidth={RING_STROKE}
                  progress={progress}
                  trackColor={ringTrack}
                  accentColor={PRIMARY}
                />
                <View style={styles.ringCenter} pointerEvents="none">
                  <ThemedText style={[styles.timeLarge, { color: text }]}>
                    {formatClock(remainingSec)}
                  </ThemedText>
                  <ThemedText style={[styles.timeHint, { color: muted }]}>
                    {isWaitingToStart ? '대기+실행 남은 시간' : '남은 시간'}
                  </ThemedText>
                  {isWaitingToStart ? (
                    <View style={[styles.pauseBadge, { backgroundColor: chipSoftBg }]}>
                      <ThemedText style={[styles.pauseBadgeText, { color: PRIMARY }]}>
                        시작까지 {formatClock(waitRemainingSec)}
                      </ThemedText>
                    </View>
                  ) : null}
                  {isPaused ? (
                    <View style={[styles.pauseBadge, { backgroundColor: chipSoftBg }]}>
                      <ThemedText style={[styles.pauseBadgeText, { color: PRIMARY }]}>
                        일시정지됨
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
              onPress={navigateAfterComplete}>
              <IconSymbol name="stop.fill" size={20} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>활동 종료</ThemedText>
            </Pressable>

            <View style={styles.secondaryRow}>
              {!isQuickMemoSession ? (
                <Pressable
                  accessibilityRole="button"
                  style={[
                    styles.secondaryBtn,
                    { borderColor: border, backgroundColor: surface },
                    isWaitingToStart && { opacity: 0.5 },
                  ]}
                  disabled={isWaitingToStart}
                  onPress={togglePause}>
                  <IconSymbol
                    name={isPaused ? 'play.fill' : 'pause.fill'}
                    size={18}
                    color={text}
                  />
                  <ThemedText style={[styles.secondaryBtnText, { color: text }]}>
                    {isPaused ? '계속하기' : '일시정지'}
                  </ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.secondaryBtn,
                  { borderColor: border, backgroundColor: surface },
                ]}
                onPress={navigateAfterSkip}>
                <IconSymbol name="forward.fill" size={18} color={muted} />
                <ThemedText style={[styles.secondaryBtnText, { color: muted }]}>건너뛰기</ThemedText>
              </Pressable>
            </View>
          </View>

          <ActiveSessionCard
            {...sessionCardProps}
            segment={usesHeroBeforeButtons ? 'checklistOnly' : 'full'}
          />

          {nextBlock ? (
            <View style={[styles.nextCard, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText style={[styles.nextKicker, { color: muted }]}>다음 단계</ThemedText>
              <View style={styles.nextRow}>
                <View style={[styles.nextIconWrap, { backgroundColor: chipSoftBg }]}>
                  <IconSymbol name="bolt.fill" size={22} color={PRIMARY} />
                </View>
                <View style={styles.nextTextCol}>
                  <ThemedText style={[styles.nextTitle, { color: text }]}>{nextBlock.title}</ThemedText>
                  <ThemedText style={[styles.nextMeta, { color: PRIMARY }]}>
                    {formatBlockTimeRange(nextBlock)}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={muted} />
              </View>
            </View>
          ) : (
            <View style={[styles.nextCard, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText style={[styles.nextKicker, { color: muted }]}>다음 단계</ThemedText>
              <ThemedText style={[styles.nextEmpty, { color: muted }]}>오늘 남은 일정이 없습니다</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    marginTop: 2,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryChip: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subMeta: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 16,
    flexGrow: 1,
  },
  bodyMain: {
    gap: 18,
    paddingBottom: 4,
  },
  memoBlock: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 12,
  },
  memoLine: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  ringBlock: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RING_STROKE * 2,
  },
  timeLarge: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timeHint: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  pauseBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pauseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
  nextCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  nextKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTextCol: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  nextMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  nextEmpty: {
    fontSize: 14,
    fontWeight: '600',
  },
});

/* ── Full-screen work session (작업) ── */
const WORK_BG = '#020617';

const workStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WORK_BG,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    alignItems: 'center',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },

  anchorOuter: {
    position: 'relative',
    width: 240,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 8,
  },
  motionLines: {
    position: 'absolute',
    right: -20,
    top: '50%',
    gap: 8,
    opacity: 0.2,
    transform: [{ translateY: -20 }],
  },
  motionLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgb(251, 146, 60)',
  },

  timerBlock: {
    alignItems: 'center',
    marginBottom: 52,
    width: '100%',
  },
  timerHMS: {
    color: '#fff',
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    textShadowColor: 'rgba(255,255,255,0.12)',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
    marginBottom: 16,
    textAlign: 'center',
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  focusKicker: {
    color: PRIMARY,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  planHint: {
    marginTop: 12,
    color: 'rgba(148,163,184,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  checklistSection: {
    width: '100%',
    marginBottom: 36,
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  checklistTitle: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 12,
  },
  checklistRemain: {
    color: 'rgba(148,163,184,0.95)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  checklistList: {
    gap: 12,
    width: '100%',
  },
  glassPanel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  checklistItemCurrent: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  checklistItemTextCol: {
    flex: 1,
    marginRight: 14,
    gap: 4,
  },
  checklistItemTitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  checklistItemTitleDone: {
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'line-through',
  },
  checklistItemTitleSkip: {
    color: 'rgba(255,255,255,0.35)',
  },
  checklistItemMeta: {
    color: 'rgba(148,163,184,0.95)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  checkBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistEmpty: {
    padding: 22,
    alignItems: 'center',
  },
  checklistEmptyText: {
    color: 'rgba(148,163,184,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginTop: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnPrimary: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: PRIMARY,
    shadowColor: '#7c2d12',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/* ── Full-screen reading session (독서) ── */
const READING_BG = '#09090b';

const readStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: READING_BG,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'flex-start',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },

  bookIconWrap: {
    marginBottom: 40,
    alignItems: 'center',
  },
  bookCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.20)',
    shadowColor: READING_EMERALD,
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },

  infoBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
    gap: 24,
  },
  bookKicker: {
    color: 'rgba(52,211,153,0.60)',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bookTitle: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rangeBlock: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  rangeLabel: {
    color: 'rgb(113, 113, 122)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  rangeValue: {
    color: READING_EMERALD_TEXT,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
  },

  timerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 36,
    gap: 10,
  },
  timerHMS: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    textAlign: 'center',
  },
  readingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pulseDotReading: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: READING_EMERALD,
  },
  readingStatusText: {
    color: READING_EMERALD_TEXT,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginTop: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnPrimaryReading: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: READING_EMERALD,
    shadowColor: '#064e3b',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnPrimaryReadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/* ── Full-screen fasting session (단식) ── */
const FAST_BG = '#09090b';

const fastStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: FAST_BG,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 48,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },

  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ringIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenterIcon: {
    padding: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  timerBlock: {
    alignItems: 'center',
    marginBottom: 36,
    width: '100%',
  },
  timerHMS: {
    color: '#fff',
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  timerCaption: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },

  cards: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrapPrimary: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  cardTextCol: {
    flex: 1,
    gap: 4,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  cardValue: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  cardValuePrimary: {
    color: PRIMARY,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    marginTop: 8,
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnPrimaryFast: {
    flex: 1,
    height: 56,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff7b04',
    shadowColor: '#7c2d12',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnPrimaryFastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/* ── Full-screen medicine session (약 복용) ── */
const medStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    color: 'rgba(255,255,255,0.96)',
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '800',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timerMeridiem: {
    color: 'rgba(148,163,184,0.9)',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '300',
  },
  timerCaption: {
    marginTop: 6,
    color: MED_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.8,
  },
  mainCard: {
    width: '100%',
    borderRadius: 16,
    padding: 1,
    backgroundColor: 'rgba(36, 38, 46, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
  },
  cardGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  cardInner: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(28, 30, 38, 0.72)',
  },
  pillCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MED_PRIMARY,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  badgeText: {
    color: '#ff8a4c',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  title: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(166, 173, 189, 0.95)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(50, 54, 67, 0.78)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: MED_PRIMARY_DIM,
  },
  scheduleSection: {
    width: '100%',
    marginTop: 30,
  },
  scheduleHeading: {
    color: 'rgba(156,163,175,0.95)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  scheduleList: {
    gap: 10,
  },
  scheduleCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(38, 42, 54, 0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: MED_PRIMARY,
    backgroundColor: 'rgba(52, 56, 70, 0.62)',
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleLeftMuted: {
    opacity: 0.62,
  },
  scheduleTime: {
    color: 'rgba(156,163,175,0.95)',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    width: 58,
  },
  scheduleTimeActive: {
    color: MED_PRIMARY,
  },
  scheduleTitle: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  scheduleMeta: {
    marginTop: 2,
    color: 'rgba(156,163,175,0.95)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  btnGhost: {
    flex: 1,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  btnGhostText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  btnPrimary: {
    flex: 1.5,
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MED_PRIMARY,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
});

/* ── Full-screen water session styles ── */
const waterStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WATER_SESSION_BG,
  },
  safe: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    alignItems: 'center',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  anchorOuter: {
    position: 'relative',
    width: 260,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    marginTop: 4,
  },
  anchorGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(34, 211, 238, 0.18)',
  },
  anchorWrap: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRow: {
    position: 'absolute',
    right: -8,
    top: '46%',
    gap: 8,
    opacity: 0.35,
  },
  ripple: {
    height: 4,
    borderRadius: 2,
    backgroundColor: WATER_CYAN,
  },
  timerBlock: {
    alignItems: 'center',
    marginBottom: 28,
    width: '100%',
  },
  timerKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timerHms: {
    fontSize: 64,
    lineHeight: 70,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  flowCaption: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  grid: {
    width: '100%',
    gap: 12,
  },
  glass: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.18)',
    borderRadius: 14,
  },
  mainStatCard: {
    padding: 20,
    width: '100%',
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 6,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  goalValue: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  goalUnit: {
    fontSize: 18,
    fontWeight: '700',
  },
  metaLine: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  hydrateTrack: {
    marginTop: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  hydrateFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: WATER_CYAN,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  halfCard: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 18,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    gap: 6,
    minHeight: 128,
    overflow: 'visible',
  },
  halfLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  halfValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    /** Android 기본 폰트 패딩으로 하단이 잘리는 현상 완화 */
    includeFontPadding: false,
  },
  halfUnit: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 0,
  },
  addSection: {
    width: '100%',
    marginTop: 8,
    paddingTop: 18,
    gap: 10,
  },
  addSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  addSectionHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  addChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  addChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  addChipPressed: {
    backgroundColor: 'rgba(34, 211, 238, 0.22)',
  },
  addChipDisabled: {
    opacity: 0.42,
  },
  addChipText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  stopBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: WATER_CYAN,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WATER_CYAN,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
});
