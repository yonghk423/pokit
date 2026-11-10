import { calendarSourceLabel } from './calendarSourceLabel';
it.each([
  ['iCloud', 'caldav', 'Apple 캘린더'],
  ['person@gmail.com', 'caldav', 'Google 캘린더'],
  ['Gmail', 'caldav', 'Google 캘린더'],
  ['Google', 'caldav', 'Google 캘린더'],
  ['Default', 'local', 'Apple 캘린더 (iPhone 저장)'],
  ['Company', 'caldav', 'Company'],
  ['', '', '연결된 캘린더'],
])('labels %s without misidentifying generic accounts', (name, type, label) => {
  expect(calendarSourceLabel(name, type)).toBe(label);
});
