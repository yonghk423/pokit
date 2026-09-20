import {
  isNotifyTimeWithinPriorityWindow,
  parseHHmmToMinutes,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  resolveFixedFlowSpineSchedules,
  resolvePriorityRoutineCategoryKey,
  resolveSpinePriorityWindow,
  type DayPlanBlock,
} from '@entities/day-plan';
import {
  isPokitWeekTourFlowId,
  loadSpineDefaultBlockMinutes,
  type FixedFlowSet,
} from '@shared/lib/storage';

import { isOvernightHhmmRange } from './dayPlanEditorShared';

export type BagRowSpineSchedule = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay: boolean;
  /**
   * 자정 넘김 집중 구간에서 시작이 「다음 날 아침」 밴드인지.
   * 시계 분(startMinutes)만 보면 새벽이 오전보다 앞에 오므로 정렬·표시에 쓴다.
   */
  startsNextCalendarDay: boolean;
  /** true면 저장된 시각이 없어 UI에 시간을 숨김 */
  isSuggested: boolean;
};

const DAY_MINUTES = 24 * 60;

/** 자정 넘김 창의 아침 밴드(다음날 새벽~종료)인지 */
export function isBagRowStartOnNextCalendarDay(
  startMinutes: number,
  priorityStart: string,
  priorityEnd: string,
): boolean {
  const window = resolveSpinePriorityWindow(priorityStart, priorityEnd);
  if (!window?.overnight) return false;
  const start = Math.floor(startMinutes);
  return start <= window.endMin && start < window.startMin;
}

function withStartsNextDay(
  schedule: Omit<BagRowSpineSchedule, 'startsNextCalendarDay'>,
  priorityStart: string,
  priorityEnd: string,
): BagRowSpineSchedule {
  return {
    ...schedule,
    startsNextCalendarDay: isBagRowStartOnNextCalendarDay(
      schedule.startMinutes,
      priorityStart,
      priorityEnd,
    ),
  };
}

/**
 * 담기 행은 시작 시각만 고른다. 도메인 블록용 종료는 기본 길이로 파생한다.
 * `startsNextCalendarDay`는 자정 넘김 집중 구간의 「다음 날 아침」 시작을 뜻한다.
 */
export function deriveBagRowScheduleFromStart(input: {
  startMinutes: number;
  startsNextCalendarDay: boolean;
  priorityStart: string;
  priorityEnd: string;
  durationMinutes?: number;
}): { startMinutes: number; endMinutes: number; endsNextCalendarDay: boolean } | null {
  const window = resolveSpinePriorityWindow(input.priorityStart, input.priorityEnd);
  if (!window) return null;
  if (
    !isNotifyTimeWithinPriorityWindow(
      input.startMinutes,
      input.startsNextCalendarDay,
      window,
    )
  ) {
    return null;
  }

  const start = Math.max(0, Math.min(Math.floor(input.startMinutes), 24 * 60 - 1));
  const duration = Math.max(1, Math.floor(input.durationMinutes ?? loadSpineDefaultBlockMinutes()));

  if (!window.overnight) {
    const preferredEnd = start + duration;
    const end =
      preferredEnd <= window.endMin
        ? preferredEnd
        : Math.max(start + 1, Math.min(window.endMin, preferredEnd));
    if (end <= start) return null;
    return { startMinutes: start, endMinutes: end, endsNextCalendarDay: false };
  }

  // 자정 넘김 · 다음 날 아침 밴드 → 같은 날(endsNext=false) 아침 블록
  if (input.startsNextCalendarDay) {
    const preferredEnd = start + duration;
    const end =
      preferredEnd <= window.endMin
        ? preferredEnd
        : Math.max(start + 1, Math.min(window.endMin, preferredEnd));
    if (end <= start) return null;
    return { startMinutes: start, endMinutes: end, endsNextCalendarDay: false };
  }

  // 자정 넘김 · 당일 저녁 밴드
  const preferredEnd = start + duration;
  if (preferredEnd <= 24 * 60) {
    return { startMinutes: start, endMinutes: preferredEnd, endsNextCalendarDay: false };
  }
  const wrapped = preferredEnd - 24 * 60;
  return {
    startMinutes: start,
    endMinutes: Math.min(Math.max(wrapped, 0), window.endMin),
    endsNextCalendarDay: true,
  };
}

