import type { DayPlanBlock } from '@entities/day-plan';
import {
  filterDayPlanFlowBlocks,
  formatMinuteOfDayKo,
  blockDurationSec,
  formatBlockTimeRange,
  isPriorityCompoundBlockTitle,
  normalizeReadingLiveActivityConfig,
  parseNumberedFlowLines,
  resolveCategoryKeyFromLabel,
} from '@entities/day-plan';
import { useDayPlanRuntimeStore, useDayPlanStore } from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import type {
  LockFlowLiveActivityChecklistRow,
  LockFlowLiveActivityPayload,
  LockFlowLiveActivityStatus,
  PriorityLiveActivityContent,
  QuickMemoLiveActivityContent,
} from '../model/types';

function normalizeCategoryLabel(label: string): string {
  return label === '사용쟈' ? '사용자' : label;
}

function formatChecklistTime(minutes: number): string {
  const ko = formatMinuteOfDayKo(minutes);
  return ko.replace(/^오전\s*/, '').replace(/^오후\s*/, '');
}

export function buildLiveActivityChecklistRows(input: {
  focusBlockId: string;
  status: LockFlowLiveActivityStatus;
}): {
  checklistTitle: string;
  checklistCountLabel: string;
  checklistRows: LockFlowLiveActivityChecklistRow[];
  checklistSummaryLine1: string;
  checklistSummaryLine2: string;
} {
  const { focusBlockId, status } = input;
  const plan = useDayPlanStore.getState();
  const ordered = [...filterDayPlanFlowBlocks(plan.blocks)].sort((a, b) =>
    a.startMinutes !== b.startMinutes ? a.startMinutes - b.startMinutes : a.order - b.order,
  );

  const completed = new Set(plan.completedBlockIds);
  const skipped = new Set(plan.skippedBlockIds);

  const done = new Set<string>([...completed, ...skipped]);
  const remainingBlocks = ordered.filter((b) => !done.has(b.id));
  const completedCount = completed.size;
  const skippedCount = skipped.size;
  const remainingCount = remainingBlocks.length;

  const titleOneLine = (t: string) => (t ?? '').trim().split('\n')[0].trim();
  const topRemainingTitles = remainingBlocks
    .slice(0, 3)
    .map((b) => {
      const t = titleOneLine(b.title ?? '');
      return t.length > 0 ? t : '플로우';
    });
  const topRemainingTitlesStr = topRemainingTitles.join(', ');
  const extra = remainingCount > topRemainingTitles.length ? remainingCount - topRemainingTitles.length : 0;

  const checklistSummaryLine1 = `완료 ${completedCount}개 · 건너뜀 ${skippedCount}개 · 남은 ${remainingCount}개`;
  const checklistSummaryLine2 =
    remainingCount === 0
      ? '오늘 남은 플로우가 없어요'
      : `남은 플로우: ${topRemainingTitlesStr}${extra > 0 ? ` 외 ${extra}개` : ''}`;

  const savedHighlight = plan.liveActivityChecklistFocusBlockId;
  let highlightId =
    typeof savedHighlight === 'string' && ordered.some((b) => b.id === savedHighlight)
      ? savedHighlight
      : null;
  if (
    highlightId &&
    (completed.has(highlightId) || skipped.has(highlightId))
  ) {
    highlightId = null;
  }

  const sessionFocusIndex = ordered.findIndex((block) => block.id === focusBlockId);
  const safeSessionFocusIndex = sessionFocusIndex >= 0 ? sessionFocusIndex : 0;
  /** 체크리스트에서 `진행 중`으로 표시할 블록: 사용자 지정(highlight) 우선, 없으면 세션 블록. */
  const rowCurrentId = highlightId ?? focusBlockId;

  /**
   * 잠금화면 허용 높이만큼 최대한 많이 보여주기 위해 페이로드는 넉넉히 내려준다.
   * 실제로 잘리는 것은 iOS Widget 뷰가 담당한다(`ViewThatFits` + `prefix(maxListLines)` + `…`).
   * 너무 큰 payload는 ActivityKit 전송 한도를 넘길 수 있어 넉넉하되 상한은 둔다.
   */
  const maxVisible = 20;
  let visible: typeof ordered;
  if (ordered.length <= maxVisible) {
    visible = ordered;
  } else {
    let windowStart = ordered.findIndex((b) => b.id === rowCurrentId);
    if (windowStart < 0) windowStart = safeSessionFocusIndex;
    windowStart = Math.min(windowStart, Math.max(0, ordered.length - maxVisible));
    visible = ordered.slice(windowStart, windowStart + maxVisible);
  }

  const checklistRows: LockFlowLiveActivityChecklistRow[] = [];
  for (const block of visible) {
    let parentState: LockFlowLiveActivityChecklistRow['state'] = 'upcoming';
    if (completed.has(block.id)) {
      parentState = 'completed';
    } else if (skipped.has(block.id)) {
      parentState = 'skipped';
    } else if (block.id === focusBlockId && status === 'finished') {
      parentState = 'completed';
    } else if (block.id === rowCurrentId) {
      parentState = 'current';
    }

    const compoundLines = parseNumberedFlowLines(block.title);
    const isCompound = isPriorityCompoundBlockTitle(block.title);

    if (isCompound) {
      compoundLines.forEach((lineTitle, idx) => {
        const t = (lineTitle ?? '').trim();
        const title = t.length > 0 ? t : '플로우';
        let state: LockFlowLiveActivityChecklistRow['state'] = parentState;
        if (parentState === 'current' && idx > 0) {
          state = 'upcoming';
        }
        checklistRows.push({
          blockId: `${block.id}__la${idx}`,
          title,
          /** 본문 줄 단위 표시는 잠금화면에서 시각 없이 쌓음(헤더 구간으로 충분). */
          timeLabel: '',
          state,
        });
      });
    } else {
      const firstLine = block.title.split(/\r?\n/)[0]?.trim() ?? '';
      const rowTitle = firstLine.length > 0 ? firstLine : '플로우';
      checklistRows.push({
        blockId: block.id,
        title: rowTitle,
        timeLabel: formatChecklistTime(block.startMinutes),
        state: parentState,
      });
    }
  }

  return {
    checklistTitle: '오늘 플로우 목록',
    checklistCountLabel: `${checklistRows.length}개`,
    checklistRows,
    checklistSummaryLine1,
    checklistSummaryLine2,
  };
}

