/** 스토어·저장소의 `YYYY-MM-DD` */
export function parseDayPlanDateKey(raw: unknown): { y: number; m: number; d: number } | null {
  const key = typeof raw === 'string' ? raw.trim() : '';
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** 차트 기준월 — `todayDateKey`가 비어 있거나 형식이 아니면 기기 오늘 */
export function resolveYearMonthFromDateKey(raw: unknown): { year: number; month: number } {
  const p = parseDayPlanDateKey(raw);
  if (p) return { year: p.y, month: p.m };
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth() + 1 };
}

/** 통계 등에서 항상 `YYYY-MM-DD` 문자열을 쓰도록 보정 */
export function coerceDayPlanDateKey(raw: unknown, fallback: () => string): string {
  const p = parseDayPlanDateKey(raw);
  if (p) {
    return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }
  return fallback();
}
