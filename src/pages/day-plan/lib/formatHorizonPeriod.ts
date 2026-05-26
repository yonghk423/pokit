/** 주 시작일(월요일) 키 → `5월 4주차` */
export function formatWeekPeriodBadge(weekStartKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartKey);
  if (!m) return '';
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const weekIndex = Math.ceil(day / 7);
  return `${month}월 ${weekIndex}주차`;
}

export function formatMonthPeriodBadge(year: number, month: number): string {
  return `${year}년 ${month}월`;
}

/** 통계 완료 목록용 — `5월` */
export function formatMonthListLabel(month: number): string {
  return `${month}월`;
}

/** `YYYY-MM` → 통계 완료 목록용 `5월` */
export function formatMonthListLabelFromKey(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  return formatMonthListLabel(parseInt(m[2], 10));
}
