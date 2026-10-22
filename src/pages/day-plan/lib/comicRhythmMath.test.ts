import { comicRhythmBalance, comicRhythmMinutes, comicRhythmPoint, comicRhythmDrag, comicRhythmDialLabels, comicRhythmHandleBoxes, COMIC_RHYTHM_DIAL_PAD, type RhythmBox } from './comicRhythmMath';
const overlaps = (a: RhythmBox, b: RhythmBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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

it('keeps day captions and hour numerals off the evening moon', () => {
  const size = 320;
  const balance = comicRhythmBalance('07:00', '23:00', false);
  const handles = [balance.startMinutes, balance.endAbsolute, balance.wakeMinutes];
  const labels = comicRhythmDialLabels(size, handles);
  const obstacles = handles.flatMap(minute => comicRhythmHandleBoxes(minute, size));
  const captions = [...labels.hours, labels.today, labels.nextDay];
  for (const caption of captions) for (const obstacle of obstacles) expect(overlaps(caption, obstacle)).toBe(false);
  for (const box of [...captions, ...obstacles]) {
    expect(box.x).toBeGreaterThanOrEqual(-COMIC_RHYTHM_DIAL_PAD);
    expect(box.y).toBeGreaterThanOrEqual(-COMIC_RHYTHM_DIAL_PAD);
    expect(box.x + box.w).toBeLessThanOrEqual(size + COMIC_RHYTHM_DIAL_PAD);
    expect(box.y + box.h).toBeLessThanOrEqual(size + COMIC_RHYTHM_DIAL_PAD);
  }
  expect(labels.nextDay.y).toBeGreaterThan(size * 0.7);
});

it('keeps the two suns one day apart and mirrors next-day wake dragging without moving wrap-up', () => {
  const balance = comicRhythmBalance('07:00', '23:00', false);
  expect(balance.wakeMinutes - balance.startMinutes).toBe(1440);
  expect(comicRhythmDrag('wake', 1440 + 450, '07:00', '23:00', false)).toEqual({ start: '07:30', end: '23:00', nextDay: false });
  expect(comicRhythmDrag('end', 1440 + 60, '07:00', '23:00', false)).toEqual({ start: '07:00', end: '01:00', nextDay: true });
});
