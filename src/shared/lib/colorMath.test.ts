import {
  formatHexInput,
  hexToHsv,
  hsvToHex,
  hueToHex,
  normalizeHexColor,
  pastelizeAccentHex,
} from './colorMath';

describe('colorMath', () => {
  it('converts hex and hsv consistently', () => {
    expect(hsvToHex(hexToHsv('#f97316'))).toBe('#f97316');
    expect(hsvToHex(hexToHsv('#3b82f6'))).toBe('#3b82f6');
  });

  it('normalizes hex colors', () => {
    expect(normalizeHexColor('#FFFFFF')).toBe('#ffffff');
    expect(normalizeHexColor('invalid')).toBeUndefined();
  });

  it('formats hex input', () => {
    expect(formatHexInput('ff00aa')).toBe('#ff00aa');
    expect(formatHexInput('#ABC')).toBe('#abc');
  });

  it('returns pure hue colors', () => {
    expect(hueToHex(0)).toBe('#ff0000');
    expect(hueToHex(120)).toBe('#00ff00');
  });

  it('softens accent hex toward pastel while keeping hue separation', () => {
    expect(pastelizeAccentHex('#e9a23b', 0)).toBe('#e9a23b');
    const soft = pastelizeAccentHex('#dc2626');
    expect(soft).not.toBe('#dc2626');
    expect(soft.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
    const orange = hexToHsv(pastelizeAccentHex('#f97316'));
    const blue = hexToHsv(pastelizeAccentHex('#3b82f6'));
    const hueGap = Math.min(
      Math.abs(orange.h - blue.h),
      360 - Math.abs(orange.h - blue.h),
    );
    expect(hueGap).toBeGreaterThan(80);
  });
});
