import { addDaysToLocalDateKey, parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';

export const HORIZON_WEEKDAY_SHORT_KO = ['월', '화', '수', '목', '금', '토', '일'] as const;

export type HorizonWeekDayCell = {
  dateKey: string;
  weekdayLabel: (typeof HORIZON_WEEKDAY_SHORT_KO)[number];
  dayOfMonth: number;
};

/** 해당 날짜가 속한 주의 월요일 `YYYY-MM-DD` */
export function getHorizonWeekStartKey(dateKey: string): string {
  const d = parseLocalDateKeyToDate(dateKey);
  if (!d) return dateKey;
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDaysToLocalDateKey(dateKey, mondayOffset);
}

/** `weekStartKey`(월요일)부터 7일 */
export function buildHorizonWeekDays(weekStartKey: string): HorizonWeekDayCell[] {
  return HORIZON_WEEKDAY_SHORT_KO.map((weekdayLabel, index) => {
    const dateKey = addDaysToLocalDateKey(weekStartKey, index);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    const dayOfMonth = m ? parseInt(m[3], 10) : 0;
    return { dateKey, weekdayLabel, dayOfMonth };
  });
}
