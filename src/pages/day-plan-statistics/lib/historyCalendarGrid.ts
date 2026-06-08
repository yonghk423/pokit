import {
  getLocalDateKey,
  localDateToDateKey,
  parseLocalDateKeyToDate,
} from '@entities/day-plan/lib/localDateKey';

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

export function dateKeyFromDate(d: Date): string {
  return localDateToDateKey(d);
}

export function dateKeyMonthPrefix(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(dateKey);
  return m ? `${m[1]}-${m[2]}` : '';
}

export function todayDateKey(): string {
  return getLocalDateKey();
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function shiftMonthPrefix(monthPrefix: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthPrefix.trim());
  if (!m) return monthPrefix;
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + deltaMonths, 1, 12, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function buildMonthRangeFromPrefix(
  monthPrefix: string,
  todayDateKey: string,
): { startDateKey: string; endDateKey: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthPrefix.trim());
  if (!m) {
    return { startDateKey: todayDateKey, endDateKey: todayDateKey };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const startDateKey = `${year}-${String(month).padStart(2, '0')}-01`;
  if (monthPrefix === todayDateKey.slice(0, 7)) {
    return { startDateKey, endDateKey: todayDateKey };
  }
  const lastDay = new Date(year, month, 0, 12, 0, 0, 0);
  return { startDateKey, endDateKey: dateKeyFromDate(lastDay) };
}

export function previousMonthPrefixFromPrefix(monthPrefix: string): string {
  return shiftMonthPrefix(monthPrefix, -1);
}
