import { parseHistoryDateKey } from '@entities/history/lib/historyDateKey';

import { historyWeekdayIndexMondayZero } from './buildWeeklyFlowHistory';

export type HistoryPeriod = 'week' | 'month';

export function resolveMonthPrefix(anchorDateKey: string): string {
  return anchorDateKey.slice(0, 7);
}

export function monthPrefixToAnchorDateKey(monthPrefix: string): string {
  return `${monthPrefix}-01`;
}

export function formatMonthLabelKo(monthPrefix: string): string {
  const [yearRaw, monthRaw] = monthPrefix.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthPrefix;
  return `${year}년 ${month}월`;
}

export function buildMonthDateKeys(monthPrefix: string): string[] {
  const anchor = parseHistoryDateKey(monthPrefixToAnchorDateKey(monthPrefix));
  if (!anchor) return [];
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return `${monthPrefix}-${day}`;
  });
}

export function countDaysInMonth(monthPrefix: string): number {
  const anchor = parseHistoryDateKey(monthPrefixToAnchorDateKey(monthPrefix));
  if (!anchor) return 30;
  return new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
}

export function shiftMonthPrefix(monthPrefix: string, deltaMonths: number): string {
  const anchor = parseHistoryDateKey(monthPrefixToAnchorDateKey(monthPrefix));
  if (!anchor || !Number.isFinite(deltaMonths)) return monthPrefix;
  const next = new Date(anchor.getFullYear(), anchor.getMonth() + deltaMonths, 1, 12, 0, 0, 0);
  const year = next.getFullYear();
  const month = String(next.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function canGoNextMonth(monthPrefix: string, todayDateKey: string): boolean {
  return monthPrefix < resolveMonthPrefix(todayDateKey);
}

/** 달력 그리드용 — 월=0 … 일=6, null은 빈 칸 */
export function buildMonthCalendarCells(monthPrefix: string): (number | null)[] {
  const daysInMonth = countDaysInMonth(monthPrefix);
  const leading = historyWeekdayIndexMondayZero(monthPrefixToAnchorDateKey(monthPrefix));
  const cells: (number | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}
