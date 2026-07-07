import {
  clampSpineBlockToPriorityWindow,
  clipGapToSpinePriorityWindow,
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
});
