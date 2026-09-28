import type { FixedFlowSetItem } from '@shared/lib/storage';

import { LEGACY_WATER_CATEGORY_KEY } from './healthIntakeDetailConfig';
import { filterKeysToPriorityCatalog } from './priorityCatalogRegistry';

/** 고정 루틴 프리셋에서만 유지하는 레거시 카테고리 키 */
const FIXED_ROUTINE_LEGACY_KEYS = new Set<string>([LEGACY_WATER_CATEGORY_KEY]);

function hasStoredSpineSchedule(item: FixedFlowSetItem): boolean {
  const start = item.spineStartMinutes;
  const end = item.spineEndMinutes;
  if (typeof start !== 'number' || typeof end !== 'number') return false;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (item.spineEndsNextCalendarDay === true) {
    return start >= 0 && start < 24 * 60 && end >= 0 && end < 24 * 60 && 24 * 60 - start + end > 0;
  }
  return start >= 0 && end <= 24 * 60 && end > start;
}

/** 세트 항목을 담기 카탈로그 허용 키만 남기고 순서·enabled 유지 */
export function sanitizeFixedFlowSetItems(items: FixedFlowSetItem[]): FixedFlowSetItem[] {
  const byKey = new Map(items.map((x) => [x.categoryKey, x]));
  const catalogKeys = new Set(filterKeysToPriorityCatalog(items.map((x) => x.categoryKey)));
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.categoryKey.trim();
    if (!key || seen.has(key)) continue;
    // 카탈로그 밖 키여도 사용자가 맞춘 시간(spine)이 있으면 유실 방지를 위해 보존한다.
    if (!catalogKeys.has(key) && !FIXED_ROUTINE_LEGACY_KEYS.has(key) && !hasStoredSpineSchedule(item)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys.map((categoryKey) => {
    const prev = byKey.get(categoryKey);
    return {
      categoryKey,
      enabled: prev?.enabled !== false,
      mealSlot: prev?.mealSlot,
      mealSlots: prev?.mealSlots,
      spineStartMinutes: prev?.spineStartMinutes,
      spineEndMinutes: prev?.spineEndMinutes,
      ...(prev?.spineEndsNextCalendarDay === true
        ? { spineEndsNextCalendarDay: true as const }
        : {}),
    };
  });
}
