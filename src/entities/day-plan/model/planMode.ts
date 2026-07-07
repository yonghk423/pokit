/**
 * 오늘 일정(day-plan)의 작성/조작 모드.
 * - `priority`: 데일리 — 우선순위 카드/시간대 모드(주 경험)
 * - `todoList`: 투두 — 상단 모드 스위치에서 접근하는 할 일 표
 * - `reading`: 독서 — 상단 모드 스위치에서 독서 설정으로 빠른 진입
 * - `quickMemo`: 자유 메모 모드
 * - `dayNote`: 독립 노트 — 루틴과 분리된 문서 편집
 */
export type PlanMode = 'priority' | 'todoList' | 'reading' | 'quickMemo' | 'dayNote';
