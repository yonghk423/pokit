import { calendarDisplayTitle } from './calendarDisplayTitle';
it('makes UUID titles readable without confusing calendars with the same provider', () => {
  expect(calendarDisplayTitle('2B344F23-2D1F-471C-87C1-62542E5EC3D4', true)).toBe('이름 미지정 캘린더 · C3D4');
  expect(calendarDisplayTitle('집', true)).toBe('집');
  expect(calendarDisplayTitle('person@gmail.com', false)).toBe('person@gmail.com');
});
