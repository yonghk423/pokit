import { tabPillColors } from './tabPillColors';

describe('tabPillColors', () => {
  it('returns light theme colors', () => {
    const c = tabPillColors(false);
    expect(c.activeBorder).toBe('#000000');
    expect(c.inactiveBg).toBe('#FFFFFF');
  });

  it('returns dark theme colors', () => {
    const c = tabPillColors(true);
    expect(c.activeIcon).toBe('#fafafa');
    expect(c.inactiveBg).toBe('#18181b');
  });
});
