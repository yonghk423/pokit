/**
 * 목표 상세 저장·세션 UI는 `other`와 동일(체크리스트)이나 카테고리 키는 분리해
 * 담기·우선순위에서 항목을 구분한다.
 * (표준 루틴 정리 후 — customFlow만 other 스타일 UI 사용)
 */
export const GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS = [] as const;

export type GoalDetailChecklistDerivedCategoryKey =
  (typeof GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS)[number];

const checklistDerivedSet = new Set<string>(GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS);

export function isGoalDetailChecklistDerivedCategoryKey(
  v: string,
): v is GoalDetailChecklistDerivedCategoryKey {
  return checklistDerivedSet.has(v);
}

export function isGoalDetailChecklistStyleCategoryKey(v: string): boolean {
  return v === 'other' || isGoalDetailChecklistDerivedCategoryKey(v);
}