/** 담기 행에 표시·정렬할 시작·종료 시각 */
export function resolveBagItemSpineSchedule(input: {
  categoryKey: string;
  planBlocks: readonly DayPlanBlock[];
  fixedFlowSets: readonly FixedFlowSet[];
  priorityStart: string;
  priorityEnd: string;
}): BagRowSpineSchedule {
  const categoryKey = input.categoryKey;
  const baseKey = resolvePriorityRoutineCategoryKey(categoryKey);
  const block = input.planBlocks.find((b) => {
    const key = resolveBlockCategoryKey(b) ?? resolveCategoryKeyFromLabel(b.category ?? '');
    return key === baseKey || key === categoryKey;
  });
  // 튜토리얼만 집중 구간을 「사용한 것처럼」보여 준다. 그 외 루틴은 사용자가
  // 직접 맞춘 시각이 있을 때만 표시한다.
  if (
    isPokitWeekTourFlowId(baseKey) &&
    (!block || block.hasManualScheduleOverride !== true)
  ) {
    const windowStart = parseHHmmToMinutes(input.priorityStart);
    const windowEnd = parseHHmmToMinutes(input.priorityEnd);
    if (windowStart !== null && windowEnd !== null) {
      return withStartsNextDay(
        {
          startMinutes: windowStart,
          endMinutes: windowEnd,
          endsNextCalendarDay: isOvernightHhmmRange(input.priorityStart, input.priorityEnd),
          isSuggested: false,
        },
        input.priorityStart,
        input.priorityEnd,
      );
    }
  }
  if (block?.hasManualScheduleOverride === true) {
    return withStartsNextDay(
      {
        startMinutes: block.startMinutes,
        endMinutes: block.endMinutes,
        endsNextCalendarDay: block.endsNextCalendarDay === true,
        isSuggested: false,
      },
      input.priorityStart,
      input.priorityEnd,
    );
  }

  const items = input.fixedFlowSets.flatMap((set) => set.items);
  const schedules = resolveFixedFlowSpineSchedules({
    items,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
  });
  const fromSet = schedules.get(baseKey) ?? schedules.get(categoryKey);
  if (fromSet) {
    return withStartsNextDay(
      {
        startMinutes: fromSet.startMinutes,
        endMinutes: fromSet.endMinutes,
        endsNextCalendarDay: fromSet.endsNextCalendarDay === true,
        isSuggested: fromSet.isSuggested === true,
      },
      input.priorityStart,
      input.priorityEnd,
    );
  }

  const windowStart = parseHHmmToMinutes(input.priorityStart) ?? 9 * 60;
  const windowEnd = parseHHmmToMinutes(input.priorityEnd) ?? 18 * 60;
  const defaultDuration = loadSpineDefaultBlockMinutes();
  const endMinutes =
    windowEnd > windowStart
      ? Math.min(windowStart + defaultDuration, windowEnd)
      : windowStart + defaultDuration;
  return withStartsNextDay(
    {
      startMinutes: windowStart,
      endMinutes,
      endsNextCalendarDay: false,
      isSuggested: true,
    },
    input.priorityStart,
    input.priorityEnd,
  );
}

/**
 * 설정한 시작 시각 오름차순(자정 넘김 창은 당일 → 다음날 새벽).
 * 미설정(suggested)은 뒤로. 동일 시각·미설정끼리는 원래 순서 유지.
 */
export function sortByExplicitSpineStartTime<T>(
  items: readonly T[],
  resolveKey: (item: T) => string,
  resolveSchedule: (
    key: string,
  ) => Pick<BagRowSpineSchedule, 'startMinutes' | 'isSuggested' | 'startsNextCalendarDay'>,
): T[] {
  const chronologicalStart = (
    schedule: Pick<BagRowSpineSchedule, 'startMinutes' | 'startsNextCalendarDay'>,
  ) =>
    schedule.startMinutes +
    (schedule.startsNextCalendarDay ? DAY_MINUTES : 0);

  return items
    .map((item, index) => ({ item, index, schedule: resolveSchedule(resolveKey(item)) }))
    .sort((a, b) => {
      if (a.schedule.isSuggested !== b.schedule.isSuggested) {
        return a.schedule.isSuggested ? 1 : -1;
      }
      if (!a.schedule.isSuggested) {
        const aKey = chronologicalStart(a.schedule);
        const bKey = chronologicalStart(b.schedule);
        if (aKey !== bKey) return aKey - bKey;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