function quickMemoStatusLabel(status: LockFlowLiveActivityStatus): string {
  switch (status) {
    case 'finished':
      return '완료';
    case 'paused':
      return '일시정지';
    case 'standby':
      return '시작 대기';
    default:
      return '진행 중';
  }
}

function slotMinuteForTaskIndex(
  startMinutes: number,
  endMinutes: number,
  taskIndex: number,
  totalTasks: number,
  endsNextCalendarDay?: boolean,
): number {
  if (totalTasks <= 1) return startMinutes;
  const span = endsNextCalendarDay
    ? 24 * 60 - startMinutes + endMinutes
    : endMinutes - startMinutes;
  return startMinutes + Math.round((span * taskIndex) / (totalTasks - 1));
}

function blockElapsed01(input: {
  nowMs: number;
  startAtMs: number;
  endAtMs: number;
  status: LockFlowLiveActivityStatus;
  totalSeconds: number;
  pausedRemainingSeconds: number | null | undefined;
}): number {
  const { nowMs, startAtMs, endAtMs, status, totalSeconds, pausedRemainingSeconds } = input;
  if (status === 'finished' || nowMs >= endAtMs) return 1;
  if (
    status === 'paused' &&
    pausedRemainingSeconds != null &&
    totalSeconds > 0
  ) {
    return Math.min(1, Math.max(0, (totalSeconds - pausedRemainingSeconds) / totalSeconds));
  }
  if (nowMs <= startAtMs) return 0;
  const span = endAtMs - startAtMs;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (nowMs - startAtMs) / span));
}

function priorityActiveTaskIndex(
  status: LockFlowLiveActivityStatus,
  taskCount: number,
  elapsed01: number,
): number {
  if (taskCount <= 0) return 0;
  if (status === 'standby') return 0;
  if (status === 'finished') return taskCount - 1;
  const idx = Math.floor(elapsed01 * taskCount);
  return Math.min(taskCount - 1, Math.max(0, idx));
}

function buildPriorityLiveContent(
  block: DayPlanBlock,
  status: LockFlowLiveActivityStatus,
  timing: { startAtMs: number; endAtMs: number },
  pausedRemainingSeconds: number | null,
  totalSec: number,
): PriorityLiveActivityContent | null {
  const lines = parseNumberedFlowLines(block.title);
  if (lines.length < 2) return null;
  const nowMs = Date.now();
  const pausedForElapsed = status === 'paused' ? pausedRemainingSeconds : null;
  const elapsed01 = blockElapsed01({
    nowMs,
    startAtMs: timing.startAtMs,
    endAtMs: timing.endAtMs,
    status,
    totalSeconds: totalSec,
    pausedRemainingSeconds: pausedForElapsed,
  });
  const activeIdx = priorityActiveTaskIndex(status, lines.length, elapsed01);
  const activeTitle = lines[activeIdx] ?? '플로우';
  const upcoming = lines.slice(activeIdx + 1).map((t, j) => {
    const slotIdx = activeIdx + 1 + j;
    const minute = slotMinuteForTaskIndex(
      block.startMinutes,
      block.endMinutes,
      slotIdx,
      lines.length,
      block.endsNextCalendarDay,
    );
    return {
      order: activeIdx + 2 + j,
      title: t,
      timeLabel: formatChecklistTime(minute),
    };
  });
  const listRows = lines.map((title, idx) => {
    const minute = slotMinuteForTaskIndex(
      block.startMinutes,
      block.endMinutes,
      idx,
      lines.length,
      block.endsNextCalendarDay,
    );
    return {
      order: idx + 1,
      title,
      timeLabel: formatChecklistTime(minute),
    };
  });
  return {
    windowLabel: formatBlockTimeRange(block),
    activeTitle,
    activeOrder: activeIdx + 1,
    totalTasks: lines.length,
    progress01: elapsed01,
    upcoming,
    listRows,
  };
}

