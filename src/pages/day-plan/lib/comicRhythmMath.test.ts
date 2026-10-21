import { comicRhythmBalance, comicRhythmMinutes, comicRhythmPoint, comicRhythmDrag } from './comicRhythmMath';
it('computes normal, overnight, full-day and extended windows without losing day offsets', () => {
  expect(comicRhythmBalance('07:00', '23:00', false)).toMatchObject({ activity: 960, sleep: 480, fraction: 1 / 3 });
  expect(comicRhythmBalance('22:00', '06:00', true)).toMatchObject({ activity: 480, sleep: 960 });
  expect(comicRhythmBalance('07:00', '07:00', true)).toMatchObject({ activity: 1440, sleep: 0, fraction: 0.5 });
  expect(comicRhythmBalance('07:00', '23:00', true)).toMatchObject({ activity: 2400, sleep: 480, fraction: 5 / 6 });
  expect(comicRhythmBalance('07:00', '24:00', true)).toMatchObject({ activity: 1020, sleep: 420 });
});
it('maps dragging around a 48-hour circle consistently on different screen sizes', () => {
  for (const size of [260, 320, 390]) for (let minute = 0; minute < 2880; minute += 5) {
    const point = comicRhythmPoint(minute, size);
    expect(comicRhythmMinutes(point.x, point.y, size)).toBe(minute);
  }
});

it('keeps the two suns one day apart and mirrors next-day wake dragging without moving wrap-up', () => {
  const balance = comicRhythmBalance('07:00', '23:00', false);
  expect(balance.wakeMinutes - balance.startMinutes).toBe(1440);
  expect(comicRhythmDrag('wake', 1440 + 450, '07:00', '23:00', false)).toEqual({ start: '07:30', end: '23:00', nextDay: false });
  expect(comicRhythmDrag('end', 1440 + 60, '07:00', '23:00', false)).toEqual({ start: '07:00', end: '01:00', nextDay: true });
});
