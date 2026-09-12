import {
  CYCLE_MINUTES,
  DAY_MINUTES,
  buildDayCycleSegments,
  clampDialHandle,
  clockwiseSpanMinutes,
  cycleDisplayMinutes,
  cycleEndIsNextDay,
  cycleMinutesToClockHhmm,
  describeDonutSegment,
  formatBalanceDuration,
  minutesFromDialPointRaw,
  polarToCartesian,
  resolveEndCycleMinutes,
  sleepSpanUntilNextWake,
  snapCycleMinutes,
  toCycleEndMinutes,
  toCycleStartMinutes,
} from './dayCycleDialMath';

describe('dayCycleDialMath 48h', () => {
  it('snaps within cycle', () => {
    expect(snapCycleMinutes(7)).toBe(5);
    expect(snapCycleMinutes(0)).toBe(0);
    expect(snapCycleMinutes(CYCLE_MINUTES - 2, 5)).toBe(0);
  });

  it('maps top-center near cycle midnight (0)', () => {
    const m = minutesFromDialPointRaw(100, 20, 100, 100);
    expect(m <= 30 || m >= CYCLE_MINUTES - 30).toBe(true);
  });

  it('maps right-center near 12h on 48h dial (1/4 turn)', () => {
    const m = minutesFromDialPointRaw(180, 100, 100, 100);
    // 90° = 12 hours = 720 min
    expect(m).toBeGreaterThan(11 * 60);
    expect(m).toBeLessThan(13 * 60);
  });

  it('next-day end is offset by 24h', () => {
    expect(toCycleEndMinutes(2 * 60, true)).toBe(DAY_MINUTES + 2 * 60);
    expect(toCycleEndMinutes(23 * 60, false)).toBe(23 * 60);
    expect(toCycleEndMinutes(DAY_MINUTES, false)).toBe(DAY_MINUTES);
    expect(toCycleEndMinutes(DAY_MINUTES, true)).toBe(CYCLE_MINUTES);
  });

  it('span across next-day morning is > 24h when intended', () => {
    const start = toCycleStartMinutes(7 * 60);
    const end = toCycleEndMinutes(2 * 60, true);
    expect(end - start).toBe(19 * 60);
    expect(clockwiseSpanMinutes(start, cycleDisplayMinutes(end))).toBe(19 * 60);
  });

  it('resolveEndCycleMinutes wraps before start', () => {
    expect(resolveEndCycleMinutes(100, 420)).toBe(100 + CYCLE_MINUTES);
    expect(resolveEndCycleMinutes(800, 420)).toBe(800);
  });

  it('clamps start within first day', () => {
    const moved = clampDialHandle('start', DAY_MINUTES + 60, 7 * 60, 23 * 60, 60, 5);
    expect(moved.start).toBeLessThan(DAY_MINUTES);
  });

  it('clamps end to keep min activity on 48h', () => {
    const moved = clampDialHandle('end', 7 * 60 + 30, 7 * 60, 23 * 60, 60, 5);
    expect(moved.end - moved.start).toBeGreaterThanOrEqual(60);
  });

  it('clock conversion round-trip for next-day end', () => {
    const endU = toCycleEndMinutes(2 * 60, true);
    expect(cycleEndIsNextDay(endU)).toBe(true);
    expect(cycleMinutesToClockHhmm(endU, true)).toBe('02:00');
  });

  it('builds donut path on 48h span', () => {
    const d = describeDonutSegment(100, 100, 50, 30, 0, 6 * 60);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.includes(' A ')).toBe(true);
  });
});

describe('dayCycleDialMath sleep vs leftover', () => {
  it('same-day 07:00–23:00 is 16h active and 8h sleep, not 32h', () => {
    const start = toCycleStartMinutes(7 * 60);
    const end = toCycleEndMinutes(23 * 60, false);
    expect(end - start).toBe(16 * 60);
    expect(sleepSpanUntilNextWake(start, end)).toBe(8 * 60);
  });

  it('wake 06:30 and sleep 01:00 next morning is 5h 30m', () => {
    const start = toCycleStartMinutes(6 * 60 + 30);
    const end = toCycleEndMinutes(1 * 60, true);
    expect(end - start).toBe(18 * 60 + 30);
    expect(sleepSpanUntilNextWake(start, end)).toBe(5 * 60 + 30);
  });

  it('sleeps 01:00→06:30 even when both clock times are the same calendar morning', () => {
    const start = toCycleStartMinutes(6 * 60 + 30);
    const end = toCycleEndMinutes(1 * 60, false);
    // 시작이 마무리보다 늦으면 마무리는 다음날로 해석된 언랩을 써야 한다
    const endU = end <= start ? end + DAY_MINUTES : end;
    expect(sleepSpanUntilNextWake(start, endU)).toBe(5 * 60 + 30);
  });

  it('splits 48h into activity, one night of sleep, and leftover', () => {
    const start = toCycleStartMinutes(7 * 60);
    const end = toCycleEndMinutes(23 * 60, false);
    const segs = buildDayCycleSegments(start, end);
    const byKind = Object.fromEntries(segs.map((s) => [s.kind, s]));
    expect(clockwiseSpanMinutes(byKind.activity.startDisplay, byKind.activity.endDisplay)).toBe(
      16 * 60,
    );
    expect(clockwiseSpanMinutes(byKind.sleep.startDisplay, byKind.sleep.endDisplay)).toBe(8 * 60);
    expect(clockwiseSpanMinutes(byKind.rest.startDisplay, byKind.rest.endDisplay)).toBe(24 * 60);
  });

  it('formats duration with h and m units', () => {
    expect(formatBalanceDuration(5 * 60 + 30, 'ko')).toBe('5h 30m');
    expect(formatBalanceDuration(16 * 60, 'ko')).toBe('16h');
    expect(formatBalanceDuration(45, 'ko')).toBe('45m');
  });

  it('wake handle lengthens sleep without moving wrap-up', () => {
    const start = toCycleStartMinutes(6 * 60 + 30);
    const end = toCycleEndMinutes(1 * 60, true);
    const laterWake = end + 8 * 60;
    const moved = clampDialHandle('wake', laterWake, start, end, 60, 5);
    expect(moved.end).toBe(end);
    expect(sleepSpanUntilNextWake(moved.start, moved.end)).toBe(8 * 60);
  });
});
