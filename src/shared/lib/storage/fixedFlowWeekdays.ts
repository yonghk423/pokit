import type { FixedFlowSetApplyRule } from './fixedFlowSetsStorage';

/** JS `Date#getDay()` — 0=일, 1=월, …, 6=토 */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS: Record<WeekdayIndex, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

/** UI 표시 순서 — 월~일 */
export const WEEKDAY_PICKER_ORDER: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_PRESET_WEEKDAY: WeekdayIndex[] = [1, 2, 3, 4, 5];
export const WEEKDAY_PRESET_WEEKEND: WeekdayIndex[] = [0, 6];
export const WEEKDAY_PRESET_DAILY: WeekdayIndex[] = [0, 1, 2, 3, 4, 5, 6];

function isWeekdayIndex(value: number): value is WeekdayIndex {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

export function normalizeApplyWeekdays(raw: unknown): WeekdayIndex[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<WeekdayIndex>();
  const out: WeekdayIndex[] = [];
  for (const row of raw) {
    const day = typeof row === 'number' ? row : Number(row);
    if (!isWeekdayIndex(day) || seen.has(day)) continue;
    seen.add(day);
    out.push(day);
  }
  return out.sort((a, b) => a - b);
}

export function defaultWeekdaysForApplyRule(rule: FixedFlowSetApplyRule): WeekdayIndex[] {
  if (rule === 'weekday') return [...WEEKDAY_PRESET_WEEKDAY];
  if (rule === 'weekend') return [...WEEKDAY_PRESET_WEEKEND];
  if (rule === 'daily' || rule === 'always') return [...WEEKDAY_PRESET_DAILY];
  if (rule === 'custom') return [1];
  return [];
}

export function resolveApplyWeekdays(input: {
  applyRule: FixedFlowSetApplyRule;
  applyWeekdays?: WeekdayIndex[] | number[];
}): WeekdayIndex[] {
  const normalized = normalizeApplyWeekdays(input.applyWeekdays);
  if (normalized.length > 0) return normalized;
  return defaultWeekdaysForApplyRule(input.applyRule);
}

function sameWeekdaySet(a: WeekdayIndex[], b: WeekdayIndex[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((day, index) => day === b[index]);
}

export function formatApplyWeekdaysLabel(weekdays: WeekdayIndex[]): string {
  const normalized = normalizeApplyWeekdays(weekdays);
  if (normalized.length === 0) return '요일 없음';
  if (sameWeekdaySet(normalized, WEEKDAY_PRESET_WEEKDAY)) return '평일';
  if (sameWeekdaySet(normalized, WEEKDAY_PRESET_WEEKEND)) return '주말';
  if (sameWeekdaySet(normalized, WEEKDAY_PRESET_DAILY)) return '매일';
  return WEEKDAY_PICKER_ORDER.filter((day) => normalized.includes(day))
    .map((day) => WEEKDAY_LABELS[day])
    .join('·');
}

export function formatApplyWeekdaysHint(weekdays: WeekdayIndex[]): string {
  const normalized = normalizeApplyWeekdays(weekdays);
  if (normalized.length === 0) return '요일을 하나 이상 선택해 주세요.';
  const dayText = WEEKDAY_PICKER_ORDER.filter((day) => normalized.includes(day))
    .map((day) => WEEKDAY_LABELS[day])
    .join(', ');
  return `${dayText} 오늘 탭에 자동으로 추가돼요.`;
}

export function isApplyWeekdayMatchedToday(
  weekdays: WeekdayIndex[],
  now: Date = new Date(),
): boolean {
  const normalized = normalizeApplyWeekdays(weekdays);
  if (normalized.length === 0) return false;
  return normalized.includes(now.getDay() as WeekdayIndex);
}
