import {
  resolveApplyWeekdays,
  WEEKDAY_PRESET_DAILY,
  type WeekdayIndex,
  type DayMealSlot,
  type DayMealSlotSchedule,
  type FixedFlowSet,
  type FixedRoutineApplyLayoutMode,
} from '@shared/lib/storage';

import { formatMinutesToHHmm } from './dayPlanTimeMath';
import { parseHHmmToMinutes } from './parseTime';
import { resolvePriorityRoutineCategoryKey } from './priorityRoutineInstance';

export type RoutineStartNotifySlot = {
  categoryKey: string;
  hhmm: string;
  /** `${categoryKey}:${hhmm}` */
  slotKey: string;
  /** JS Date#getDay 기준 요일(0=일~6=토) */
  weekdays: WeekdayIndex[];
};

export type RoutineStartNotifyPlanBlock = {
  categoryKey?: string;
  startMinutes?: number;
  blockOrigin?: 'quickMemo' | 'prioritySession' | 'spineTimeline';
  /** 사용자가 직접 맞춘 시각만 알림 후보로 쓴다 */
  hasManualScheduleOverride?: boolean;
};

function minutesToNotifyHhmm(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes >= 24 * 60) return null;
  return formatMinutesToHHmm(minutes);
}

function normalizeWeekdaysOrDaily(weekdays?: readonly WeekdayIndex[]): WeekdayIndex[] {
  const source = weekdays ?? WEEKDAY_PRESET_DAILY;
  const normalized = [...new Set(source)].filter(
    (d): d is WeekdayIndex => Number.isInteger(d) && d >= 0 && d <= 6,
  );
  if (normalized.length === 0) return [...WEEKDAY_PRESET_DAILY];
  return [...normalized].sort((a, b) => a - b);
}

/**
 * 시작 알림은 루틴(카테고리)당 시각 하나만 예약한다.
 * 같은 시각이면 요일만 합치고, 다른 시각이면 먼저 채택된 후보를 유지한다.
 */
function pushPreferredStart(
  out: Map<string, RoutineStartNotifySlot>,
  categoryKey: string,
  hhmm: string,
  weekdays?: readonly WeekdayIndex[],
): void {
  const key = categoryKey.trim();
  if (!key) return;
  const normalized = hhmm.trim();
  const m = parseHHmmToMinutes(normalized);
  if (m === null || m >= 24 * 60) return;
  const nextWeekdays = normalizeWeekdaysOrDaily(weekdays);
  const prev = out.get(key);
  if (!prev) {
    out.set(key, {
      categoryKey: key,
      hhmm: normalized,
      slotKey: `${key}:${normalized}`,
      weekdays: nextWeekdays,
    });
    return;
  }
  if (prev.hhmm !== normalized) return;
  const merged = [...new Set([...prev.weekdays, ...nextWeekdays])].sort((a, b) => a - b);
  out.set(key, { ...prev, weekdays: merged });
}

/**
 * 카테고리별「시작 알림」시각을 모읍니다.
 * 우선순위: 전역 저장 시각 → 오늘 수동 블록 → 고정 루틴 spine
 * (시간대/식사 구간 모드는 미사용 — 시작 알림 후보에서 제외)
 */
