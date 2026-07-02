/**
 * 오늘 일정(day-plan)의 작성/조작 모드.
 * - `priority`: 데일리 — 우선순위 카드/시간대 모드(주 경험)
 * - `todoList`: 투두 — 사용자 직접 입력·시간 조절 할 일 표
 * - `quickMemo`: 자유 메모 모드
 */
export type PlanMode = 'priority' | 'todoList' | 'quickMemo';
