import { parseHHmmToMinutes } from './parseTime';

/**
 * 데이플랜「시작~마무리」가 자정을 넘기는지(시·분만 기준).
 * `dayPlanEditorShared.isOvernightHhmmRange`와 동일 규칙.
 */
export function isOvernightPriorityWindow(start: string, end: string): boolean {
  const ps = parseHHmmToMinutes(start.trim());
  const pe = parseHHmmToMinutes(end.trim());
  if (ps === null || pe === null) return false;
  if (pe === ps) return false;
  if (pe === 24 * 60 && pe > ps) return false;
  return pe < ps;
}

function snapToStep(m: number, step: number): number {
  const s = Number.isFinite(step) && step > 0 ? step : 5;
  return Math.round(m / s) * s;
}

function maxSnappedMinute(step: number): number {
  return step <= 1 ? 23 * 60 + 59 : 23 * 60 + 55;
}

function ceilToStep(m: number, step: number): number {
  const s = Number.isFinite(step) && step > 0 ? step : 5;
  return Math.ceil(m / s) * s;
}

function floorToStep(m: number, step: number): number {
  const s = Number.isFinite(step) && step > 0 ? step : 5;
  return Math.floor(m / s) * s;
}

function formatMinutesToHhmm(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) return '00:00';
  const m = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  if (m === 24 * 60) return '24:00';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function clampMinutesCore(
  mSnap: number,
  ps: number,
  pe: number,
  overnight: boolean,
  step: number,
): number {
  const maxSnap = maxSnappedMinute(step);
  let x = Math.min(Math.max(0, mSnap), maxSnap);

  if (!overnight) {
    const hiCap = pe >= 24 * 60 ? maxSnap : Math.min(pe, maxSnap);
    const lo = Math.min(ceilToStep(ps, step), maxSnap);
    let hiSnapped = floorToStep(hiCap, step);
    if (hiSnapped < lo) {
      /** 구간이 스냅 한 칸보다 짧을 때 */
      return lo;
    }
    if (x < lo) x = lo;
    else if (x > hiSnapped) x = hiSnapped;
    return x;
  }

  const eveningLo = Math.min(ceilToStep(ps, step), maxSnap);
  const morningHiCap = Math.min(pe, maxSnap);
  const morningHi = floorToStep(morningHiCap, step);

  const inEvening = x >= eveningLo;
  const inMorning = x <= morningHi;
  if (inEvening || inMorning) return x;

  const distToMorningHi = x - morningHi;
  const distToEveningLo = eveningLo - x;
  return distToMorningHi <= distToEveningLo ? morningHi : eveningLo;
}

/**
 * `HH:mm` 시각을 데이플랜 시작~마무리 구간 안으로 맞춥니다.
 * 시작·끝 파싱에 실패하면 원본 문자열을 그대로 돌려줍니다.
 */
export function clampHhmmToPriorityWindow(
  hhmm: string,
  routineStartHhmm: string,
  routineEndHhmm: string,
  snapStepMinutes: number = 5,
): string {
  const raw = hhmm.trim();
  const ps = parseHHmmToMinutes(routineStartHhmm.trim());
  const pe = parseHHmmToMinutes(routineEndHhmm.trim());
  const m = parseHHmmToMinutes(raw.length > 0 ? raw : '00:00');
  if (ps === null || pe === null || m === null) return raw.length > 0 ? raw : '09:00';

  const overnight = isOvernightPriorityWindow(routineStartHhmm, routineEndHhmm);
  const step = Number.isFinite(snapStepMinutes) && snapStepMinutes > 0 ? snapStepMinutes : 5;
  const mSnap = snapToStep(Math.min(Math.max(0, m), maxSnappedMinute(step)), step);
  const out = clampMinutesCore(mSnap, ps, pe, overnight, step);
  return formatMinutesToHhmm(out);
}