export function collectRoutineStartNotifySlots(input: {
  enabledCategoryKeys: readonly string[];
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  /** false면 활성 세트만 반영 (실제 예약 생성용) */
  includeInactiveSets?: boolean;
  /** @deprecated 해석에 쓰지 않음(호환용) */
  layoutMode?: FixedRoutineApplyLayoutMode;
  /** @deprecated 시간대 모드 미사용 — 시작 알림에 반영하지 않음 */
  mealSchedule?: DayMealSlotSchedule;
  planBlocks?: readonly RoutineStartNotifyPlanBlock[];
  /** @deprecated 시간대 모드 미사용 — 시작 알림에 반영하지 않음 */
  sectionsMealSlots?: Record<string, DayMealSlot[] | DayMealSlot | undefined>;
  /** 오늘 루틴 목록에 있는 카테고리 */
  todayCategoryKeys?: readonly string[];
  /** @deprecated 루틴 시각이 없을 때 하루 시작으로 채우지 않음(호환용) */
  priorityStart?: string;
  /** 전역 루틴 시작 시각 저장소(담기에서 저장) */
  storedStartTimes?: Readonly<
    Record<string, { startMinutes: number; endMinutes?: number; endsNextCalendarDay?: boolean }>
  >;
}): RoutineStartNotifySlot[] {
  const enabled = new Set(input.enabledCategoryKeys.filter(Boolean));
  if (enabled.size === 0) return [];

  const activeIds = new Set(input.activeSetIds);
  const slotMap = new Map<string, RoutineStartNotifySlot>();
  const includeInactiveSets = input.includeInactiveSets !== false;

  // 1) 전역 루틴 시작 시각(담기 저장) — 최우선
  if (input.storedStartTimes) {
    for (const categoryKey of enabled) {
      const entry = input.storedStartTimes[categoryKey];
      if (!entry || typeof entry.startMinutes !== 'number') continue;
      const hhmm = minutesToNotifyHhmm(entry.startMinutes);
      if (hhmm) pushPreferredStart(slotMap, categoryKey, hhmm, WEEKDAY_PRESET_DAILY);
    }
  }

  // 2) 오늘 일정 — 사용자가 직접 맞춘 시작 시각
  if (input.planBlocks) {
    for (const block of input.planBlocks) {
      if (block.hasManualScheduleOverride !== true) continue;
      const rawKey = typeof block.categoryKey === 'string' ? block.categoryKey : '';
      const key = resolvePriorityRoutineCategoryKey(rawKey);
      if (!key || !enabled.has(key)) continue;
      if (typeof block.startMinutes !== 'number') continue;
      const hhmm = minutesToNotifyHhmm(block.startMinutes);
      if (hhmm) pushPreferredStart(slotMap, key, hhmm, WEEKDAY_PRESET_DAILY);
    }
  }

  // 3) 고정 루틴 spine — 활성 세트 우선
  const orderedSets = includeInactiveSets
    ? [
        ...input.sets.filter((set) => activeIds.has(set.id)),
        ...input.sets.filter((set) => !activeIds.has(set.id)),
      ]
    : input.sets.filter((set) => activeIds.has(set.id));
  for (const set of orderedSets) {
    const weekdays = resolveApplyWeekdays({
      applyRule: set.applyRule,
      applyWeekdays: set.applyWeekdays,
    });
    for (const item of set.items) {
      if (item.enabled === false) continue;
      if (!enabled.has(item.categoryKey)) continue;
      if (typeof item.spineStartMinutes !== 'number') continue;
      const hhmm = minutesToNotifyHhmm(item.spineStartMinutes);
      if (hhmm) pushPreferredStart(slotMap, item.categoryKey, hhmm, weekdays);
    }
  }

  return [...slotMap.values()];
}

/** 해당 카테고리에 예약 가능한 시작 시각이 하나라도 있는지 */
export function hasResolvableRoutineStartTime(input: {
  categoryKey: string;
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  includeInactiveSets?: boolean;
  layoutMode?: FixedRoutineApplyLayoutMode;
  mealSchedule?: DayMealSlotSchedule;
  planBlocks?: readonly RoutineStartNotifyPlanBlock[];
  sectionsMealSlots?: Record<string, DayMealSlot[] | DayMealSlot | undefined>;
  todayCategoryKeys?: readonly string[];
  priorityStart?: string;
  storedStartTimes?: Readonly<
    Record<string, { startMinutes: number; endMinutes?: number; endsNextCalendarDay?: boolean }>
  >;
}): boolean {
  return (
    collectRoutineStartNotifySlots({
      enabledCategoryKeys: [input.categoryKey],
      sets: input.sets,
      activeSetIds: input.activeSetIds,
      includeInactiveSets: input.includeInactiveSets,
      layoutMode: input.layoutMode,
      planBlocks: input.planBlocks,
      todayCategoryKeys: input.todayCategoryKeys,
      priorityStart: input.priorityStart,
      storedStartTimes: input.storedStartTimes,
    }).length > 0
  );
}
