/**
 * 48시간 원형 다이얼 — 분 ↔ 각도 변환.
 * 한 바퀴 = 48시간. 0분(당일 00:00) = 12시 방향(위), 시계방향 증가.
 * 시계 시각(HH:mm)은 24시간 주기(DAY_MINUTES)로 환산한다.
 */

export const DAY_MINUTES = 24 * 60;
/** 다이얼 한 바퀴 (이틀) */
export const CYCLE_MINUTES = 48 * 60;

/** 사이클 분 스냅. 기본 5분 */
export function snapCycleMinutes(total: number, step = 5): number {
  const s = Number.isFinite(step) && step > 0 ? Math.floor(step) : 5;
  const m = Math.round(total / s) * s;
  const wrapped = ((m % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  return wrapped === CYCLE_MINUTES ? 0 : wrapped;
}

/** @deprecated snapCycleMinutes 사용. 24h 호환 유지 */
export function snapDayMinutes(total: number, step = 5): number {
  return snapCycleMinutes(total, step);
}

/** 중심 기준 터치 → 사이클 분 (0~CYCLE-1), 스냅 */
export function minutesFromDialPoint(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  snapStep = 5,
): number {
  return snapCycleMinutes(minutesFromDialPointRaw(x, y, centerX, centerY), snapStep);
}

/** 스냅 없이 각도 → 사이클 분 */
export function minutesFromDialPointRaw(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
): number {
  const dx = x - centerX;
  const dy = y - centerY;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  if (deg >= 360) deg -= 360;
  return (deg / 360) * CYCLE_MINUTES;
}

/** 사이클 분 → 라디안 (SVG: 0=오른쪽이므로 위= -π/2) */
export function minutesToRadians(minutes: number): number {
  const m = ((minutes % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  return (m / CYCLE_MINUTES) * Math.PI * 2 - Math.PI / 2;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  minutes: number,
): { x: number; y: number } {
  const rad = minutesToRadians(minutes);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

/** start → end 시계방향 호 길이(분). end==start이면 풀 사이클 */
export function clockwiseSpanMinutes(start: number, end: number): number {
  const s = ((start % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  const e = ((end % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  if (e === s) return CYCLE_MINUTES;
  return e > s ? e - s : CYCLE_MINUTES - s + e;
}

/**
 * SVG arc path (시계방향, large-arc 자동).
 */
export function describeClockwiseArc(
  cx: number,
  cy: number,
  radius: number,
  startMinutes: number,
  endMinutes: number,
): string {
  const span = clockwiseSpanMinutes(startMinutes, endMinutes);
  if (span >= CYCLE_MINUTES - 0.5) {
    const mid = (startMinutes + CYCLE_MINUTES / 2) % CYCLE_MINUTES;
    const a = polarToCartesian(cx, cy, radius, startMinutes);
    const b = polarToCartesian(cx, cy, radius, mid);
    const c = polarToCartesian(cx, cy, radius, endMinutes);
    return [
      `M ${a.x} ${a.y}`,
      `A ${radius} ${radius} 0 1 1 ${b.x} ${b.y}`,
      `A ${radius} ${radius} 0 1 1 ${c.x} ${c.y}`,
    ].join(' ');
  }
  const start = polarToCartesian(cx, cy, radius, startMinutes);
  const end = polarToCartesian(cx, cy, radius, endMinutes);
  const largeArc = span > CYCLE_MINUTES / 2 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** 도넛 세그먼트 path: outer arc + inner reverse */
export function describeDonutSegment(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startMinutes: number,
  endMinutes: number,
): string {
  const span = clockwiseSpanMinutes(startMinutes, endMinutes);
  if (span < 1) {
    const p = polarToCartesian(cx, cy, outerR, startMinutes);
    return `M ${p.x} ${p.y} Z`;
  }

  if (span >= CYCLE_MINUTES - 0.5) {
    const mid = (startMinutes + CYCLE_MINUTES / 2) % CYCLE_MINUTES;
    return [
      describeDonutSegment(cx, cy, outerR, innerR, startMinutes, mid),
      describeDonutSegment(cx, cy, outerR, innerR, mid, endMinutes),
    ].join(' ');
  }

  const o0 = polarToCartesian(cx, cy, outerR, startMinutes);
  const o1 = polarToCartesian(cx, cy, outerR, endMinutes);
  const i1 = polarToCartesian(cx, cy, innerR, endMinutes);
  const i0 = polarToCartesian(cx, cy, innerR, startMinutes);
  const largeArc = span > CYCLE_MINUTES / 2 ? 1 : 0;
  return [
    `M ${o0.x} ${o0.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${i0.x} ${i0.y}`,
    'Z',
  ].join(' ');
}

export function formatHoursShort(minutes: number): string {
  const h = Math.round(minutes / 60);
  return `${h}h`;
}

/** 다이얼 표시용 — `5h 30m`, 정시면 `16h`, 1시간 미만이면 `45m`. */
export function formatBalanceDuration(
  minutes: number,
  _locale: 'ko' | 'en' | 'ja' = 'ko',
): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * 마무리 이후 돌아오는 다음「시작」시각(언랩).
 * 예: 시작 06:30, 마무리 01:00(다음날) → 다음 기상 30:30 (하루+06:30).
 */
export function nextWakeAfterEnd(startUnwrapped: number, endUnwrapped: number): number {
  const start = Math.max(0, startUnwrapped);
  let wake = start;
  const end = Math.max(start, endUnwrapped);
  while (wake <= end) {
    wake += DAY_MINUTES;
  }
  return wake;
}

/** 하룻밤 수면 = 마무리 → 다음 시작. 48시간 나머지 전체가 아님. */
export function sleepSpanUntilNextWake(startUnwrapped: number, endUnwrapped: number): number {
  return Math.max(0, nextWakeAfterEnd(startUnwrapped, endUnwrapped) - endUnwrapped);
}

export type DayCycleSegmentKind = 'activity' | 'sleep' | 'rest';

export type DayCycleSegment = {
  kind: DayCycleSegmentKind;
  startDisplay: number;
  endDisplay: number;
};

/**
 * 48시간 다이얼을 활동 / 수면(하룻밤) / 그 외로 나눈다.
 * 수면은 달 핸들 → 다음 해 핸들만.
 */
export function buildDayCycleSegments(
  startUnwrapped: number,
  endUnwrapped: number,
): DayCycleSegment[] {
  const start = Math.max(0, startUnwrapped);
  const end = Math.max(start, endUnwrapped);
  const nextWake = nextWakeAfterEnd(start, end);
  const activityEnd = cycleDisplayMinutes(end);
  const sleepEnd = cycleDisplayMinutes(nextWake);
  const restEnd = cycleDisplayMinutes(start);

  const out: DayCycleSegment[] = [];
  const push = (kind: DayCycleSegmentKind, from: number, to: number) => {
    const span = clockwiseSpanMinutes(from, to);
    if (span < 1 || span >= CYCLE_MINUTES - 0.5) return;
    out.push({ kind, startDisplay: from, endDisplay: to });
  };

  push('activity', cycleDisplayMinutes(start), activityEnd);
  push('sleep', activityEnd, sleepEnd);
  push('rest', sleepEnd, restEnd);
  return out;
}

/** 핸들 간 최소 간격(분) — 활동 구간이 비지 않게 */
export const MIN_ACTIVITY_SPAN_MINUTES = 60;
/** 수면 최소(분) — 달→다음 해 */
export const MIN_SLEEP_SPAN_MINUTES = 30;

export type DialHandleKind = 'start' | 'end' | 'wake';

/**
 * 다이얼 각도(0~CYCLE)를 마무리(언랩) 분으로.
 * 시작보다 앞(또는 같음)이면 +CYCLE 해서 시계방향 활동 구간으로 해석.
 */
export function resolveEndCycleMinutes(rawCycle: number, startCycle: number): number {
  const raw = ((rawCycle % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  const start = ((startCycle % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
  if (raw > start) return raw;
  return raw + CYCLE_MINUTES;
}

/**
 * 드래그 중인 핸들을 반영하되, 다른 핸들과 MIN 간격 유지.
 * start는 당일(0~DAY), end는 언랩 분(start+MIN ~ start+CYCLE-MIN).
 */
export function clampDialHandle(
  kind: DialHandleKind,
  nextMinutes: number,
  startMinutes: number,
  endMinutes: number,
  minSpan = MIN_ACTIVITY_SPAN_MINUTES,
  snapStep = 5,
): { start: number; end: number } {
  const start0 = Math.min(
    DAY_MINUTES - snapStep,
    Math.max(0, snapCycleMinutes(startMinutes, snapStep) % CYCLE_MINUTES),
  );
  // end는 언랩(시작 이후). 표시 위치는 % CYCLE
  let endU =
    endMinutes > start0 ? endMinutes : resolveEndCycleMinutes(endMinutes, start0);
  endU = Math.max(start0 + minSpan, endU);

  if (kind === 'wake') {
    // 둘째 해 = 시작+24h 미러. 드래그하면 시작 시각만 이동
    return clampDialHandle('start', nextMinutes, startMinutes, endMinutes, minSpan, snapStep);
  }

  if (kind === 'start') {
    let next = snapCycleMinutes(nextMinutes, snapStep) % CYCLE_MINUTES;
    // 시작은 첫 24시간 안에만
    if (next >= DAY_MINUTES) next = next % DAY_MINUTES;
    next = Math.min(DAY_MINUTES - snapStep, Math.max(0, next));
    let end = endU;
    if (end - next < minSpan) {
      end = next + minSpan;
    }
    // 활동 상한: 거의 48h
    const maxEnd = next + CYCLE_MINUTES - minSpan;
    if (end > maxEnd) end = maxEnd;
    return { start: next, end };
  }

  // end 드래그: 각도 → 언랩
  const raw = snapCycleMinutes(nextMinutes, snapStep) % CYCLE_MINUTES;
  let nextEnd = resolveEndCycleMinutes(raw, start0);
  nextEnd = Math.round(nextEnd / snapStep) * snapStep;
  const minEnd = start0 + minSpan;
  const maxEnd = start0 + CYCLE_MINUTES - minSpan;
  if (nextEnd < minEnd) nextEnd = minEnd;
  if (nextEnd > maxEnd) nextEnd = maxEnd;
  return { start: start0, end: nextEnd };
}

/** HH:mm + 당일/다음 날 → 사이클 분 */
export function toCycleStartMinutes(dayMinutes: number): number {
  const m = dayMinutes === DAY_MINUTES ? 0 : dayMinutes;
  return ((m % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
}

export function toCycleEndMinutes(dayMinutes: number, nextDay: boolean): number {
  // 24:00 (하루 끝)
  if (dayMinutes === DAY_MINUTES) {
    return nextDay ? CYCLE_MINUTES : DAY_MINUTES;
  }
  const clock = ((dayMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return nextDay ? clock + DAY_MINUTES : clock;
}

/** 사이클 분 → 시계 HH:mm (저장용). 자정 끝은 24:00 */
export function cycleMinutesToClockHhmm(cycleMinutes: number, asEnd: boolean): string {
  let m = ((cycleMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  // 언랩이 정확히 DAY 또는 CYCLE 배수면 하루 끝
  if (asEnd && (cycleMinutes === DAY_MINUTES || cycleMinutes === CYCLE_MINUTES || m === 0)) {
    if (cycleMinutes === 0) return '00:00';
    if (cycleMinutes > 0 && m === 0) return '24:00';
  }
  if (!asEnd && m === 0) return '00:00';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function cycleEndIsNextDay(endCycleMinutes: number): boolean {
  return endCycleMinutes >= DAY_MINUTES;
}

/** 다이얼 표시용 위치(0~CYCLE) */
export function cycleDisplayMinutes(unwrapped: number): number {
  return ((unwrapped % CYCLE_MINUTES) + CYCLE_MINUTES) % CYCLE_MINUTES;
}
