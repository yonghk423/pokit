import {
  CYCLE_MINUTES,
  DAY_MINUTES,
  clampDialHandle,
  clockwiseSpanMinutes,
  cycleDisplayMinutes,
  cycleEndIsNextDay,
  cycleMinutesToClockHhmm,
  describeDonutSegment,
  minutesFromDialPointRaw,
  polarToCartesian,
  resolveEndCycleMinutes,
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
