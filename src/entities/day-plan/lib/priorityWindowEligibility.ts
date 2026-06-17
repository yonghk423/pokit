import { getLocalDateKey } from './localDateKey';
import { getLocalMinutesOfDayNow } from './dayPlanTime';
import { parseHHmmToMinutes } from './parseTime';
import { isOvernightPriorityWindow } from './priorityRoutineWindow';

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
  const overnight = isOvernightPriorityWindow(ctx.priorityStart, ctx.priorityEnd);
  const inRange = nowKey >= rangeLo && nowKey <= rangeHi;

  return { ps, pe, rangeLo, rangeHi, nowKey, nowMin, overnight, inRange };
}

/** 우선순위 적용일·집중 구간 안이면 true */
export function isPriorityWindowEligible(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  const { pe, nowKey, nowMin, overnight, inRange, rangeLo, rangeHi } = bounds;
  if (!inRange) return false;

  let stillInPrioritySegment = false;
  if (!overnight) {
    stillInPrioritySegment = nowMin < pe;
  } else if (nowKey === rangeLo) {
    stillInPrioritySegment = true;
  } else if (nowKey === rangeHi) {
    stillInPrioritySegment = nowMin < pe;
  } else {
    stillInPrioritySegment = nowKey > rangeLo && nowKey < rangeHi;
  }
  return stillInPrioritySegment;
}

/** 당일 기준으로 집중 구간이 이미 끝났는지(시작 전 아님) */
export function isPriorityWindowEndedForToday(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  const { pe, nowKey, nowMin, overnight, inRange, rangeLo, rangeHi } = bounds;
  if (!inRange) return false;

  if (!overnight) {
    return nowMin >= pe;
  }
  if (nowKey === rangeLo) return false;
  if (nowKey === rangeHi) return nowMin >= pe;
  return false;
}
