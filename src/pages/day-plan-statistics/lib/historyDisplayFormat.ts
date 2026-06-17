/** 달력 농도 등 — 완료한 항목 개수 */
export function formatHistoryCountKo(count: number): string {
  return `${Math.max(0, Math.round(count))}개`;
}

/** 히스토리·통계 — 카테고리별 완료 횟수(빈도) */
export function formatHistoryFrequencyKo(count: number): string {
  return `${Math.max(0, Math.round(count))}회`;
}

/** @deprecated formatHistoryFrequencyKo 사용 */
export function formatHistoryCompletionKo(count: number): string {
  return formatHistoryFrequencyKo(count);
}

/** 히스토리에서 서로 다른 완료 카테고리 수 */
export function formatHistoryCategoryVarietyKo(count: number): string {
  return `${Math.max(0, Math.round(count))}가지`;
}
