import type { DayPlanBlock } from '../model/types';

/** 저장된 일정 블록이 집중 구간(우선순위 한 덩어리)과 동일 시각대인지 */
export function blockMatchesPriorityHhmmWindow(
  block: DayPlanBlock,
  ps: number,
  pe: number,
  overnight: boolean,
): boolean {
  const blockOvernight = Boolean(block.endsNextCalendarDay);
  return blockOvernight === overnight && block.startMinutes === ps && block.endMinutes === pe;
}
