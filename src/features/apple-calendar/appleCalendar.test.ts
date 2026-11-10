import { deviceCalendars, deviceEvents, useAppleCalendar } from './appleCalendar';
import * as Calendar from 'expo-calendar/legacy';
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: () => [], setJson: jest.fn() } }));
jest.mock('expo-calendar/legacy', () => ({ EntityTypes: { EVENT: 'event' }, requestCalendarPermissionsAsync: jest.fn(), getCalendarPermissionsAsync: jest.fn(), getCalendarsAsync: jest.fn(), getEventsAsync: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); jest.mocked(Calendar.getCalendarPermissionsAsync).mockResolvedValue({ granted: true } as never); jest.mocked(Calendar.getCalendarsAsync).mockResolvedValue([{ id: 'selected', title: 'Personal', color: '#000', source: { name: 'iCloud' } }] as never); jest.mocked(Calendar.getEventsAsync).mockResolvedValue([]); });
it('does not prompt for permission while reading and queries only selected calendars that still exist', async () => {
  const start = new Date(2026, 10, 1), end = new Date(2026, 11, 1);
  await deviceEvents(['selected', 'deleted'], start, end);
  expect(Calendar.getEventsAsync).toHaveBeenCalledWith(['selected'], start, end);
  expect(Calendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
});
it('does not read events after permission is revoked', async () => {
  jest.mocked(Calendar.getCalendarPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await expect(deviceEvents(['selected'], new Date(), new Date())).rejects.toThrow('permission_denied');
  expect(Calendar.getEventsAsync).not.toHaveBeenCalled();
});
it('prompts only when the user connects and rejects denial before reading calendars', async () => {
  jest.mocked(Calendar.requestCalendarPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await expect(deviceCalendars(true)).rejects.toThrow('permission_denied');
  expect(Calendar.getCalendarsAsync).not.toHaveBeenCalled();
});
it('does not access the calendar API while disconnected', async () => {
  expect(await deviceEvents([], new Date(), new Date())).toEqual([]);
  expect(Calendar.getCalendarPermissionsAsync).not.toHaveBeenCalled();
});

it('lists all device providers and queries both selected Apple and Google calendars', async () => {
  jest.mocked(Calendar.getCalendarsAsync).mockResolvedValue([
    { id: 'apple', title: 'Personal', color: '#000', source: { name: 'iCloud', type: 'mobileme' } },
    { id: 'local', title: 'Local', color: '#000', source: { name: 'Default', type: 'local' } },
    { id: 'google', title: 'Google', color: '#000', source: { name: 'person@gmail.com', type: 'caldav' } },
  ] as never);
  expect((await deviceCalendars()).map(calendar => calendar.id)).toEqual(['apple', 'local', 'google']);
  const start = new Date(2026, 10, 1), end = new Date(2026, 11, 1);
  await deviceEvents(['apple', 'google'], start, end);
  expect(Calendar.getEventsAsync).toHaveBeenCalledWith(['apple', 'google'], start, end);
});

it('reports stale selections instead of claiming that a calendar has no events', async () => {
  await expect(deviceEvents(['removed-calendar'], new Date(2026, 10, 1), new Date(2026, 11, 1))).rejects.toThrow('calendar_selection_expired');
  expect(Calendar.getEventsAsync).not.toHaveBeenCalled();
});

it('disconnects all selected calendars and keeps them empty when reconnecting', async () => {
  useAppleCalendar.getState().select(['selected']);
  useAppleCalendar.getState().disconnect();
  expect(useAppleCalendar.getState().ids).toEqual([]);
  expect(useAppleCalendar.getState().disconnected).toBe(true);
  expect(await deviceEvents(useAppleCalendar.getState().ids, new Date(), new Date())).toEqual([]);
  expect(Calendar.getCalendarPermissionsAsync).not.toHaveBeenCalled();
  useAppleCalendar.getState().reconnect();
  expect(useAppleCalendar.getState().disconnected).toBe(false);
  expect(useAppleCalendar.getState().ids).toEqual([]);
});
