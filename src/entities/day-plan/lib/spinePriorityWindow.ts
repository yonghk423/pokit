import { isOvernightPriorityWindow } from './priorityRoutineWindow';
import { parseHHmmToMinutes } from './parseTime';

export type SpinePriorityWindow = {
  startMin: number;
  endMin: number;
  overnight: boolean;
};

export function resolveSpinePriorityWindow(
  priorityStart: string,
  priorityEnd: string,
): SpinePriorityWindow | null {
  const startMin = parseHHmmToMinutes(priorityStart.trim());
  const endMinRaw = parseHHmmToMinutes(priorityEnd.trim());
  if (startMin === null || endMinRaw === null) return null;

  const endMin = endMinRaw >= 24 * 60 ? 24 * 60 - 1 : endMinRaw;
  return {
    startMin,
    endMin,
    overnight: isOvernightPriorityWindow(priorityStart, priorityEnd),
  };
}

export function isMinuteWithinSpinePriorityWindow(
  minutes: number,
  window: SpinePriorityWindow,
): boolean {
  const m = Math.max(0, Math.min(Math.floor(minutes), 24 * 60));
  if (!window.overnight) {
    if (window.endMin <= window.startMin) return false;
    return m >= window.startMin && m <= window.endMin;
  }
  return m >= window.startMin || m <= window.endMin;
}

/** 스파인 블록이 하루 시작~마무리 구간 안에 완전히 들어가는지 */
export function isSpineBlockWithinPriorityWindow(
  block: { startMinutes: number; endMinutes: number },
  window: SpinePriorityWindow,
): boolean {
  const start = Math.floor(block.startMinutes);
  const end = Math.floor(block.endMinutes);
  if (end <= start) return false;

  if (!window.overnight) {
    if (window.endMin <= window.startMin) return false;
    return start >= window.startMin && end <= window.endMin;
  }

  const inEvening = start >= window.startMin && end <= 24 * 60;
  const inMorning = start >= 0 && end <= window.endMin;
  return inEvening || inMorning;
}

/**
 * 일정 수정·추가용 — `endsNextCalendarDay`(자정 넘김)까지 포함해
 * 하루 시작~마무리 안에 들어가는지 검사합니다.
 */
export function isSpineBlockScheduleWithinPriorityWindow(
  block: {
    startMinutes: number;
    endMinutes: number;
    endsNextCalendarDay?: boolean;
  },
  window: SpinePriorityWindow,
): boolean {
  const start = Math.floor(block.startMinutes);
  const end = Math.floor(block.endMinutes);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (start < 0 || end < 0 || start > 24 * 60 || end > 24 * 60) return false;

  if (block.endsNextCalendarDay) {
    if (!window.overnight) return false;
    // 당일 저녁 밴드에서 시작해 다음날 아침 밴드(마무리 시각까지)에서 끝나야 함
    if (start < window.startMin) return false;
    if (end > window.endMin) return false;
    return 24 * 60 - start + end > 0;
  }

  return isSpineBlockWithinPriorityWindow({ startMinutes: start, endMinutes: end }, window);
}

/** 갭 구간을 하루 시작~마무리와 교차하는 부분만 남깁니다. */
export function clipGapToSpinePriorityWindow(
  fromMinutes: number,
  toMinutes: number,
  window: SpinePriorityWindow,
  minWidthMin = 5,
): { fromMinutes: number; toMinutes: number } | null {
  const from = Math.max(0, Math.floor(fromMinutes));
  const to = Math.min(24 * 60, Math.floor(toMinutes));
  if (to - from < minWidthMin) return null;

  if (!window.overnight) {
    const clippedFrom = Math.max(from, window.startMin);
    const clippedTo = Math.min(to, window.endMin);
    if (clippedTo - clippedFrom < minWidthMin) return null;
    return { fromMinutes: clippedFrom, toMinutes: clippedTo };
  }

  if (from >= window.startMin && to <= 24 * 60) {
    return to - from >= minWidthMin ? { fromMinutes: from, toMinutes: to } : null;
  }
  if (from >= 0 && to <= window.endMin) {
    return to - from >= minWidthMin ? { fromMinutes: from, toMinutes: to } : null;
  }

  return null;
}

/** 스파인 블록 시각을 하루 시작~마무리 안으로 맞춥니다. 불가하면 null */
export function clampSpineBlockToPriorityWindow(
  startMinutes: number,
  endMinutes: number,
  window: SpinePriorityWindow,
  minDurationMin = 1,
): { startMinutes: number; endMinutes: number } | null {
  let start = Math.floor(startMinutes);
  let end = Math.floor(endMinutes);
  if (end <= start) return null;

  if (!window.overnight) {
    if (window.endMin <= window.startMin) return null;
    start = Math.max(start, window.startMin);
    end = Math.min(end, window.endMin);
    if (end - start < minDurationMin) {
      end = Math.min(window.endMin, start + minDurationMin);
    }
    if (end <= start || end > window.endMin || start < window.startMin) return null;
    return { startMinutes: start, endMinutes: end };
  }

  // evening band
  if (start >= window.startMin || end > window.endMin) {
    const s = Math.max(start, window.startMin);
    let e = Math.min(end, 24 * 60);
    if (e - s >= minDurationMin && s >= window.startMin) {
      return { startMinutes: s, endMinutes: e };
    }
  }

  // morning band
  const s = Math.max(0, start);
  let e = Math.min(end, window.endMin);
  if (e - s < minDurationMin) {
    e = Math.min(window.endMin, s + minDurationMin);
  }
  if (e > s && e <= window.endMin) {
    return { startMinutes: s, endMinutes: e };
  }

  return null;
}
