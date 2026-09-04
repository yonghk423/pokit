/**
 * "9:00", "09:00" → 하루 기준 분. 실패 시 null
 * 종료 시각 한정으로 **24:00**(자정·하루 끝) → 1440분 허용
 */
export function parseHHmmToMinutes(input: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour === 24 && minute === 0) return 24 * 60;
  if (hour > 23 || minute > 59 || hour < 0 || minute < 0) return null;
  return hour * 60 + minute;
}
