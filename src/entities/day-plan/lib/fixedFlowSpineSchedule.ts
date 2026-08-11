import type { FixedFlowSetItem } from '@shared/lib/storage';

import { buildSpineImportFromBag } from './buildSpineImportFromBag';
import { parseHHmmToMinutes } from './parseTime';
import type { DayPlanBlock } from '../model/types';

export type FixedFlowSpineItemSchedule = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay?: boolean;
  /** 저장된 시각이 없어 기본 배치로 채운 경우 */
  isSuggested: boolean;
};

function isValidSameDaySpineMinutes(start: unknown, end: unknown): start is number {
  return (
    typeof start === 'number' &&
    typeof end === 'number' &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    end > start &&
    start >= 0 &&
    end <= 24 * 60
  );
}

function isValidNextDaySpineMinutes(start: unknown, end: unknown): start is number {
  return (
    typeof start === 'number' &&
    typeof end === 'number' &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end >= 0 &&
    start < 24 * 60 &&
    end < 24 * 60 &&
    24 * 60 - start + end > 0
  );
}

function itemHasStoredSchedule(item: FixedFlowSetItem): boolean {
  if (item.spineEndsNextCalendarDay === true) {
    return isValidNextDaySpineMinutes(item.spineStartMinutes, item.spineEndMinutes);
  }
  return isValidSameDaySpineMinutes(item.spineStartMinutes, item.spineEndMinutes);
}

/**
 * 오늘 일정 블록이 고정 루틴에 저장된 정확한 시간 슬롯인지 확인한다.
 * 저장 슬롯은 오늘 일정의 집중 구간 자동 보정 대상에서 제외해야 한다.
 */
export function isStoredFixedFlowSpineSchedule(
  block: Pick<
    DayPlanBlock,
    'categoryKey' | 'startMinutes' | 'endMinutes' | 'endsNextCalendarDay'
  >,
  items: readonly FixedFlowSetItem[],
): boolean {
  const categoryKey = block.categoryKey?.trim();
  if (!categoryKey) return false;

  return items.some(
    (item) =>
      item.enabled !== false &&
      item.categoryKey.trim() === categoryKey &&
      itemHasStoredSchedule(item) &&
      item.spineStartMinutes === block.startMinutes &&
      item.spineEndMinutes === block.endMinutes &&
      (item.spineEndsNextCalendarDay === true) ===
        (block.endsNextCalendarDay === true),
  );
}

/** 고정 루틴 타임라인 — 항목별 시작·종료 시각(저장값 없으면 집중 구간 안에서 순서대로 제안) */
export function resolveFixedFlowSpineSchedules(input: {
  items: readonly FixedFlowSetItem[];
  priorityStart: string;
  priorityEnd: string;
}): Map<string, FixedFlowSpineItemSchedule> {
  const out = new Map<string, FixedFlowSpineItemSchedule>();
  const enabledItems = input.items.filter((item) => item.enabled !== false);
  for (const item of enabledItems) {
    if (!itemHasStoredSchedule(item)) continue;
    const startMinutes = item.spineStartMinutes!;
    const endMinutes = item.spineEndMinutes!;
    const endsNext = item.spineEndsNextCalendarDay === true;

    if (endsNext) {
      out.set(item.categoryKey, {
        startMinutes,
        endMinutes,
        endsNextCalendarDay: true,
        isSuggested: false,
      });
      continue;
    }

    out.set(item.categoryKey, {
      startMinutes,
      endMinutes,
      isSuggested: false,
    });
  }

  const missingKeys = enabledItems
    .map((item) => item.categoryKey.trim())
    .filter((key) => key.length > 0 && !out.has(key));

  if (missingKeys.length === 0) return out;

  const windowStart = parseHHmmToMinutes(input.priorityStart) ?? 9 * 60;
  const suggested = buildSpineImportFromBag({
    categoryKeys: missingKeys,
    resolveTitle: (key) => key,
    priorityStart: input.priorityStart,
    priorityEnd: input.priorityEnd,
    existingBlocks: [],
    nowMinutes: windowStart,
  });

  for (const row of suggested) {
    out.set(row.categoryKey, {
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      isSuggested: true,
    });
  }

  return out;
}

export function sortFixedFlowItemsBySpineSchedule(
  items: readonly FixedFlowSetItem[],
  schedules: ReadonlyMap<string, FixedFlowSpineItemSchedule>,
): FixedFlowSetItem[] {
  return [...items].sort((a, b) => {
    const sa = schedules.get(a.categoryKey);
    const sb = schedules.get(b.categoryKey);
    if (sa && sb) {
      return sa.startMinutes - sb.startMinutes || a.categoryKey.localeCompare(b.categoryKey);
    }
    if (sa) return -1;
    if (sb) return 1;
    return 0;
  });
}
