import { eventsOnDay, type DeviceEvent } from './calendarDates';
const event = (startDate: Date, endDate: Date, allDay = false): DeviceEvent => ({ id: 'event', calendarId: 'calendar', title: 'Plan', startDate, endDate, allDay });
it('keeps multi-day events on each overlapping date and excludes the midnight end date', () => {
  const value = event(new Date(2026, 10, 8), new Date(2026, 10, 10), true);
  expect(eventsOnDay([value], new Date(2026, 10, 8))).toEqual([value]);
  expect(eventsOnDay([value], new Date(2026, 10, 9))).toEqual([value]);
  expect(eventsOnDay([value], new Date(2026, 10, 10))).toEqual([]);
});
it('includes overnight and zero-duration events on the correct local dates', () => {
  const overnight = event(new Date(2026, 10, 8, 23), new Date(2026, 10, 9, 2));
  const instant = event(new Date(2026, 10, 9, 12), new Date(2026, 10, 9, 12));
  expect(eventsOnDay([overnight, instant], new Date(2026, 10, 9))).toEqual([overnight, instant]);
  expect(eventsOnDay([overnight, instant], new Date(2026, 10, 10))).toEqual([]);
});
it('sorts all-day events before timed events without mutating the input', () => {
  const timed = event(new Date(2026, 10, 9, 8), new Date(2026, 10, 9, 9));
  const allDay = event(new Date(2026, 10, 9), new Date(2026, 10, 10), true);
  const input = [timed, allDay];
  expect(eventsOnDay(input, new Date(2026, 10, 9))).toEqual([allDay, timed]);
  expect(input).toEqual([timed, allDay]);
});
