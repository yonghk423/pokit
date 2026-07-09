import { isSpineBlockActiveAtMinute } from './isSpineBlockActiveAtMinute';

describe('isSpineBlockActiveAtMinute', () => {
  it('returns true when now is inside the block window', () => {
    expect(isSpineBlockActiveAtMinute(17 * 60 + 13, 17 * 60 + 28, 17 * 60 + 17)).toBe(true);
  });

  it('returns false at block end boundary', () => {
    expect(isSpineBlockActiveAtMinute(17 * 60 + 13, 17 * 60 + 28, 17 * 60 + 28)).toBe(false);
  });

  it('returns false before block start', () => {
    expect(isSpineBlockActiveAtMinute(17 * 60 + 13, 17 * 60 + 28, 17 * 60 + 12)).toBe(false);
  });
});
