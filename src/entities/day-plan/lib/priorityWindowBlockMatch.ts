import type { DayPlanBlock } from '../model/types';

/**
 * 저장된 일정 블록이 집중 구간(우선순위 한 덩어리)과 동일 시각대인지.
 * 집중 구간은 당일 HH:mm인데 블록만 `endsNextCalendarDay`로 저장된 경우(다음날까지 연장 등)에도
 * 동일 시각이면 같은 세션으로 보아 타임라인 중복 행을 숨긴다.
 */
export function blockMatchesPriorityHhmmWindow(
  block: DayPlanBlock,
  ps: number,
  pe: number,
  overnight: boolean,
): boolean {
  if (block.startMinutes !== ps || block.endMinutes !== pe) return false;
  const blockOvernight = Boolean(block.endsNextCalendarDay);
  if (blockOvernight === overnight) return true;
  /** 당일 집중 창 + 익일 종료 플래그만 다른 동일 시각 */
  if (!overnight && blockOvernight) return true;
  return false;
}
