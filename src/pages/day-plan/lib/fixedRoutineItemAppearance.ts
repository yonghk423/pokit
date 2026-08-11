/**
 * 고정 루틴 항목의 아이콘은 적용 상태가 아니라 카테고리 정체성 색상을 유지한다.
 * 적용 여부는 스위치·일정 포함 상태로 따로 표현한다.
 */
export function resolveFixedRoutineItemIconColor(input: {
  categoryAccentColor: string;
  isInTodayPlan: boolean;
}): string {
  return input.categoryAccentColor;
}
