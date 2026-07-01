import {
  isApplyWeekdayMatchedToday,
  normalizeApplyWeekdays,
  type WeekdayIndex,
} from './fixedFlowWeekdays';
import {
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from './goalDetailSettingsStorage';

export function readApplyWeekdaysFromConfig(config: unknown): WeekdayIndex[] | null {
  if (!config || typeof config !== 'object') return null;
  const normalized = normalizeApplyWeekdays((config as Record<string, unknown>).applyWeekdays);
  return normalized.length > 0 ? normalized : null;
}

export function loadCategoryApplyWeekdays(categoryKey: string): WeekdayIndex[] | null {
  const key = categoryKey.trim();
  if (!key) return null;
  return readApplyWeekdaysFromConfig(loadGoalDetailCategoryConfig(key));
}

export function saveCategoryApplyWeekdays(categoryKey: string, weekdays: WeekdayIndex[]): void {
  const key = categoryKey.trim();
  const normalized = normalizeApplyWeekdays(weekdays);
  if (!key || normalized.length === 0) return;
  const existing = loadGoalDetailCategoryConfig(key);
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  saveGoalDetailCategoryConfig(key, { ...base, applyWeekdays: normalized });
}

export function clearCategoryApplyWeekdays(categoryKey: string): void {
  const key = categoryKey.trim();
  if (!key) return;
  const existing = loadGoalDetailCategoryConfig(key);
  if (!existing || typeof existing !== 'object') return;
  const next = { ...(existing as Record<string, unknown>) };
  delete next.applyWeekdays;
  saveGoalDetailCategoryConfig(key, next);
}

/** 목표 상세에 적용 요일이 설정된 항목 중 오늘 요일과 맞는 categoryKey */
export function collectAutoScheduledCategoryKeys(now: Date = new Date()): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const key of listGoalDetailCategoryConfigKeys()) {
    const trimmed = key.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    const weekdays = loadCategoryApplyWeekdays(trimmed);
    if (!weekdays || !isApplyWeekdayMatchedToday(weekdays, now)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
