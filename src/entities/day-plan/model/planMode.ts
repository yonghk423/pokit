/**
 * 오늘 일정(day-plan)의 작성/조작 모드.
 * - `priority`: 데일리 — 우선순위 카드/시간대 모드(주 경험)
 * - `weekly`: 위클리 — 주간 달력 + 목표 추적
 * - `monthly`: 먼슬리 — 월간 달력 + 목표 추적
 * - `quickMemo`: 자유 메모 모드
 */
export type PlanMode = 'priority' | 'weekly' | 'monthly' | 'quickMemo';
