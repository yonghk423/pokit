import type { TodoPriority } from '@entities/day-plan';

/** 첨부 레퍼런스 — 크림 배경·검정 테두리 표 스타일 */
export const TODO_LIST_CREAM = '#F7F3EB';
export const TODO_LIST_INK = '#111111';
export const TODO_LIST_BORDER = '#111111';
/** 완료 체크 — 진한 초록 */
export const TODO_DONE_GREEN = '#1A6B38';

export const TODO_PRIORITY_META: Record<
  TodoPriority,
  { label: string; dot: string }
> = {
  high: { label: '높음', dot: '#D94F4F' },
  medium: { label: '보통', dot: '#C9A227' },
  low: { label: '낮음', dot: '#4A9B5F' },
};

/** 모바일 한 화면 — 시간·상태 열 고정 폭 */
export const TODO_LAYOUT = {
  timeWidth: 64,
  statusWidth: 36,
  gap: 4,
} as const;
