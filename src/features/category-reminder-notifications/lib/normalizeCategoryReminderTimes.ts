import { parseHHmmToMinutes } from '@entities/day-plan';

/** "9:30" / "09:30" → 저장·스케줄용 `HH:mm`. `24:00`·불법 값은 제외 */
export function normalizeHhmmForDailyReminder(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const m = parseHHmmToMinutes(t);
  if (m === null || m >= 24 * 60) return null;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** 쉼표·줄바꿈으로 구분된 문자열 → 정규화·중복 제거·시간순 */
export function parseReminderTimesInput(input: string): string[] {
  const parts = input
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const n = normalizeHhmmForDailyReminder(p);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  out.sort((a, b) => {
    const ma = parseHHmmToMinutes(a) ?? 0;
    const mb = parseHHmmToMinutes(b) ?? 0;
    return ma - mb;
  });
  return out;
}
