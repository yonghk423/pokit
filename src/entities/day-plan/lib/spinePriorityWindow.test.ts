import {
  clampSpineBlockToPriorityWindow,
  clipGapToSpinePriorityWindow,
  isSpineBlockScheduleWithinPriorityWindow,
  isSpineBlockWithinPriorityWindow,
  resolveSpinePriorityWindow,
} from './spinePriorityWindow';

describe('spinePriorityWindow', () => {
  const window = resolveSpinePriorityWindow('18:00', '21:00');

  it('resolves same-day window', () => {
    expect(window).toEqual({
      startMin: 18 * 60,
      endMin: 21 * 60,
      overnight: false,
    });
  });

  it('detects blocks outside window', () => {
    expect(window).not.toBeNull();
    expect(
      isSpineBlockWithinPriorityWindow(
        { startMinutes: 17 * 60 + 58, endMinutes: 18 * 60 + 13 },
        window!,
      ),
    ).toBe(false);
    expect(
      isSpineBlockWithinPriorityWindow(
        { startMinutes: 18 * 60, endMinutes: 18 * 60 + 15 },
        window!,
      ),
    ).toBe(true);
  });

  it('clamps block start into window', () => {
    expect(window).not.toBeNull();
    expect(
      clampSpineBlockToPriorityWindow(17 * 60 + 58, 18 * 60 + 13, window!),
    ).toEqual({
      startMinutes: 18 * 60,
      endMinutes: 18 * 60 + 13,
    });
  });

  it('clips gap to window', () => {
    expect(window).not.toBeNull();
    expect(clipGapToSpinePriorityWindow(17 * 60, 19 * 60, window!)).toEqual({
      fromMinutes: 18 * 60,
      toMinutes: 19 * 60,
    });
  });

  it('keeps 24:00 as the day-end boundary and allows evening blocks', () => {
    const dayEnd = resolveSpinePriorityWindow('06:30', '24:00');
    expect(dayEnd).toEqual({
      startMin: 6 * 60 + 30,
      endMin: 24 * 60,
      overnight: false,
    });
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 21 * 60,
          endMinutes: 21 * 60 + 30,
        },
        dayEnd!,
      ),
    ).toBe(true);
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 23 * 60,
          endMinutes: 24 * 60,
        },
        dayEnd!,
      ),
    ).toBe(true);
  });

  it('rejects next-day end past overnight window finish', () => {
    const overnight = resolveSpinePriorityWindow('06:30', '00:00');
    expect(overnight).not.toBeNull();
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 13 * 60 + 10,
          endMinutes: 14 * 60 + 10,
          endsNextCalendarDay: true,
        },
        overnight!,
      ),
    ).toBe(false);
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 22 * 60,
          endMinutes: 0,
          endsNextCalendarDay: true,
        },
        overnight!,
      ),
    ).toBe(true);
  });

  it('allows overnight next-day end within morning band', () => {
    const overnight = resolveSpinePriorityWindow('22:00', '06:00');
    expect(overnight).not.toBeNull();
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 23 * 60,
          endMinutes: 5 * 60,
          endsNextCalendarDay: true,
        },
        overnight!,
      ),
    ).toBe(true);
    expect(
      isSpineBlockScheduleWithinPriorityWindow(
        {
          startMinutes: 23 * 60,
          endMinutes: 7 * 60,
          endsNextCalendarDay: true,
        },
        overnight!,
      ),
    ).toBe(false);
  });
});
