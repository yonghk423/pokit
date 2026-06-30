import {
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from './customFlowAppearanceCatalog';

describe('customFlowAppearanceCatalog', () => {
  it('accepts allowed icon and any valid hex color', () => {
    expect(normalizeCustomFlowIcon('star.fill')).toBe('star.fill');
    expect(normalizeCustomFlowAccentColor('#3B82F6')).toBe('#3b82f6');
    expect(normalizeCustomFlowAccentColor('#ffffff')).toBe('#ffffff');
  });

  it('rejects unknown icon and invalid color values', () => {
    expect(normalizeCustomFlowIcon('not.a.real.symbol')).toBeUndefined();
    expect(normalizeCustomFlowAccentColor('blue')).toBeUndefined();
  });
});
