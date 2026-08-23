const MIN_LEAD_MS = 1500;
const DEFAULT_ROLLING_DAYS = 7;

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 지정한 시·분의 다음 발화부터 `count`일간 절대 시각을 만든다.
 * 이미 지난 시각(또는 1.5초 이내)은 건너뛴다.
 */
export function buildNextDailyReminderDates(
  hour: number,
  minute: number,
  count: number = DEFAULT_ROLLING_DAYS,
  now: Date = new Date(),
): Date[] {
  const safeCount = Math.max(0, Math.floor(count));
  const cursor = new Date(now);
  cursor.setSeconds(0, 0);
  cursor.setHours(hour, minute, 0, 0);
  if (cursor.getTime() <= now.getTime() + MIN_LEAD_MS) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(hour, minute, 0, 0);
  }

  const dates: Date[] = [];
  for (let index = 0; index < safeCount; index += 1) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(hour, minute, 0, 0);
  }
  return dates;
}
