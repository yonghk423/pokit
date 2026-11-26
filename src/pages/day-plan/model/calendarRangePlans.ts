import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export type CalendarPlan = { id: string; name: string; start: string; end: string; color: string; visibleOnCalendar?: boolean };
export const rangePlansKey = 'pokit:calendar-range-plans-v1';
const maxVisiblePlans = 5;

export function readPlans() {
  const stored = localStorageClient.getJson<CalendarPlan[]>(rangePlansKey) ?? [];
  const selected = stored.filter(plan => plan.visibleOnCalendar === true);
  return stored.map(plan => {
    if (plan.visibleOnCalendar !== undefined) return plan;
    const visibleOnCalendar = !reachesPlanLimit(selected, plan);
    if (visibleOnCalendar) selected.push(plan);
    return { ...plan, visibleOnCalendar };
  });
}
export function usedPlanColors(plans: CalendarPlan[], draft: Pick<CalendarPlan, 'id' | 'start' | 'end'>) {
  return new Set(plans
    .filter(plan => plan.visibleOnCalendar !== false && plan.id !== draft.id && plan.start <= draft.end && plan.end >= draft.start)
    .map(plan => plan.color));
}

export function reachesPlanLimit(plans: CalendarPlan[], draft: CalendarPlan) {
  const firstMonth = draft.start.slice(0, 7);
  const lastMonth = draft.end.slice(0, 7);
  const overlapping = plans.filter(plan =>
    plan.visibleOnCalendar !== false && plan.id !== draft.id &&
    plan.start.slice(0, 7) <= lastMonth && plan.end.slice(0, 7) >= firstMonth,
  );
  const checkpoints = [firstMonth, ...overlapping.map(plan => plan.start.slice(0, 7)).filter(month => month >= firstMonth)];
  return checkpoints.some(month =>
    overlapping.filter(plan => plan.start.slice(0, 7) <= month && month <= plan.end.slice(0, 7)).length >= maxVisiblePlans,
  );
}

export function plansOnDate(plans: CalendarPlan[], date: string) {
  return plans.filter(plan => plan.visibleOnCalendar !== false && plan.start <= date && date <= plan.end);
}
