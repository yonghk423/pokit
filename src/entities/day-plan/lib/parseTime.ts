/**
 * "9:00", "09:00" → 하루 기준 분. 실패 시 null
 * 종료 시각 한정으로 **24:00**(자정·하루 끝) → 1440 분 허용
 */
export function parseHHmmToMinutes(input: string): number | null {
  const t = input.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min)) return null;
  if (h === 24 && min === 0) return 24 * 60;
  if (h > 23 || min > 59 || h < 0 || min < 0) return null;
  return h * 60 + min;
}
