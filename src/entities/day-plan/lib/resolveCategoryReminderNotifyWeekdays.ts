import {
  resolveApplyWeekdays,
  WEEKDAY_PRESET_DAILY,
  type FixedFlowSet,
  type WeekdayIndex,
} from '@shared/lib/storage';

/**
 * 시간 알림(OS 예약)에 쓸 요일을 카테고리별로 해석합니다.
 * - 적용 중인 그룹에 있으면 그 그룹의 적용 요일을 합칩니다.
 * - 그룹 적용 없이 오늘 일정에만 있으면 매일로 잡습니다.
 * - 둘 다 아니면 맵에 넣지 않습니다(알림 예약 대상 아님).
 */
export function resolveCategoryReminderNotifyWeekdays(input: {
  categoryKeys: readonly string[];
  sets: readonly FixedFlowSet[];
  activeSetIds: readonly string[];
  /** 목록·시간대·타임라인에 실제로 올라간 키 */
  todayPlanCategoryKeys?: readonly string[];
}): Map<string, WeekdayIndex[]> {
  const wanted = new Set(
    input.categoryKeys.map((key) => key.trim()).filter((key) => key.length > 0),
  );
  if (wanted.size === 0) return new Map();

  const activeIds = new Set(input.activeSetIds);
  const weekdaysByKey = new Map<string, Set<WeekdayIndex>>();

  for (const set of input.sets) {
    if (!activeIds.has(set.id)) continue;
    const weekdays = resolveApplyWeekdays({
      applyRule: set.applyRule,
      applyWeekdays: set.applyWeekdays,
    });
    for (const item of set.items) {
      if (item.enabled === false) continue;
      const key = item.categoryKey.trim();
      if (!key || !wanted.has(key)) continue;
      let bucket = weekdaysByKey.get(key);
      if (!bucket) {
        bucket = new Set<WeekdayIndex>();
        weekdaysByKey.set(key, bucket);
      }
      for (const day of weekdays) bucket.add(day);
    }
  }

  const todayPlan = new Set(
    (input.todayPlanCategoryKeys ?? [])
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
  );
  for (const key of wanted) {
    if (weekdaysByKey.has(key)) continue;
    if (!todayPlan.has(key)) continue;
    weekdaysByKey.set(key, new Set(WEEKDAY_PRESET_DAILY));
  }

  const out = new Map<string, WeekdayIndex[]>();
  for (const [key, days] of weekdaysByKey) {
    if (days.size === 0) continue;
    out.set(key, [...days].sort((a, b) => a - b));
  }
  return out;
}
