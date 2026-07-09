/** 스파인 타임라인 — 현재 시각이 블록 구간 안에 있는지 */
export function isSpineBlockActiveAtMinute(
  startMinutes: number,
  endMinutes: number,
  nowMinutes: number,
): boolean {
  const now = Math.max(0, Math.min(nowMinutes, 24 * 60));
  const start = Math.max(0, startMinutes);
  const end = Math.min(24 * 60, endMinutes);
  if (end <= start) return false;
  return now >= start && now < end;
}
