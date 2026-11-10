export type DeviceEvent = { id: string; calendarId: string; title: string; startDate: string | Date; endDate: string | Date; allDay?: boolean; calendarTitle?: string; sourceName?: string; sourceType?: string };
/** EventKit end dates are exclusive, including multi-day all-day events. */
export function eventsOnDay(events: DeviceEvent[], day: Date) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  return events.filter(event => {
    const from = new Date(event.startDate).getTime(), to = new Date(event.endDate).getTime();
    return from < end.getTime() && (to > start.getTime() || (from === to && from >= start.getTime()));
  }).sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || +new Date(a.startDate) - +new Date(b.startDate));
}
