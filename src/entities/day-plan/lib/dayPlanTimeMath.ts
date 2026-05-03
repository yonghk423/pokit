import { getLocalMinutesOfDayNow } from './dayPlanTime';

/** 블록 최소 길이(분). 드래그·검증에 공통 사용 */
export const MIN_BLOCK_DURATION_MINUTES = 15;

/** 타임라인 드래그 시 분 단위 스냅 */
export const TIME_SNAP_MINUTES = 5;

/** 우선순위 모드 기본 목표 구간 길이(분). 이전 09:00~12:00에 맞춘 3시간. */
export const PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES = 180;

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

export function snapMinutes(minutes: number, step: number = TIME_SNAP_MINUTES): number {
  return Math.round(minutes / step) * step;
}

/** 새 시간 블록: 시작=로컬 현재 시각(스냅), 종료=시작+기본 길이(자정 넘김·최소 길이 보정) */
export function defaultEditorBlockTimesFromNow(
  now: Date = new Date(),
  spanMinutes: number = 60,
): { startTime: string; endTime: string } {
  const rawStart = getLocalMinutesOfDayNow(now);
  let startM = snapMinutes(rawStart, TIME_SNAP_MINUTES);
  const span = Math.max(spanMinutes, MIN_BLOCK_DURATION_MINUTES);
  let endM = snapMinutes(startM + span, TIME_SNAP_MINUTES);
  if (endM > 24 * 60) endM = 24 * 60;
  if (endM <= startM) {
    endM = Math.min(24 * 60, startM + MIN_BLOCK_DURATION_MINUTES);
  }
  if (endM - startM < MIN_BLOCK_DURATION_MINUTES) {
    startM = Math.max(0, endM - MIN_BLOCK_DURATION_MINUTES);
  }
  return {
    startTime: formatMinutesToHHmm(startM),
    endTime: formatMinutesToHHmm(endM),
  };
}

/** 우선순위: 시작=지금(로컬·5분 스냅), 종료=시작+기본 길이(자정·최소 길이 보정) */
export function defaultPriorityWindowFromNow(now: Date = new Date()): {
  startTime: string;
  endTime: string;
} {
  return defaultEditorBlockTimesFromNow(now, PRIORITY_WINDOW_DEFAULT_SPAN_MINUTES);
}
