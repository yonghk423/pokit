import type { DayPlanStatsDayRow } from '@shared/lib/storage/dayPlanStatsHistoryStorage';

import { sumCompletionsForDay } from './statsDayMetrics';

export type DayInMonthSeriesPoint = {
  dateKey: string;
  dayOfMonth: number;
  total: number;
  /** 축용 `3일` */
  axisLabel: string;
};

export function countDaysInMonth(year: number, month1: number): number {
  const y = Number.isFinite(year) ? Math.floor(year) : new Date().getFullYear();
  const mo = Number.isFinite(month1) ? Math.min(12, Math.max(1, Math.floor(month1))) : 1;
  const dim = new Date(y, mo, 0, 12, 0, 0, 0).getDate();
  return Number.isFinite(dim) && dim > 0 ? dim : 31;
}

/** 해당 달의 1일~말일까지, 일별 완료 건수 시리즈 */
export function buildDaysInCalendarMonthSeries(
  mergedRows: DayPlanStatsDayRow[],
  year: number,
  month1: number,
): DayInMonthSeriesPoint[] {
  const y = Number.isFinite(year) ? Math.floor(year) : new Date().getFullYear();
  const m = Number.isFinite(month1) ? Math.min(12, Math.max(1, Math.floor(month1))) : 1;

  const map = new Map<string, number>();
  for (const r of mergedRows) {
    if (typeof r.dateKey !== 'string') continue;
    map.set(r.dateKey.trim(), sumCompletionsForDay(r));
  }

  const dim = countDaysInMonth(y, m);
  const out: DayInMonthSeriesPoint[] = [];
  for (let d = 1; d <= dim; d++) {
    const dateKey = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    out.push({
      dateKey,
      dayOfMonth: d,
      total: map.get(dateKey) ?? 0,
      axisLabel: `${d}일`,
    });
  }
  return out;
}
