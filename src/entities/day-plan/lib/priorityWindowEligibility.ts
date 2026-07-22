import { getLocalDateKey } from './localDateKey';
import { getLocalMinutesOfDayNow } from './dayPlanTime';
import { parseHHmmToMinutes } from './parseTime';

export type PriorityWindowContext = {
  planMode: string;
  priorityStart: string;
  priorityEnd: string;
  priorityPlanDateKey: string;
  priorityPlanDateKeyEnd: string;
  nowKey?: string;
  nowMin?: number;
};

function readPriorityWindowBounds(ctx: PriorityWindowContext) {
  const ps = parseHHmmToMinutes(ctx.priorityStart);
  const pe = parseHHmmToMinutes(ctx.priorityEnd);
  if (ps === null || pe === null) return null;

  const rangeLo =
    ctx.priorityPlanDateKey <= ctx.priorityPlanDateKeyEnd
      ? ctx.priorityPlanDateKey
      : ctx.priorityPlanDateKeyEnd;
  const rangeHi =
    ctx.priorityPlanDateKey <= ctx.priorityPlanDateKeyEnd
      ? ctx.priorityPlanDateKeyEnd
      : ctx.priorityPlanDateKey;
  const nowKey = ctx.nowKey ?? getLocalDateKey();
  const nowMin = ctx.nowMin ?? getLocalMinutesOfDayNow();
  const inRange = nowKey >= rangeLo && nowKey <= rangeHi;

  return { ps, pe, rangeLo, rangeHi, nowKey, nowMin, inRange };
}

/**
 * 우선순위 적용일·집중 구간 안이면 true.
 * 날짜 범위는 연속 구간(시작일~종료일 pe)으로 본다 — `rollPriorityPlanForwardIfEnded` 와 동일.
 */
export function isPriorityWindowEligible(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  const { pe, nowKey, nowMin, inRange, rangeHi } = bounds;
  if (!inRange) return false;

  // 종료일 전이면 아직 유효 (다음날 종료·자정 넘김 포함)
  if (nowKey < rangeHi) return true;
  return nowMin < pe;
}

/**
 * 집중 구간이 이미 끝났는지(시작 전 아님).
 * 종료일(rangeHi)의 pe 이후에만 true — 시작일에 pe 시계만 지나도 끝나지 않음.
 */
export function isPriorityWindowEndedForToday(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  const { pe, nowKey, nowMin, inRange, rangeHi } = bounds;
  if (!inRange) return false;

  if (nowKey < rangeHi) return false;
  return nowMin >= pe;
}
