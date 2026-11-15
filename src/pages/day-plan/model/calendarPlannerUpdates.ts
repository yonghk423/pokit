let revision = 0;
const listeners = new Set<() => void>();
export const calendarPlannerRevision = () => revision;
export const subscribeCalendarPlanner = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export function notifyCalendarPlannerUpdated() {
  revision += 1;
  listeners.forEach(listener => listener());
}
