/** 히스토리 집계용 날짜 키 — 정오(12:00) 기준으로 DST/날짜 밀림 완화 */
export function parseHistoryDateKey(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function historyDateToKey(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function addDaysToHistoryDateKey(dateKey: string, deltaDays: number): string {
  const d = parseHistoryDateKey(dateKey);
  if (!d || !Number.isFinite(deltaDays)) return dateKey;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays, 12, 0, 0, 0);
  return historyDateToKey(next);
}

export function historyDateKeyToday(): string {
  return historyDateToKey(new Date());
}

export function historyWeekday(dateKey: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const date = parseHistoryDateKey(dateKey);
  if (!date) return 0;
  return date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function historyStartOfWeekMonday(dateKey: string): string {
  const d = parseHistoryDateKey(dateKey);
  if (!d) return dateKey;
  const weekday = (d.getDay() + 6) % 7;
  return addDaysToHistoryDateKey(dateKey, -weekday);
}
