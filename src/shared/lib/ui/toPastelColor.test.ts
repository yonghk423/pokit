import { toPastelColor } from './toPastelColor';

describe('toPastelColor', () => {
  it('blends saturated greens toward a softer tone', () => {
    expect(toPastelColor('#22c55e')).toBe('#91e2af');
  });

  it('softens near-black fallback colors', () => {
    expect(toPastelColor('#000000')).toBe('#808080');
  });

  it('returns original value for invalid hex', () => {
    expect(toPastelColor('not-a-color')).toBe('not-a-color');
  });
});
