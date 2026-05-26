import { getLocalDateKey, localDateToDateKey, parseLocalDateKeyToDate } from '@entities/day-plan';

export function toMonthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

export function addMonths(monthStart: Date, deltaMonths: number): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + deltaMonths, 1, 12, 0, 0, 0);
}

/** 월요일 시작 6주 그리드 */
export function buildCalendarMonthGrid(monthStart: Date): Date[] {
  const firstWeekdayMondayZero = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekdayMondayZero);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function monthStartFromDateKey(dateKey: string, fallback = new Date()): Date {
  const parsed = parseLocalDateKeyToDate(dateKey);
  return toMonthStart(parsed ?? fallback);
}

export function formatMonthTitleKo(monthStart: Date): string {
  return `${monthStart.getFullYear()}년 ${monthStart.getMonth() + 1}월`;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function dateKeyFromDate(d: Date): string {
  return localDateToDateKey(d);
}

export function todayDateKey(): string {
  return getLocalDateKey();
}

export function dateKeyMonthPrefix(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(dateKey);
  return m ? `${m[1]}-${m[2]}` : '';
}

/** 먼슬리 달력 강조 앵커 — 해당 월이면 오늘, 아니면 1일 */
export function horizonFocusDateKeyForMonth(year: number, month: number, todayKey: string): string {
  if (dateKeyMonthPrefix(todayKey) === `${year}-${String(month).padStart(2, '0')}`) {
    return todayKey;
  }
  return `${year}-${String(month).padStart(2, '0')}-01`;
}
