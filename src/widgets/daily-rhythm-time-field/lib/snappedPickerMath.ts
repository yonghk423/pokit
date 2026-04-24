import { parseHHmmToMinutes } from '@entities/day-plan';

/** 데이플랜 에디터·시간 피커와 동일한 5분 스냅 */
export const TIME_SNAP_MINUTES = 5;

export function snapMinutes(minutes: number, step: number = TIME_SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/** 0~1440(24:00) → `HH:mm`. 1440은 `24:00` */
export function formatMinutesToHHmm(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes)) {
    return '00:00';
  }
  const m = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  if (m === 24 * 60) return '24:00';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function hhmmToPickerDate(hhmm: string): Date {
  const m = parseHHmmToMinutes(hhmm);
  const d = new Date();
  if (m === null) {
    d.setHours(8, 0, 0, 0);
    return d;
  }
  if (m >= 24 * 60) {
    d.setHours(23, 55, 0, 0);
    return d;
  }
  d.setHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}

/**
 * @param step 분 스냅 간격. `1`이면 분 단위 그대로, 기본은 데이플랜 타임라인과 동일한 5분.
 */
export function pickerDateToSnappedHhmm(d: Date, step: number = TIME_SNAP_MINUTES): string {
  const raw = d.getHours() * 60 + d.getMinutes();
  const safeStep = Number.isFinite(step) && step > 0 ? step : TIME_SNAP_MINUTES;
  const snapped = snapMinutes(raw, safeStep);
  /** 5분 스냅은 기존과 같이 23:55까지. 1분 스냅은 23:59까지(스피너 한 칸 단위). */
  const max = safeStep <= 1 ? 23 * 60 + 59 : 23 * 60 + 55;
  return formatMinutesToHHmm(Math.min(Math.max(0, snapped), max));
}
