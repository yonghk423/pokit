import { parseHHmmToMinutes } from './parseTime';

const MAX_WATER_REMINDER_TIMES = 12;

/** 저장된 `HH:mm` 목록 정규화 — 중복 제거·시간순·상한 */
export function normalizeWaterReminderTimes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const t = item.trim();
    if (!t) continue;
    const m = parseHHmmToMinutes(t);
    if (m === null || m >= 24 * 60) continue;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const key = `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= MAX_WATER_REMINDER_TIMES) break;
  }
  out.sort((a, b) => (parseHHmmToMinutes(a) ?? 0) - (parseHHmmToMinutes(b) ?? 0));
  return out;
}

export { MAX_WATER_REMINDER_TIMES };
