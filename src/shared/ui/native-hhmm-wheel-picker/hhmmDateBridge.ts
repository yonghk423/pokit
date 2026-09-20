import { parseHHmmToMinutes } from '@shared/lib/time/parseHhmmToMinutes';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * `HH:mm` / `24:00` → Date(오늘 날짜 + 시·분).
 * `24:00`은 피커에서 자정(00:00)으로 표시한다.
 */
export function hhmmToPickerDate(hhmm: string, fallbackTotalMinutes = 7 * 60): Date {
  const parsed = parseHHmmToMinutes(hhmm.trim());
  let total = parsed ?? fallbackTotalMinutes;
  if (total >= 24 * 60) total = 0;
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  const date = new Date();
  date.setSeconds(0, 0);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * Date → `HH:mm`. `mapMidnightToEndOfDay`면 00:00을 `24:00`으로 저장.
 */
export function pickerDateToHhmm(
  date: Date,
  mapMidnightToEndOfDay = false,
): string {
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (mapMidnightToEndOfDay && hour === 0 && minute === 0) return '24:00';
  return `${pad2(hour)}:${pad2(minute)}`;
}
