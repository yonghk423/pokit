import { clampDialHandle, cycleMinutesToClockHhmm } from '@widgets/daily-rhythm-time-field/math';
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
  const angle = minutes / 2880 * Math.PI * 2 - Math.PI / 2;
  return { x: size / 2 + Math.cos(angle) * size * radius / 360, y: size / 2 + Math.sin(angle) * size * radius / 360 };
}
export function comicRhythmMinutes(x: number, y: number, size: number) {
  const angle = (Math.atan2(y - size / 2, x - size / 2) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
  return Math.round(angle / (Math.PI * 2) * 2880 / 5) * 5 % 2880;
}
export function comicRhythmHhmm(minutes: number) { return cycleMinutesToClockHhmm(minutes, false); }
export function comicRhythmDrag(kind: 'start' | 'end' | 'wake', minutes: number, start: string, end: string, nextDay: boolean) {
  const balance = comicRhythmBalance(start, end, nextDay);
  const moved = clampDialHandle(kind, minutes, balance.startMinutes, balance.endAbsolute, undefined, 5);
  return { start: cycleMinutesToClockHhmm(moved.start, false), end: cycleMinutesToClockHhmm(moved.end, true), nextDay: moved.end >= 1440 };
}
