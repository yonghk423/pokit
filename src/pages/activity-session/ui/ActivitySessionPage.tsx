import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  blockDurationSec,
  emptyCategorySessionConfigs,
  filterDayPlanFlowBlocks,
  formatBlockTimeRange,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  getNextPendingAfter,
  isCustomFlowCategoryKey,
  isGoalDetailChecklistStyleCategoryKey,
  isOvernightPriorityWindow,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeMeditationDetailConfig,
  normalizeOtherDetailConfig,
  deriveReadingProgress,
  normalizeReadingLiveActivityConfig,
  readingDisplayTitle,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  normalizeYogaDetailConfig,
  parseHHmmToMinutes,
  parseNumberedFlowLines,
  resolveBlockCategoryKey,
  toRuntimeTiming,
  useDayPlanDraftStore,
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
import { CategoryImmersionTheme } from '@shared/config/categoryImmersionTheme';
import { GoalDetailSessionUi } from '@shared/config/goalDetailSessionUi';
import {
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { formatDurationMinKo } from '@widgets/active-session-card/ui/sessionCardShared';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';

import {
  ImmersionBottomControls,
  ImmersionCardShell,
  ImmersionHalfCard,
  ImmersionSplitRow,
  SessionImmersionLayout,
} from './SessionImmersionLayout';

const PRIMARY = 'rgb(0, 0, 0)';
/** 수분섭취 풀스크린 세션 */
const WATER_SESSION_BG = CategoryImmersionTheme.water.screenBg;
const WATER_CYAN = '#22d3ee';
/** 독서 진행 막대·요약 포인트 — ReadingSettings 와 동일 */
const READING_EMERALD = GoalDetailSessionUi.readingAccent;
const RING_SIZE = 232;
const RING_STROKE = 14;
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

/** 목표 상세에 저장된 아침·점심·저녁(켜진 슬롯만, 순서 고정) */
function buildMedicineEnabledSlots(medCfg: {
  morningOn: boolean;
  lunchOn: boolean;
  dinnerOn: boolean;
  morningTime: string;
  lunchTime: string;
  dinnerTime: string;
}): Array<{ key: string; labelKo: string; timeRaw: string; minutes: number }> {
  const out: Array<{ key: string; labelKo: string; timeRaw: string; minutes: number }> = [];
  const add = (key: string, labelKo: string, timeRaw: string) => {
    const m = parseHHmmToMinutes(timeRaw);
    const minutes = m != null ? m : 0;
    out.push({ key, labelKo, timeRaw, minutes });
  };
  if (medCfg.morningOn) add('m', '아침', medCfg.morningTime);
  if (medCfg.lunchOn) add('l', '점심', medCfg.lunchTime);
  if (medCfg.dinnerOn) add('d', '저녁', medCfg.dinnerTime);
  return out;
}

export function ActivitySessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ blockId?: string; liveAction?: string }>();
  const blockId = pickParam(params.blockId, '');
  const liveAction = pickParam(params.liveAction, '');

  const { dateKey, blocks, completedBlockIds, skippedBlockIds, completeBlock } = useDayPlanStore(
    useShallow((s) => ({
      dateKey: s.dateKey,
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      skippedBlockIds: s.skippedBlockIds,
      completeBlock: s.completeBlock,
    })),
  );

  const block = useMemo(
    () => (blockId ? blocks.find((b) => b.id === blockId) : undefined),
    [blocks, blockId],
  );
  const runtimeTiming = useDayPlanRuntimeStore((s) => (blockId ? s.timelineByBlockId[blockId] : undefined));
  const fallbackRuntimeTiming = useMemo(() => {
    if (!block) return undefined;
    return toRuntimeTiming(dateKey, block) ?? undefined;
  }, [block, dateKey]);
  const startTicker = useDayPlanRuntimeStore((s) => s.startTicker);
  const stopTicker = useDayPlanRuntimeStore((s) => s.stopTicker);
  const setActiveBlockId = useDayPlanRuntimeStore((s) => s.setActiveBlockId);
  const setLiveActivityChecklistFocusBlockId = useDayPlanStore((s) => s.setLiveActivityChecklistFocusBlockId);

  const totalSec = block ? blockDurationSec(block) : 0;
  const startAtMs = runtimeTiming?.startAtMs ?? fallbackRuntimeTiming?.startAtMs ?? null;
  const endAtMs = runtimeTiming?.endAtMs ?? fallbackRuntimeTiming?.endAtMs ?? null;

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
  /** 목표 상세 저장 후 동일 categoryKey로 useMemo가 갱신되도록 함 */
  const [goalDetailStorageTick, setGoalDetailStorageTick] = useState(0);
  const autoFinishTriggeredRef = useRef(false);
  const handledLiveActionRef = useRef<string | null>(null);

  const insets = useSafeAreaInsets();

  const activityTitle = block?.title ?? '';
  const rawCategoryLabel = block?.category ?? '';
  const categoryLabel = rawCategoryLabel === '사용쟈' ? '사용자' : rawCategoryLabel;
  const categoryKey =
    block != null
      ? resolveBlockCategoryKey({ category: categoryLabel, categoryKey: block.categoryKey }) ?? 'other'
      : 'other';
  const timeRange = block ? formatBlockTimeRange(block) : '';
  const isQuickMemoSession = block?.blockOrigin === 'quickMemo';

  useFocusEffect(
    useCallback(() => {
      registerOtherCategoryResolverFromStorage();
      setGoalDetailStorageTick((n) => n + 1);
    }, []),
  );

  const categoryConfigs = useMemo(() => {
    const base = emptyCategorySessionConfigs();
    if (!categoryKey) return base;
    const raw =
      block?.id != null
        ? loadGoalDetailBlockConfig(block.id) ?? loadGoalDetailCategoryConfig(categoryKey)
        : loadGoalDetailCategoryConfig(categoryKey);
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
        if (isGoalDetailChecklistStyleCategoryKey(categoryKey) || isCustomFlowCategoryKey(categoryKey)) {
          return { ...base, other: normalizeOtherDetailConfig(raw ?? {}) };
        }
        return base;
    }
  }, [categoryKey, block?.id, goalDetailStorageTick]);

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
      if (
        !block ||
        categoryKey !== 'water' ||
        !categoryConfigs.water ||
        deltaMl <= 0
      ) {
        return;
      }
      const source = categoryConfigs.water;
      setWaterSessionDrankMl((prev) => {
        const base = prev ?? source.drankMl;
        const next = Math.max(0, Math.min(source.goalMl, base + deltaMl));
        const payload = normalizeWaterDetailConfig({ ...source, drankMl: next });
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
    void rescheduleDayPlanNotifications();
    const next = getNextPendingAfter(
      filterDayPlanFlowBlocks(s.blocks),
      block.id,
      s.completedBlockIds,
      s.skippedBlockIds,
    );
    if (next) {
      router.replace({ pathname: '/activity-session', params: { blockId: next.id } });
    } else {
      void endLockFlowLiveActivity(block.id);
      safeRouterBack(router);
    }
  }, [block, completeBlock, router]);

  /** 약 복용 기록 증감(체크/취소) — 저장소 반영 */
  const updateMedicineTakenCount = useCallback(
    (delta: 1 | -1) => {
      if (!block || !categoryConfigs.medicine || isWaitingToStart) return;
      const source = categoryConfigs.medicine;
      const totalDoses = buildMedicineEnabledSlots(source).length;
      if (totalDoses === 0) return;
      const nextTaken = Math.max(0, Math.min(totalDoses, source.takenCount + delta));
      if (nextTaken === source.takenCount) return;
      const payload = normalizeMedicineDetailConfig({ ...source, takenCount: nextTaken });
      saveGoalDetailCategoryConfig('medicine', payload);
      saveGoalDetailBlockConfig(block.id, payload);
      setGoalDetailStorageTick((n) => n + 1);
    },
    [block, categoryConfigs.medicine, isWaitingToStart],
  );

  const onMedicineDoseCheck = useCallback(() => {
    updateMedicineTakenCount(1);
  }, [updateMedicineTakenCount]);

  const onMedicineDoseUndo = useCallback(() => {
    updateMedicineTakenCount(-1);
  }, [updateMedicineTakenCount]);

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
      if (blockId) void endLockFlowLiveActivity(blockId);
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

  /** 전체 루틴 시간(priorityEnd) 만료 시 현재 세션도 강제 종료 */
  useEffect(() => {
    if (!block || block.blockOrigin === 'quickMemo') return;

    const check = () => {
      const draft = useDayPlanDraftStore.getState();
      if (draft.planMode !== 'priority') return false;
      const ps = parseHHmmToMinutes(draft.priorityStart);
      const pe = parseHHmmToMinutes(draft.priorityEnd);
      if (ps === null || pe === null) return false;

      const rangeLo =
        draft.priorityPlanDateKey <= draft.priorityPlanDateKeyEnd
          ? draft.priorityPlanDateKey
          : draft.priorityPlanDateKeyEnd;
      const rangeHi =
        draft.priorityPlanDateKey <= draft.priorityPlanDateKeyEnd
          ? draft.priorityPlanDateKeyEnd
          : draft.priorityPlanDateKey;
      const nowKey = getLocalDateKey();
      const nowMin = getLocalMinutesOfDayNow();
      const inRange = nowKey >= rangeLo && nowKey <= rangeHi;
      if (!inRange) return false;

      const overnight = isOvernightPriorityWindow(draft.priorityStart, draft.priorityEnd);
      if (!overnight) return nowMin >= pe;
      if (nowKey === rangeLo) return false;
      if (nowKey === rangeHi) return nowMin >= pe;
      return false;
    };

    if (check()) {
      navigateAfterComplete();
      return;
    }

    const id = setInterval(() => {
      if (check()) {
        clearInterval(id);
        navigateAfterComplete();
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [block, navigateAfterComplete]);

  if (!block) {
    return null;
  }

  /** 카테고리별 시간 카운팅 전용 UI는 제거하고 공통 세션 UI만 사용 */
  const enableCategoryTimedUi = false;

  // ── Full-screen work session ──
  if (enableCategoryTimedUi && categoryKey === 'work' && !isQuickMemoSession && categoryConfigs.work) {
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

    const WK = CategoryImmersionTheme.work;
    const planProg = workCfg.planMin > 0 ? Math.min(1, workCfg.doneMin / workCfg.planMin) : 0;
    const planTrack01 = Math.max(planProg, progress);

    return (
      <SessionImmersionLayout
        backgroundColor={WK.screenBg}
        accentColor={WK.accent}
        accentGlow="rgba(0, 0, 0, 0.07)"
        onSurface={WK.onSurface}
        muted={WK.muted}
        brand={WK.brand}
        aboutKicker={WK.aboutKicker}
        headerTitle={isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : '작업 집중'}
        iconName="bag.fill"
        iconSize={28}
        sessionKicker="작업 세션"
        timerDisplay={
          <ThemedText
            style={waterStyles.timerHms}
            lightColor={WK.onSurface}
            darkColor={WK.onSurface}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.35}>
            {formatClock(timerSec)}
          </ThemedText>
        }
        flowCaption={activityTitle.trim() || '오늘 할 일에 집중해요'}
        onBack={() => safeRouterBack(router)}
        scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
        bottomBar={
          <ImmersionBottomControls
            accentColor={WK.accent}
            borderColor={WK.border}
            paddingBottom={Math.max(insets.bottom, 14)}
            onEndSession={navigateAfterComplete}
            completeLabel="작업 완료"
          />
        }>
            <ImmersionCardShell borderColor={WK.border}>
              <ThemedText style={waterStyles.statLabel} lightColor={WK.muted} darkColor={WK.muted}>
                집중 플랜
              </ThemedText>
              <View style={waterStyles.goalRow}>
                <ThemedText style={waterStyles.goalValue} lightColor={WK.onSurface} darkColor={WK.onSurface}>
                  {String(workCfg.planMin)}
                </ThemedText>
                <ThemedText style={waterStyles.goalUnit} lightColor={WK.muted} darkColor={WK.muted}>
                  분
                </ThemedText>
              </View>
              <ThemedText style={waterStyles.metaLine} lightColor={WK.muted} darkColor={WK.muted}>
                기록 {workCfg.doneMin}분 · 세션 {Math.round(progress * 100)}%
              </ThemedText>
              <View style={waterStyles.hydrateTrack}>
                <View
                  style={[
                    waterStyles.hydrateFill,
                    { width: `${Math.round(planTrack01 * 100)}%`, backgroundColor: WK.accent, opacity: 0.35 },
                  ]}
                />
              </View>
            </ImmersionCardShell>

            <ImmersionSplitRow>
              <ImmersionHalfCard borderColor={WK.border}>
                <ThemedText style={waterStyles.halfLabel} lightColor={WK.muted} darkColor={WK.muted}>
                  기록 진행
                </ThemedText>
                <ThemedText style={waterStyles.halfValue} lightColor={WK.onSurface} darkColor={WK.onSurface}>
                  {String(workCfg.doneMin)}
                </ThemedText>
                <ThemedText style={waterStyles.halfUnit} lightColor={WK.muted} darkColor={WK.muted}>
                  분
                </ThemedText>
              </ImmersionHalfCard>
              <ImmersionHalfCard borderColor={WK.border}>
                <ThemedText style={waterStyles.halfLabel} lightColor={WK.muted} darkColor={WK.muted}>
                  플로우 진행
                </ThemedText>
                <ThemedText style={waterStyles.halfValue} lightColor={WK.onSurface} darkColor={WK.onSurface}>
                  {String(Math.round(progress * 100))}
                </ThemedText>
                <ThemedText style={waterStyles.halfUnit} lightColor={WK.muted} darkColor={WK.muted}>
                  %
                </ThemedText>
              </ImmersionHalfCard>
            </ImmersionSplitRow>

            <View style={workStyles.checklistSection}>
              <View style={workStyles.checklistHeaderRow}>
                <ThemedText
                  style={workStyles.checklistTitle}
                  lightColor={CategoryImmersionTheme.work.onSurface}
                  darkColor={CategoryImmersionTheme.work.onSurface}>
                  해야 할 작업 리스트
                </ThemedText>
                <ThemedText
                  style={workStyles.checklistRemain}
                  lightColor={CategoryImmersionTheme.work.muted}
                  darkColor={CategoryImmersionTheme.work.muted}>
                  남은 {workRemainingCount}개
                </ThemedText>
              </View>
              <View style={workStyles.checklistList}>
                {workRows.length === 0 ? (
                  <View style={[workStyles.glassPanel, workStyles.checklistEmpty]}>
                    <ThemedText
                      style={workStyles.checklistEmptyText}
                      lightColor={CategoryImmersionTheme.work.muted}
                      darkColor={CategoryImmersionTheme.work.muted}>
                      표시할 플로우가 없습니다
                    </ThemedText>
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
                            lightColor={CategoryImmersionTheme.work.onSurface}
                            darkColor={CategoryImmersionTheme.work.onSurface}
                            numberOfLines={2}>
                            {row.title}
                          </ThemedText>
                          {row.timeLabel ? (
                            <ThemedText
                              style={workStyles.checklistItemMeta}
                              lightColor={CategoryImmersionTheme.work.muted}
                              darkColor={CategoryImmersionTheme.work.muted}
                              numberOfLines={1}>
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
                                  ? 'rgba(0,0,0,0.12)'
                                  : 'rgba(0,0,0,0.22)'
                            }
                          />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
      </SessionImmersionLayout>
    );
  }

  // ── Full-screen reading session (독서) ──
  if (enableCategoryTimedUi && categoryKey === 'reading' && !isQuickMemoSession && categoryConfigs.reading) {
    const readingCfg = categoryConfigs.reading;
    const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
    const bookTitle = readingDisplayTitle(activityTitle, readingCfg);
    const pageRange = `${readingCfg.startPage}P ~ ${readingCfg.targetPage}P`;
    const { pagesRead: pagesToRead, progressPct: readingProgressPct } = deriveReadingProgress(readingCfg);
    const R = CategoryImmersionTheme.reading;
    const readTrack01 = Math.max(progress, Math.min(1, Math.max(0, readingProgressPct) / 100));

    return (
      <SessionImmersionLayout
        backgroundColor={R.screenBg}
        accentColor={PRIMARY}
        accentGlow="rgba(0, 0, 0, 0.08)"
        onSurface={R.onSurface}
        muted={R.muted}
        brand={R.brand}
        aboutKicker={R.aboutKicker}
        headerTitle={isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : '독서 집중'}
        iconName="book.fill"
        iconSize={28}
        sessionKicker="독서 세션"
        timerDisplay={
          <ThemedText
            style={waterStyles.timerHms}
            lightColor={R.onSurface}
            darkColor={R.onSurface}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.35}>
            {formatClock(timerSec)}
          </ThemedText>
        }
        flowCaption={activityTitle.trim() || '독서'}
        onBack={() => safeRouterBack(router)}
        scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
        bottomBar={
          <ImmersionBottomControls
            accentColor={PRIMARY}
            borderColor={R.border}
            paddingBottom={Math.max(insets.bottom, 14)}
            onEndSession={navigateAfterComplete}
            completeLabel="독서 완료"
          />
        }>
        <ImmersionCardShell borderColor={R.border}>
          <ThemedText style={waterStyles.statLabel} lightColor={R.muted} darkColor={R.muted}>
            오늘 읽기 구간
          </ThemedText>
          <View style={waterStyles.goalRow}>
            <ThemedText style={waterStyles.goalValue} lightColor={R.onSurface} darkColor={R.onSurface}>
              {pageRange}
            </ThemedText>
          </View>
          <ThemedText style={waterStyles.metaLine} lightColor={R.muted} darkColor={R.muted} numberOfLines={2}>
            {bookTitle}
          </ThemedText>
          <View style={waterStyles.hydrateTrack}>
            <View
              style={[
                waterStyles.hydrateFill,
                {
                  width: `${Math.round(readTrack01 * 100)}%`,
                  backgroundColor: READING_EMERALD,
                  opacity: 0.45,
                },
              ]}
            />
          </View>
        </ImmersionCardShell>

        <ImmersionSplitRow>
          <ImmersionHalfCard borderColor={R.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={R.muted} darkColor={R.muted}>
              시작 페이지
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={R.onSurface} darkColor={R.onSurface}>
              {String(readingCfg.startPage)}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={R.muted} darkColor={R.muted}>
              p
            </ThemedText>
          </ImmersionHalfCard>
          <ImmersionHalfCard borderColor={R.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={R.muted} darkColor={R.muted}>
              읽을 분량
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={R.accent} darkColor={R.accent}>
              {String(pagesToRead)}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={R.muted} darkColor={R.muted}>
              p
            </ThemedText>
          </ImmersionHalfCard>
        </ImmersionSplitRow>

        <ImmersionSplitRow>
          <ImmersionHalfCard borderColor={R.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={R.muted} darkColor={R.muted}>
              목표 페이지
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={R.onSurface} darkColor={R.onSurface}>
              {String(readingCfg.targetPage)}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={R.muted} darkColor={R.muted}>
              p
            </ThemedText>
          </ImmersionHalfCard>
          <ImmersionHalfCard borderColor={R.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={R.muted} darkColor={R.muted}>
              플로우 진행
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={R.onSurface} darkColor={R.onSurface}>
              {String(Math.round(progress * 100))}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={R.muted} darkColor={R.muted}>
              %
            </ThemedText>
          </ImmersionHalfCard>
        </ImmersionSplitRow>
      </SessionImmersionLayout>
    );
  }

  // ── Full-screen 체중관리 세션 (단식 타이머) ──
  if (enableCategoryTimedUi && categoryKey === 'fasting' && !isQuickMemoSession && categoryConfigs.fasting) {
    const fastingCfg = categoryConfigs.fasting;
    const elapsedSec = isWaitingToStart ? 0 : Math.max(0, totalSec - remainingSec);
    const goalSec = Math.max(60, fastingCfg.fastingMin * 60);
    const fastProgress = Math.min(1, elapsedSec / goalSec);
    const F = CategoryImmersionTheme.fasting;

    return (
      <SessionImmersionLayout
        backgroundColor={F.screenBg}
        accentColor={PRIMARY}
        accentGlow="rgba(0, 0, 0, 0.08)"
        onSurface={F.onSurface}
        muted={F.muted}
        brand={F.brand}
        aboutKicker={F.aboutKicker}
        headerTitle={isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : '체중관리'}
        iconName="hourglass"
        iconSize={28}
        sessionKicker="단식 · 집중"
        timerDisplay={
          <ThemedText
            style={waterStyles.timerHms}
            lightColor={F.onSurface}
            darkColor={F.onSurface}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.35}>
            {formatClockHMS(elapsedSec)}
          </ThemedText>
        }
        flowCaption={activityTitle.trim() ? activityTitle : '목표까지 타이머로 맞춰요'}
        onBack={() => safeRouterBack(router)}
        scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
        bottomBar={
          <ImmersionBottomControls
            accentColor={PRIMARY}
            borderColor={F.border}
            paddingBottom={Math.max(insets.bottom, 14)}
            onEndSession={navigateAfterComplete}
            completeLabel="단식 완료"
          />
        }>
        <ImmersionCardShell borderColor={F.border}>
          <ThemedText style={waterStyles.statLabel} lightColor={F.muted} darkColor={F.muted}>
            단식 목표
          </ThemedText>
          <View style={waterStyles.goalRow}>
            <ThemedText style={waterStyles.goalValue} lightColor={F.onSurface} darkColor={F.onSurface}>
              {formatDurationMinKo(fastingCfg.fastingMin)}
            </ThemedText>
          </View>
          <ThemedText style={waterStyles.metaLine} lightColor={F.muted} darkColor={F.muted}>
            {elapsedSec < 60
              ? '방금 시작 · 목표까지 타이머를 따라가요'
              : `${formatDurationMinKo(Math.floor(elapsedSec / 60))} 경과 · ${fastingGoalLabelKo(fastingCfg.fastingMin)}`}
          </ThemedText>
          <View style={waterStyles.hydrateTrack}>
            <View
              style={[
                waterStyles.hydrateFill,
                {
                  width: `${Math.round(fastProgress * 100)}%`,
                  backgroundColor: PRIMARY,
                  opacity: 0.35,
                },
              ]}
            />
          </View>
        </ImmersionCardShell>

        <ImmersionSplitRow>
          <ImmersionHalfCard borderColor={F.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={F.muted} darkColor={F.muted}>
              현재 단계
            </ThemedText>
            <ThemedText
              style={[waterStyles.halfValue, { fontSize: 17, lineHeight: 22, fontWeight: '800' }]}
              lightColor={F.onSurface}
              darkColor={F.onSurface}
              numberOfLines={2}
              adjustsFontSizeToFit>
              {fastingStageLabelKo(fastProgress)}
            </ThemedText>
          </ImmersionHalfCard>
          <ImmersionHalfCard borderColor={F.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={F.muted} darkColor={F.muted}>
              진행도
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={F.onSurface} darkColor={F.onSurface}>
              {Math.round(fastProgress * 100)}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={F.muted} darkColor={F.muted}>
              %
            </ThemedText>
          </ImmersionHalfCard>
        </ImmersionSplitRow>
      </SessionImmersionLayout>
    );
  }

  // ── Full-screen medicine session (약 복용) ──
  if (enableCategoryTimedUi && categoryKey === 'medicine' && !isQuickMemoSession && categoryConfigs.medicine) {
    const medCfg = categoryConfigs.medicine;
    const enabledSlots = buildMedicineEnabledSlots(medCfg);
    const totalDoses = enabledSlots.length;
    const takenCount =
      totalDoses === 0 ? 0 : Math.max(0, Math.min(totalDoses, medCfg.takenCount));
    const progressWidth = (
      totalDoses === 0 ? '0%' : `${Math.max(8, Math.round((takenCount / totalDoses) * 100))}%`
    ) as `${number}%`;
    const currentSlotLabel =
      totalDoses === 0
        ? '슬롯 없음'
        : takenCount < totalDoses
          ? enabledSlots[takenCount]?.labelKo ?? '—'
          : '오늘 분량 완료';
    const scheduleRows = enabledSlots.map((slot, slotIndex) => {
      const clock = formatMeridiemClock(slot.minutes);
      const isDone = slotIndex < takenCount;
      const isCurrent = !isDone && slotIndex === takenCount;
      const isScheduled = slotIndex > takenCount;
      return {
        key: slot.key,
        hhmm: clock.hhmm,
        meridiem: clock.meridiem,
        title: `${slot.labelKo} 약 복용`,
        isDone,
        isCurrent,
        isScheduled,
        isActive: isCurrent,
        timeRaw: slot.timeRaw,
      };
    });
    /** 아직 복용하지 않은 일정 중, 지금 차례 이후(예정)만 */
    const upcomingNotTaken = enabledSlots.filter((_, i) => i > takenCount);
    const upcomingSummaryLine =
      upcomingNotTaken.length > 0
        ? upcomingNotTaken.map((s) => `${s.labelKo} ${s.timeRaw}`).join(' · ')
        : null;
    const headerClock = formatMeridiemClock(block.startMinutes);

    const M = CategoryImmersionTheme.medicine;

    return (
      <SessionImmersionLayout
        backgroundColor={M.screenBg}
        accentColor={PRIMARY}
        accentGlow="rgba(0, 0, 0, 0.08)"
        onSurface={M.onSurface}
        muted={M.muted}
        brand={M.brand}
        aboutKicker={M.aboutKicker}
        headerTitle={
          isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : activityTitle.trim() || '약 복용'
        }
        iconName="pills.fill"
        iconSize={28}
        sessionKicker="예약된 시간"
        timerDisplay={
          <ThemedText
            style={waterStyles.timerHms}
            lightColor={M.onSurface}
            darkColor={M.onSurface}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.35}>
            {headerClock.hhmm}
            <ThemedText
              style={{ fontSize: 26, lineHeight: 32, fontWeight: '600', letterSpacing: 0.5 }}
              lightColor={M.muted}
              darkColor={M.muted}>
              {` ${headerClock.meridiem}`}
            </ThemedText>
          </ThemedText>
        }
        flowCaption={`${medCfg.doseLabel.trim() || '약'} · ${
          totalDoses === 0 ? '목표 상세에서 슬롯을 추가해 주세요' : currentSlotLabel
        }`}
        onBack={() => safeRouterBack(router)}
        scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
        bottomBar={
          <ImmersionBottomControls
            accentColor={PRIMARY}
            borderColor={M.border}
            paddingBottom={Math.max(insets.bottom, 14)}
            onEndSession={navigateAfterComplete}
            completeLabel="복용 완료"
            disabled={isWaitingToStart}
          />
        }>
        <ImmersionCardShell borderColor={M.border}>
          <ThemedText style={waterStyles.statLabel} lightColor={M.muted} darkColor={M.muted}>
            오늘 복용
          </ThemedText>
          <View style={waterStyles.goalRow}>
            <ThemedText style={waterStyles.goalValue} lightColor={M.onSurface} darkColor={M.onSurface}>
              {takenCount}
            </ThemedText>
            <ThemedText style={waterStyles.goalUnit} lightColor={M.muted} darkColor={M.muted}>
              {` / ${totalDoses}회`}
            </ThemedText>
          </View>
          <ThemedText style={waterStyles.metaLine} lightColor={M.muted} darkColor={M.muted}>
            {medCfg.doseLabel.trim() || '약'} · 복용 시간입니다
          </ThemedText>
          <View style={waterStyles.hydrateTrack}>
            <View
              style={[
                waterStyles.hydrateFill,
                { width: progressWidth, backgroundColor: PRIMARY },
              ]}
            />
          </View>
        </ImmersionCardShell>

        <ImmersionSplitRow>
          <ImmersionHalfCard borderColor={M.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={M.muted} darkColor={M.muted}>
              현재 슬롯
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={M.onSurface} darkColor={M.onSurface}>
              {currentSlotLabel}
            </ThemedText>
          </ImmersionHalfCard>
          <ImmersionHalfCard borderColor={M.border}>
            <ThemedText style={waterStyles.halfLabel} lightColor={M.muted} darkColor={M.muted}>
              남은 복용
            </ThemedText>
            <ThemedText style={waterStyles.halfValue} lightColor={M.onSurface} darkColor={M.onSurface}>
              {Math.max(0, totalDoses - takenCount)}
            </ThemedText>
            <ThemedText style={waterStyles.halfUnit} lightColor={M.muted} darkColor={M.muted}>
              회
            </ThemedText>
          </ImmersionHalfCard>
        </ImmersionSplitRow>

        <ImmersionCardShell borderColor={M.border}>
          <ThemedText style={medScheduleStyles.scheduleHeading} lightColor={M.muted} darkColor={M.muted}>
            오늘의 일정
          </ThemedText>
          {upcomingSummaryLine ? (
            <ThemedText style={medScheduleStyles.scheduleUpcomingLine} lightColor={M.onSurface} darkColor={M.onSurface}>
              이후 예정 · {upcomingSummaryLine}
            </ThemedText>
          ) : null}
          <View style={medScheduleStyles.scheduleList}>
            {scheduleRows.length === 0 ? (
              <ThemedText style={medScheduleStyles.scheduleEmpty} lightColor={M.muted} darkColor={M.muted}>
                복용 슬롯이 없어요. 목표 상세 설정에서 아침·점심·저녁을 켜 주세요.
              </ThemedText>
            ) : null}
            {scheduleRows.map((row, rowIndex) => (
              <View
                key={row.key}
                style={[
                  medScheduleStyles.scheduleCard,
                  row.isCurrent && medScheduleStyles.scheduleCardActive,
                  row.isScheduled && medScheduleStyles.scheduleCardUpcoming,
                ]}>
                <View
                  style={[medScheduleStyles.scheduleLeft, row.isDone && medScheduleStyles.scheduleLeftMuted]}>
                  <View style={medScheduleStyles.scheduleTimeRow}>
                    <ThemedText
                      style={medScheduleStyles.scheduleTime}
                      lightColor={row.isCurrent ? PRIMARY : row.isScheduled ? M.onSurface : M.muted}
                      darkColor={row.isCurrent ? PRIMARY : row.isScheduled ? M.onSurface : M.muted}>
                      {row.hhmm}
                    </ThemedText>
                    <ThemedText
                      style={medScheduleStyles.scheduleMeridiem}
                      lightColor={row.isCurrent ? PRIMARY : M.muted}
                      darkColor={row.isCurrent ? PRIMARY : M.muted}>
                      {row.meridiem}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText
                      style={medScheduleStyles.scheduleTitle}
                      lightColor={M.onSurface}
                      darkColor={M.onSurface}>
                      {row.title}
                    </ThemedText>
                    <ThemedText
                      style={medScheduleStyles.scheduleMeta}
                      lightColor={M.muted}
                      darkColor={M.muted}>
                      {row.isDone ? '완료' : row.isCurrent ? '현재 복용' : '예정 · 아직 복용 전'}
                    </ThemedText>
                  </View>
                </View>
                {row.isDone ? (
                  rowIndex === takenCount - 1 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${row.title} 복용 체크 취소`}
                      disabled={isWaitingToStart}
                      onPress={onMedicineDoseUndo}
                      style={[
                        medScheduleStyles.scheduleUndoBtn,
                        isWaitingToStart && medScheduleStyles.scheduleCheckBtnDisabled,
                      ]}>
                      <IconSymbol name="arrow.uturn.backward" size={12} color={PRIMARY} />
                      <ThemedText style={medScheduleStyles.scheduleUndoBtnText}>취소</ThemedText>
                    </Pressable>
                  ) : (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={PRIMARY} />
                  )
                ) : row.isCurrent ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${row.title} 복용 체크`}
                    disabled={isWaitingToStart}
                    onPress={onMedicineDoseCheck}
                    style={[
                      medScheduleStyles.scheduleCheckBtn,
                      isWaitingToStart && medScheduleStyles.scheduleCheckBtnDisabled,
                    ]}>
                    <IconSymbol name="checkmark" size={13} color="#ffffff" />
                    <ThemedText style={medScheduleStyles.scheduleCheckBtnText}>복용 체크</ThemedText>
                  </Pressable>
                ) : (
                  <IconSymbol name="clock" size={20} color="rgba(0, 0, 0, 0.28)" />
                )}
              </View>
            ))}
          </View>
        </ImmersionCardShell>
      </SessionImmersionLayout>
    );
  }

  // ── Full-screen water session (수분섭취) ──
  if (enableCategoryTimedUi && categoryKey === 'water' && !isQuickMemoSession && categoryConfigs.water) {
    const wCfg = categoryConfigs.water;
    const drank = waterSessionDrankMl ?? wCfg.drankMl;
    const drinkProg = wCfg.goalMl > 0 ? Math.min(1, drank / wCfg.goalMl) : 0;
    const remainingMl = Math.max(0, wCfg.goalMl - drank);
    const goalL = (wCfg.goalMl / 1000).toFixed(1);
    const remL = (remainingMl / 1000).toFixed(1);
    const hydrateTrack = Math.max(drinkProg, progress);
    const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
    const addIntakeDisabled = isWaitingToStart || (wCfg.goalMl > 0 && drank >= wCfg.goalMl);

    const W = CategoryImmersionTheme.water;

    return (
      <SessionImmersionLayout
        backgroundColor={W.screenBg}
        accentColor={WATER_CYAN}
        accentGlow="rgba(34, 211, 238, 0.18)"
        onSurface={W.onSurface}
        muted={W.muted}
        brand={W.brand}
        aboutKicker={W.aboutKicker}
        headerTitle={isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : '수분섭취 집중'}
        iconName="drop.fill"
        iconSize={28}
        sessionKicker="수분섭취 세션"
        timerDisplay={
          <ThemedText
            style={waterStyles.timerHms}
            lightColor={W.onSurface}
            darkColor={W.onSurface}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.35}>
            {formatClock(timerSec)}
          </ThemedText>
        }
        flowCaption={activityTitle.trim() ? activityTitle : '오늘의 물 목표에 맞춰요'}
        onBack={() => safeRouterBack(router)}
        scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
        bottomBar={
          <ImmersionBottomControls
            accentColor={WATER_CYAN}
            borderColor={W.border}
            paddingBottom={Math.max(insets.bottom, 14)}
            onEndSession={navigateAfterComplete}
            completeLabel="수분 섭취 완료"
            completeForeground={GoalDetailSessionUi.waterCtaOnAccent}
          />
        }>
        <View style={waterStyles.grid}>
              <ImmersionCardShell borderColor={W.border}>
                <ThemedText
                  style={waterStyles.statLabel}
                  lightColor={W.muted}
                  darkColor={W.muted}>
                  하루 물 목표
                </ThemedText>
                <View style={waterStyles.goalRow}>
                  <ThemedText
                    style={waterStyles.goalValue}
                    lightColor={W.onSurface}
                    darkColor={W.onSurface}>
                    {goalL}
                  </ThemedText>
                  <ThemedText
                    style={waterStyles.goalUnit}
                    lightColor={W.muted}
                    darkColor={W.muted}>
                    L
                  </ThemedText>
                </View>
                <ThemedText
                  style={waterStyles.metaLine}
                  lightColor={W.muted}
                  darkColor={W.muted}>
                  {wCfg.goalMl}ml 기준 · 섭취 {drank}ml · 남은 {remL}L
                </ThemedText>
                <View style={waterStyles.hydrateTrack}>
                  <View style={[waterStyles.hydrateFill, { width: `${Math.round(hydrateTrack * 100)}%` }]} />
                </View>
              </ImmersionCardShell>

              <ImmersionSplitRow>
                <ImmersionHalfCard borderColor={W.border}>
                  <ThemedText
                    style={waterStyles.halfLabel}
                    lightColor={W.muted}
                    darkColor={W.muted}>
                    섭취량
                  </ThemedText>
                  <ThemedText
                    style={waterStyles.halfValue}
                    lightColor={W.onSurface}
                    darkColor={W.onSurface}>
                    {drank}
                  </ThemedText>
                  <ThemedText
                    style={waterStyles.halfUnit}
                    lightColor={W.muted}
                    darkColor={W.muted}>
                    ml
                  </ThemedText>
                </ImmersionHalfCard>
                <ImmersionHalfCard borderColor={W.border}>
                  <ThemedText
                    style={waterStyles.halfLabel}
                    lightColor={W.muted}
                    darkColor={W.muted}>
                    플로우 진행
                  </ThemedText>
                  <ThemedText
                    style={waterStyles.halfValue}
                    lightColor={W.onSurface}
                    darkColor={W.onSurface}>
                    {Math.round(progress * 100)}
                  </ThemedText>
                  <ThemedText
                    style={waterStyles.halfUnit}
                    lightColor={W.muted}
                    darkColor={W.muted}>
                    %
                  </ThemedText>
                </ImmersionHalfCard>
              </ImmersionSplitRow>

              <View style={waterStyles.addSection}>
                <ThemedText
                  style={waterStyles.addSectionTitle}
                  lightColor={CategoryImmersionTheme.water.onSurface}
                  darkColor={CategoryImmersionTheme.water.onSurface}>
                  섭취 추가
                </ThemedText>
                <ThemedText
                  style={waterStyles.addSectionHint}
                  lightColor={CategoryImmersionTheme.water.muted}
                  darkColor={CategoryImmersionTheme.water.muted}>
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
                        lightColor={addIntakeDisabled ? 'rgba(0,0,0,0.28)' : WATER_CYAN}
                        darkColor={addIntakeDisabled ? 'rgba(0,0,0,0.28)' : WATER_CYAN}>
                        +{ml}ml
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
        </View>
      </SessionImmersionLayout>
    );
  }

  const memoLines = parseNumberedFlowLines(block.title);
  const timerSec = isWaitingToStart ? waitRemainingSec : remainingSec;
  const O = CategoryImmersionTheme.other;
  const sessionTitle =
    categoryKey === 'meditation'
      ? '명상 집중'
      : categoryKey === 'yoga'
        ? '요가 집중'
        : activityTitle.trim() || '활동 집중';

  return (
    <SessionImmersionLayout
      backgroundColor={O.screenBg}
      accentColor={PRIMARY}
      accentGlow="rgba(0, 0, 0, 0.14)"
      onSurface={O.onSurface}
      muted={O.muted}
      brand={O.brand}
      aboutKicker={O.aboutKicker}
      headerTitle={isPaused ? '일시정지됨' : isWaitingToStart ? '시작 대기' : sessionTitle}
      iconName="star.fill"
      iconSize={28}
      sessionKicker={isQuickMemoSession ? '빠른 메모' : '세션'}
      timerDisplay={
        <ThemedText
          style={waterStyles.timerHms}
          lightColor={O.onSurface}
          darkColor={O.onSurface}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.35}>
          {isPaused ? '잠시 멈춤' : isWaitingToStart ? '시작 전' : '세션'}
        </ThemedText>
      }
      flowCaption={isQuickMemoSession ? '메모를 기반으로 흐름을 정리해요' : activityTitle}
      onBack={() => safeRouterBack(router)}
      scrollBottomPadding={Math.max(insets.bottom, 16) + 88}
      bottomBar={
        <ImmersionBottomControls
          accentColor={PRIMARY}
          borderColor={O.border}
          paddingBottom={Math.max(insets.bottom, 14)}
          onEndSession={navigateAfterComplete}
          completeLabel="활동 완료"
        />
      }>
      <ImmersionCardShell borderColor={O.border}>
        <ThemedText style={waterStyles.statLabel} lightColor={O.muted} darkColor={O.muted}>
          플로우 메모
        </ThemedText>
        <ThemedText style={[waterStyles.metaLine, { marginTop: 4 }]} lightColor={O.onSurface} darkColor={O.onSurface}>
          {checklist.checklistSummaryLine1 || '목표 상세에서 체크리스트 또는 메모를 입력해 주세요.'}
        </ThemedText>
        {checklist.checklistSummaryLine2 ? (
          <ThemedText style={waterStyles.metaLine} lightColor={O.muted} darkColor={O.muted}>
            {checklist.checklistSummaryLine2}
          </ThemedText>
        ) : null}
        {isQuickMemoSession && memoLines.length > 0 ? (
          <View style={{ marginTop: 12, gap: 6 }}>
            {memoLines.slice(0, 3).map((line, idx) => (
              <ThemedText key={`${idx}-${line.slice(0, 8)}`} style={waterStyles.addSectionHint} lightColor={O.onSurface} darkColor={O.onSurface}>
                {`• ${line}`}
              </ThemedText>
            ))}
          </View>
        ) : null}
      </ImmersionCardShell>

      <ImmersionSplitRow>
        <ImmersionHalfCard borderColor={O.border}>
          <ThemedText style={waterStyles.halfLabel} lightColor={O.muted} darkColor={O.muted}>
            완료
          </ThemedText>
          <ThemedText style={waterStyles.halfValue} lightColor={O.onSurface} darkColor={O.onSurface}>
            {checklist.checklistRows.filter((row) => row.state === 'completed').length}
          </ThemedText>
          <ThemedText style={waterStyles.halfUnit} lightColor={O.muted} darkColor={O.muted}>
            개
          </ThemedText>
        </ImmersionHalfCard>
        <ImmersionHalfCard borderColor={O.border}>
          <ThemedText style={waterStyles.halfLabel} lightColor={O.muted} darkColor={O.muted}>
            남은 작업
          </ThemedText>
          <ThemedText style={waterStyles.halfValue} lightColor={O.onSurface} darkColor={O.onSurface}>
            {checklist.checklistRows.filter((row) => row.state !== 'completed').length}
          </ThemedText>
          <ThemedText style={waterStyles.halfUnit} lightColor={O.muted} darkColor={O.muted}>
            개
          </ThemedText>
        </ImmersionHalfCard>
      </ImmersionSplitRow>

      <ImmersionCardShell borderColor={O.border}>
        <ThemedText style={waterStyles.statLabel} lightColor={O.muted} darkColor={O.muted}>
          오늘 플로우 목록
        </ThemedText>
        <View style={medScheduleStyles.scheduleList}>
          <View style={medScheduleStyles.scheduleCard}>
            <View style={medScheduleStyles.scheduleLeft}>
              <ThemedText style={medScheduleStyles.scheduleTime} lightColor={PRIMARY} darkColor={PRIMARY}>
                •
              </ThemedText>
              <View>
                <ThemedText style={medScheduleStyles.scheduleTitle} lightColor={O.onSurface} darkColor={O.onSurface}>
                  {activityTitle}
                </ThemedText>
                <ThemedText style={medScheduleStyles.scheduleMeta} lightColor={O.muted} darkColor={O.muted}>
                  {timeRange}
                </ThemedText>
              </View>
            </View>
          </View>
          {nextBlock ? (
            <View style={medScheduleStyles.scheduleCard}>
              <View style={medScheduleStyles.scheduleLeft}>
                <ThemedText style={medScheduleStyles.scheduleTime} lightColor={O.muted} darkColor={O.muted}>
                  •
                </ThemedText>
                <View>
                  <ThemedText style={medScheduleStyles.scheduleTitle} lightColor={O.onSurface} darkColor={O.onSurface}>
                    {nextBlock.title}
                  </ThemedText>
                  <ThemedText style={medScheduleStyles.scheduleMeta} lightColor={O.muted} darkColor={O.muted}>
                    {formatBlockTimeRange(nextBlock)}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </ImmersionCardShell>
    </SessionImmersionLayout>
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

/* ── Full-screen work session (작업) — WorkSettings 라이트 카드 톤 ── */
const WORK_BG = CategoryImmersionTheme.work.screenBg;

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
    color: CategoryImmersionTheme.work.onSurface,
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
    opacity: 0.35,
    transform: [{ translateY: -20 }],
  },
  motionLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  timerBlock: {
    alignItems: 'center',
    marginBottom: 52,
    width: '100%',
  },
  timerHMS: {
    color: CategoryImmersionTheme.work.onSurface,
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
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
    color: CategoryImmersionTheme.work.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  planHint: {
    marginTop: 12,
    color: CategoryImmersionTheme.work.muted,
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
    color: CategoryImmersionTheme.work.onSurface,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    flex: 1,
    marginRight: 12,
  },
  checklistRemain: {
    color: CategoryImmersionTheme.work.muted,
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
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.08)',
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
    borderColor: 'rgba(0,0,0,0.14)',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  checklistItemTextCol: {
    flex: 1,
    marginRight: 14,
    gap: 4,
  },
  checklistItemTitle: {
    color: CategoryImmersionTheme.work.onSurface,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  checklistItemTitleDone: {
    color: CategoryImmersionTheme.work.muted,
    textDecorationLine: 'line-through',
  },
  checklistItemTitleSkip: {
    color: 'rgba(0,0,0,0.35)',
  },
  checklistItemMeta: {
    color: CategoryImmersionTheme.work.muted,
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
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistEmpty: {
    padding: 22,
    alignItems: 'center',
  },
  checklistEmptyText: {
    color: CategoryImmersionTheme.work.muted,
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
    borderColor: CategoryImmersionTheme.work.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    color: CategoryImmersionTheme.work.onSurface,
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
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/* ── Full-screen reading session (독서) — 목표 상세(ReadingSettings) 라이트 에디토리얼 ── */
const READING_SCREEN_BG = CategoryImmersionTheme.reading.screenBg;

const readStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: READING_SCREEN_BG,
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
    color: CategoryImmersionTheme.reading.onSurface,
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
    paddingTop: 8,
    paddingBottom: 48,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    maxWidth: 448,
    width: '100%',
    alignSelf: 'center',
  },
  editorialHeader: {
    gap: 8,
    marginBottom: 8,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: CategoryImmersionTheme.reading.onSurface,
  },
  aboutKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: CategoryImmersionTheme.reading.muted,
  },
  listHeader: {
    gap: 6,
    paddingTop: 2,
    marginBottom: 8,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: CategoryImmersionTheme.reading.muted,
  },
  mainTitle: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -1.2,
    color: CategoryImmersionTheme.reading.onSurface,
  },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#000',
    borderBottomColor: CategoryImmersionTheme.reading.border,
    paddingVertical: 10,
    marginBottom: 28,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: CategoryImmersionTheme.reading.onSurface,
  },
  metricLabel: { fontSize: 11, fontWeight: '600', color: CategoryImmersionTheme.reading.muted },

  bookIconWrap: {
    marginBottom: 32,
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
    borderColor: 'rgba(16,185,129,0.22)',
    shadowColor: READING_EMERALD,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },

  infoBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    gap: 16,
  },
  bookKicker: {
    color: CategoryImmersionTheme.reading.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  bookTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  rangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    alignSelf: 'stretch',
    maxWidth: 360,
  },
  rangeCardText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  timerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 36,
    gap: 10,
  },
  timerHMS: {
    fontSize: 52,
    lineHeight: 58,
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
    borderColor: CategoryImmersionTheme.reading.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
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
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  btnPrimaryReadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

/** 약 복용 세션 — 일정 리스트만 전용 스타일 (쉘은 SessionImmersionLayout + waterStyles 토큰) */
const medScheduleStyles = StyleSheet.create({
  scheduleHeading: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scheduleUpcomingLine: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  scheduleEmpty: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingVertical: 8,
  },
  scheduleList: {
    gap: 10,
    width: '100%',
  },
  scheduleCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CategoryImmersionTheme.medicine.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  scheduleCardUpcoming: {
    borderColor: GoalDetailSessionUi.border,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
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
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    width: 86,
    flexShrink: 0,
  },
  scheduleTime: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scheduleMeridiem: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scheduleTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  scheduleMeta: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  scheduleCheckBtn: {
    minWidth: 78,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  scheduleCheckBtnDisabled: {
    opacity: 0.45,
  },
  scheduleCheckBtnText: {
    color: '#ffffff',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  scheduleUndoBtn: {
    minWidth: 62,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GoalDetailSessionUi.border,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  scheduleUndoBtnText: {
    color: PRIMARY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
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
  editorialHeader: {
    width: '100%',
    gap: 8,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: CategoryImmersionTheme.water.onSurface,
  },
  aboutKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: CategoryImmersionTheme.water.muted,
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
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CategoryImmersionTheme.water.border,
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
    backgroundColor: 'rgba(0,0,0,0.08)',
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CategoryImmersionTheme.water.border,
    backgroundColor: CategoryImmersionTheme.water.screenBg,
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
