import {
  parseHHmmToMinutes,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  resolveFixedFlowSpineSchedules,
  resolvePriorityRoutineCategoryKey,
  type DayPlanBlock,
} from '@entities/day-plan';
import {
  loadSpineDefaultBlockMinutes,
  type FixedFlowSet,
} from '@shared/lib/storage';

export type BagRowSpineSchedule = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay: boolean;
  /** true면 저장된 시각이 없어 UI에 시간을 숨김 */
  isSuggested: boolean;
};

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
  if (block) {
    return {
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      endsNextCalendarDay: block.endsNextCalendarDay === true,
      isSuggested: false,
    };
  }

  const items = input.fixedFlowSets.flatMap((set) => set.items);
  const schedules = resolveFixedFlowSpineSchedules({
    items,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
  });
  const fromSet = schedules.get(baseKey) ?? schedules.get(categoryKey);
  if (fromSet) {
    return {
      startMinutes: fromSet.startMinutes,
      endMinutes: fromSet.endMinutes,
      endsNextCalendarDay: fromSet.endsNextCalendarDay === true,
      isSuggested: fromSet.isSuggested === true,
    };
  }

  const windowStart = parseHHmmToMinutes(input.priorityStart) ?? 9 * 60;
  const windowEnd = parseHHmmToMinutes(input.priorityEnd) ?? 18 * 60;
  const defaultDuration = loadSpineDefaultBlockMinutes();
  const endMinutes =
    windowEnd > windowStart
      ? Math.min(windowStart + defaultDuration, windowEnd)
      : windowStart + defaultDuration;
  return {
    startMinutes: windowStart,
    endMinutes,
    endsNextCalendarDay: false,
    isSuggested: true,
  };
}

/**
 * 설정한 시작 시각 오름차순. 미설정(suggested)은 뒤로.
 * 동일 시각·미설정끼리는 원래 순서 유지.
 */
export function sortByExplicitSpineStartTime<T>(
  items: readonly T[],
  resolveKey: (item: T) => string,
  resolveSchedule: (key: string) => Pick<BagRowSpineSchedule, 'startMinutes' | 'isSuggested'>,
): T[] {
  return items
    .map((item, index) => ({ item, index, schedule: resolveSchedule(resolveKey(item)) }))
    .sort((a, b) => {
      if (a.schedule.isSuggested !== b.schedule.isSuggested) {
        return a.schedule.isSuggested ? 1 : -1;
      }
      if (!a.schedule.isSuggested && a.schedule.startMinutes !== b.schedule.startMinutes) {
        return a.schedule.startMinutes - b.schedule.startMinutes;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.item);
}
