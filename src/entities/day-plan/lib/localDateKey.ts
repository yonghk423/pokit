/** 로컬 캘린더 기준 `YYYY-MM-DD` */
export function getLocalDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 정오(12:00) 기준으로 파싱 — DST 경계에서 날짜 밀림 완화 */
export function parseLocalDateKeyToDate(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function localDateToDateKey(d: Date): string {
  return getLocalDateKey(d);
}

/** `YYYY-MM-DD`에 일수를 더합니다 (로컬 캘린더). */
export function addDaysToLocalDateKey(dateKey: string, deltaDays: number): string {
  const d = parseLocalDateKeyToDate(dateKey);
  if (!d || !Number.isFinite(deltaDays)) return dateKey;
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays, 12, 0, 0, 0);
  return getLocalDateKey(next);
}
