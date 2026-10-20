import {
  CUSTOM_FLOW_ICON_OPTIONS,
  filterCustomFlowIcons,
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


describe('routine illustration picker', () => {
  it('offers only the proprietary icons and accepts saved legacy symbols', () => {
    expect(CUSTOM_FLOW_ICON_OPTIONS).toHaveLength(101);
    expect(CUSTOM_FLOW_ICON_OPTIONS.every((id) => id.startsWith('routine:'))).toBe(true);
    expect(normalizeCustomFlowIcon('routine:water')).toBe('routine:water');
    expect(normalizeCustomFlowIcon('routine:missing')).toBeUndefined();
    expect(normalizeCustomFlowIcon('book.closed.fill')).toBe('book.closed.fill');
  });

  it('searches Korean, English and Japanese and respects category and limit', () => {
    for (const query of ['물 마시기', 'hydration', '水分補給']) {
      expect(filterCustomFlowIcons(query)).toEqual(['routine:water']);
    }
    expect(filterCustomFlowIcons('', { category: 'health' })).toHaveLength(13);
    expect(filterCustomFlowIcons('양치')).toEqual(['routine:toothbrush']);
    expect(filterCustomFlowIcons('サイクリング')).toEqual(['routine:cycling']);
    expect(filterCustomFlowIcons('photo collage')).toEqual(['routine:collage']);
    expect(filterCustomFlowIcons('')).toHaveLength(10);
    expect(filterCustomFlowIcons('', { category: 'all' })).toHaveLength(101);
    expect(new Set(CUSTOM_FLOW_ICON_OPTIONS).size).toBe(101);
    expect(filterCustomFlowIcons('work', { category: 'food' })).toEqual([]);
    expect(filterCustomFlowIcons('', { limit: 0 })).toEqual([]);
    expect(filterCustomFlowIcons('', { limit: 2 })).toHaveLength(2);
  });
});
