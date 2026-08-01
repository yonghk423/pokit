/** 데이플랜 타임라인 앵커·구간 배지 — 라벨·테두리용 기본 잉크 */
export function dayPlanAnchorIconColor(isDark: boolean): string {
  void isDark;
  return '#000000';
}

export function dayPlanAnchorNodeBackground(isDark: boolean): string {
  void isDark;
  return 'transparent';
}

/** 하루 시작(해) — 시간대「아침」과 같은 골든 톤 */
export function dayPlanDayStartIconColor(isDark: boolean): string {
  return isDark ? '#FFB020' : '#F59E0B';
}

/** 하루 마무리(달) — 시간대「밤」과 같은 노랑 톤 */
export function dayPlanDayEndIconColor(isDark: boolean): string {
  return isDark ? '#E8C547' : '#D4A017';
}

export const DAY_PLAN_ANCHOR_ICON_SIZE = 18;
