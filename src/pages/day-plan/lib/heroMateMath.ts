import { clampDialHandle, cycleMinutesToClockHhmm } from '@widgets/daily-mate-time-field/math';
export function comicRhythmBalance(start: string, end: string, nextDay: boolean) {
  const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  const startMinutes = minutes(start), endMinutes = minutes(end);
  const endAbsolute = endMinutes === 1440 ? 1440 : endMinutes + (nextDay ? 1440 : 0);
  const activity = Math.max(0, endAbsolute - startMinutes);
  let nextWake = startMinutes + 1440;
  while (nextWake < endAbsolute) nextWake += 1440;
  return { startMinutes, endMinutes: endMinutes % 1440, endAbsolute, wakeMinutes: startMinutes + 1440, activity, sleep: Math.max(0, nextWake - endAbsolute), fraction: Math.min(1, activity / 2880) };
}
export function comicRhythmPoint(minutes: number, size: number, radius = 128) {
  'worklet';
  const angle = minutes / 2880 * Math.PI * 2 - Math.PI / 2;
  return { x: size / 2 + Math.cos(angle) * size * radius / 360, y: size / 2 + Math.sin(angle) * size * radius / 360 };
}
export function comicRhythmMinutes(x: number, y: number, size: number, step = 5) {
  'worklet';
  const angle = (Math.atan2(y - size / 2, x - size / 2) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  return Math.round(angle / (Math.PI * 2) * 2880 / step) * step % 2880;
}
export function comicRhythmHhmm(minutes: number) { return cycleMinutesToClockHhmm(minutes, false); }
export type RhythmBox = { x: number; y: number; w: number; h: number };

/** Room around the dial so outward times stay off the scenes below. */
export const COMIC_RHYTHM_DIAL_PAD = 22;

const HANDLE_ICON = 28;
const HANDLE_TIME_OUT = 26;
const HANDLE_TIME_W = 42;
const HANDLE_TIME_H = 16;
const HOUR_W = 24;
const HOUR_H = 16;
const DAY_W = 64;
const DAY_H = 14;

function centeredBox(point: { x: number; y: number }, w: number, h: number): RhythmBox {
  return { x: point.x - w / 2, y: point.y - h / 2, w, h };
}

function boxesOverlap(a: RhythmBox, b: RhythmBox, gap = 3): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

/** Icon on the ring, clock time further outward so it does not sit on the symbol. */
export function comicRhythmHandleBoxes(minutes: number, size: number): RhythmBox[] {
  const point = comicRhythmPoint(minutes, size, 164);
  const angle = minutes / 2880 * Math.PI * 2 - Math.PI / 2;
  return [
    centeredBox(point, HANDLE_ICON, HANDLE_ICON),
    centeredBox(
      { x: point.x + Math.cos(angle) * HANDLE_TIME_OUT, y: point.y + Math.sin(angle) * HANDLE_TIME_OUT },
      HANDLE_TIME_W,
      HANDLE_TIME_H,
    ),
  ];
}

/** Slide a label along the dial so it clears handles without jumping across the circle. */
export function shiftBoxClearOf(box: RhythmBox, obstacles: RhythmBox[], size: number): RhythmBox {
  const center = size / 2;
  let next = { ...box };
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    for (const obstacle of obstacles) {
      if (!boxesOverlap(next, obstacle)) continue;
      const cx = next.x + next.w / 2 - center;
      const cy = next.y + next.h / 2 - center;
      const hx = obstacle.x + obstacle.w / 2 - center;
      const hy = obstacle.y + obstacle.h / 2 - center;
      const len = Math.hypot(cx, cy) || 1;
      let tx = -cy / len;
      let ty = cx / len;
      if (tx * (cx - hx) + ty * (cy - hy) < 0) {
        tx = -tx;
        ty = -ty;
      }
      const overlapX = Math.min(next.x + next.w, obstacle.x + obstacle.w) - Math.max(next.x, obstacle.x);
      const overlapY = Math.min(next.y + next.h, obstacle.y + obstacle.h) - Math.max(next.y, obstacle.y);
      const along = Math.abs(tx) * overlapX + Math.abs(ty) * overlapY + 1;
      next = { ...next, x: next.x + tx * along, y: next.y + ty * along };
      moved = true;
    }
    if (!moved) break;
  }
  return next;
}

function boundsOf(boxes: RhythmBox[]): RhythmBox {
  const x = Math.min(...boxes.map(box => box.x));
  const y = Math.min(...boxes.map(box => box.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map(box => box.x + box.w)) - x,
    h: Math.max(...boxes.map(box => box.y + box.h)) - y,
  };
}

/** Hour numerals and day captions, kept off the sun and moon handles. */
export function comicRhythmDialLabels(size: number, handleMinutes: number[]) {
  const obstacles = handleMinutes.flatMap(minute => comicRhythmHandleBoxes(minute, size));
  const hourAt = (minutes: number) => centeredBox(comicRhythmPoint(minutes, size, 150), HOUR_W, HOUR_H);
  const dayAt = (minutes: number) => centeredBox(comicRhythmPoint(minutes, size, 176), DAY_W, DAY_H);
  const placePair = (minutes: number) => {
    const hour = hourAt(minutes);
    const day = dayAt(minutes);
    const group = boundsOf([hour, day]);
    const cleared = shiftBoxClearOf(group, obstacles, size);
    const dx = cleared.x - group.x;
    const dy = cleared.y - group.y;
    return {
      hour: { ...hour, x: hour.x + dx, y: hour.y + dy },
      day: { ...day, x: day.x + dx, y: day.y + dy },
    };
  };
  const top = placePair(0);
  const bottom = placePair(1440);
  const placed = [top.hour, top.day, bottom.hour, bottom.day];
  const right = shiftBoxClearOf(hourAt(720), [...obstacles, ...placed], size);
  const left = shiftBoxClearOf(hourAt(2160), [...obstacles, ...placed, right], size);
  return { hours: [top.hour, right, bottom.hour, left], today: top.day, nextDay: bottom.day };
}

export function comicRhythmDrag(kind: 'start' | 'end' | 'wake', minutes: number, start: string, end: string, nextDay: boolean) {
  const balance = comicRhythmBalance(start, end, nextDay);
  const moved = clampDialHandle(kind, minutes, balance.startMinutes, balance.endAbsolute, undefined, 5);
  return { start: cycleMinutesToClockHhmm(moved.start, false), end: cycleMinutesToClockHhmm(moved.end, true), nextDay: moved.end >= 1440 };
}
