/** 데일리 레이아웃(시간대별·타임라인)과 목록(bag) 연동 방식 */
export type PriorityLayoutLinkMode = 'linked' | 'independent';

export function normalizePriorityLayoutLinkMode(raw: unknown): PriorityLayoutLinkMode | null {
  if (raw === 'linked' || raw === 'independent') return raw;
  return null;
}
