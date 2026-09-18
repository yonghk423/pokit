import { getLocalMinutesOfDayNow } from './dayPlanTime';
import { getLocalDateKey } from './localDateKey';
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
  const inRange = nowKey >= rangeLo && nowKey <= rangeHi;

  return { ps, pe, rangeLo, rangeHi, nowKey, nowMin, inRange };
}

/**
 * 마무리 시각이 다음 달력 날짜에 붙는지.
 * 에디터에서 당일 00:00/24:00은 저장 불가라, 자정 마무리는 항상 다음날이다.
 */
export function priorityEndLandsOnNextCalendarDay(startHhmm: string, endHhmm: string): boolean {
  const pe = parseHHmmToMinutes(endHhmm.trim());
  if (pe === 0 || pe === 24 * 60) return true;
  return isOvernightPriorityWindow(startHhmm, endHhmm);
}

/**
 * 저장된 `24:00`이 「종료일 00:00」인지.
 * 같은 날 24:00은 그날의 끝(1440분)이고, 이틀 구간이면 화면의 다음날 00:00이다.
 */
function isStoredNextDayMidnight(pe: number, rangeLo: string, rangeHi: string): boolean {
  return pe === 24 * 60 && rangeLo !== rangeHi;
}

/**
 * 집중 구간이 현재 시각 기준으로 끝났는지.
 * `00:00`과 이틀 구간의 `24:00`은 종료일 00:00에 이미 끝난 것으로 본다.
 */
export function isPriorityPlanWindowEnded(input: {
  startHhmm: string;
  endHhmm: string;
  rangeLo: string;
  rangeHi: string;
  nowKey: string;
  nowMin: number;
}): boolean {
  const pe = parseHHmmToMinutes(input.endHhmm.trim());
  if (pe === null) return false;
  if (input.nowKey > input.rangeHi) return true;
  if (input.nowKey < input.rangeHi) return false;
  if (pe === 0 || isStoredNextDayMidnight(pe, input.rangeLo, input.rangeHi)) return true;
  return input.nowMin >= pe;
}

/**
 * hydrate keepRange용 — 시각(nowMin)에 의존하지 않고, 종료일 자정이 이미 지났는지만 본다.
 */
export function isPriorityPlanRangeExpiredOnDate(input: {
  startHhmm: string;
  endHhmm: string;
  rangeLo: string;
  rangeHi: string;
  todayKey: string;
}): boolean {
  if (input.rangeHi < input.todayKey) return true;
  if (input.rangeHi > input.todayKey) return false;
  const pe = parseHHmmToMinutes(input.endHhmm.trim());
  if (pe === null) return false;
  return pe === 0 || isStoredNextDayMidnight(pe, input.rangeLo, input.rangeHi);
}

export function isPriorityWindowEligible(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  if (!bounds.inRange) return false;
  return !isPriorityPlanWindowEnded({
    startHhmm: ctx.priorityStart,
    endHhmm: ctx.priorityEnd,
    rangeLo: bounds.rangeLo,
    rangeHi: bounds.rangeHi,
    nowKey: bounds.nowKey,
    nowMin: bounds.nowMin,
  });
}

export function isPriorityWindowEndedForToday(ctx: PriorityWindowContext): boolean {
  if (ctx.planMode !== 'priority') return false;
  const bounds = readPriorityWindowBounds(ctx);
  if (!bounds) return false;
  if (!bounds.inRange) return false;
  return isPriorityPlanWindowEnded({
    startHhmm: ctx.priorityStart,
    endHhmm: ctx.priorityEnd,
    rangeLo: bounds.rangeLo,
    rangeHi: bounds.rangeHi,
    nowKey: bounds.nowKey,
    nowMin: bounds.nowMin,
  });
}
