import {
  cycleItemPriority,
  normalizeItemPriority,
  resolveCategoryImportance,
} from './itemPriority';

describe('itemPriority', () => {
  it('cycles high → medium → low', () => {
    expect(cycleItemPriority('high')).toBe('medium');
    expect(cycleItemPriority('medium')).toBe('low');
    expect(cycleItemPriority('low')).toBe('high');
  });

  it('defaults unknown values to medium', () => {
    expect(normalizeItemPriority('unknown')).toBe('medium');
    expect(resolveCategoryImportance({}, 'water')).toBe('medium');
    expect(resolveCategoryImportance({ water: 'high' }, 'water')).toBe('high');
  });
});
