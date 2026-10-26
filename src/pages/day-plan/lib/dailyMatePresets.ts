/** 온보딩·건너뛰기에 쓰는 기본 하루 일과 구간 */
export const DEFAULT_DAILY_RHYTHM = {
  start: '07:00',
  end: '23:00',
} as const;

export function isDefaultDailyRhythm(start: string, end: string): boolean {
  return start === DEFAULT_DAILY_RHYTHM.start && end === DEFAULT_DAILY_RHYTHM.end;
}