/**
 * 일정·타임라인 기준 Live Activity 페이로드 조립 (세션 화면의 일시정지는 별도).
 */
export function buildLiveActivityPayloadForBlock(input: {
  blockId: string;
  status: LockFlowLiveActivityStatus;
  /** status === `paused` 일 때만 사용 */
  pausedRemainingSeconds?: number | null;
}): LockFlowLiveActivityPayload | null {
  const { blockId, status, pausedRemainingSeconds = null } = input;

  const plan = useDayPlanStore.getState();
  const block = plan.blocks.find((b) => b.id === blockId);
  if (!block) return null;

  const runtime = useDayPlanRuntimeStore.getState();
  let timing = runtime.timelineByBlockId[blockId];
  const dayMismatch = runtime.sessionDateKey !== plan.dateKey;
  if (!timing || dayMismatch) {
    runtime.buildTimelineFromBlocks({ dateKey: plan.dateKey, blocks: plan.blocks });
    timing = useDayPlanRuntimeStore.getState().timelineByBlockId[blockId];
  }
  if (!timing) return null;

  const categoryLabel = normalizeCategoryLabel(block.category ?? '');
  const categoryKey = resolveCategoryKeyFromLabel(categoryLabel);
  const title = block.title?.trim() ?? '';
  const readingDataConfig =
    categoryKey === 'reading'
      ? normalizeReadingLiveActivityConfig(loadGoalDetailCategoryConfig('reading'))
      : null;
  const numberedLines = parseNumberedFlowLines(block.title);
  const isQuickMemoBlock =
    block.blockOrigin === 'quickMemo' && numberedLines.length >= 1;

  const totalSec = isQuickMemoBlock ? 0 : Math.round(blockDurationSec(block));

  const startsAtIso =
    !isQuickMemoBlock && status === 'standby'
      ? new Date(timing.startAtMs).toISOString()
      : null;

  let endsAtIso: string | null = null;
  if (isQuickMemoBlock) {
    endsAtIso = null;
  } else if (status === 'paused') {
    endsAtIso = null;
  } else {
    endsAtIso = new Date(timing.endAtMs).toISOString();
  }

  const checklist = buildLiveActivityChecklistRows({
    focusBlockId: block.id,
    status,
  });

  const quickMemoLive: QuickMemoLiveActivityContent | null = isQuickMemoBlock
    ? {
        bodyText: numberedLines.join('\n'),
        statusLabel: quickMemoStatusLabel(status),
      }
    : null;

  const priorityLive =
    !isQuickMemoBlock &&
    categoryKey !== 'reading' &&
    isPriorityCompoundBlockTitle(block.title)
      ? buildPriorityLiveContent(
          block,
          status,
          timing,
          status === 'paused' ? pausedRemainingSeconds : null,
          totalSec,
        )
      : null;

  const planMode =
    quickMemoLive != null ? 'quickMemo' : priorityLive != null ? 'priority' : 'time';
  const readingForLa =
    planMode === 'priority' || planMode === 'quickMemo' ? null : readingDataConfig;

  return {
    blockId: block.id,
    title,
    category: categoryLabel,
    categoryKey,
    timeRangeLabel: formatBlockTimeRange(block),
    totalSeconds: totalSec,
    pausedRemainingSeconds:
      isQuickMemoBlock ? null : status === 'paused' ? pausedRemainingSeconds : null,
    endsAtIso,
    startsAtIso,
    status,
    readingDataConfig: readingForLa,
    checklistTitle: checklist.checklistTitle,
    checklistCountLabel: checklist.checklistCountLabel,
    checklistRows: checklist.checklistRows,
    checklistSummaryLine1: checklist.checklistSummaryLine1,
    checklistSummaryLine2: checklist.checklistSummaryLine2,
    planMode,
    priorityLive,
    quickMemoLive,
  };
}
