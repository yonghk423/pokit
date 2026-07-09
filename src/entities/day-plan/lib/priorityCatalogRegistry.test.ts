import {
  filterKeysToPriorityCatalog,
  isNonDeletableCatalogKey,
  resolveUserBagRoutineCatalogKeys,
  sanitizePriorityCategoryOrderKeys,
} from './priorityCatalogRegistry';

describe('isNonDeletableCatalogKey', () => {
  it('protects standard catalog keys and builtin preset flows', () => {
    expect(isNonDeletableCatalogKey('reading')).toBe(true);
    expect(isNonDeletableCatalogKey('work')).toBe(true);
    expect(isNonDeletableCatalogKey('healthIntake')).toBe(true);
    expect(isNonDeletableCatalogKey('fasting')).toBe(true);
    expect(isNonDeletableCatalogKey('customFlow:preset_daily_clean')).toBe(true);
    expect(isNonDeletableCatalogKey('customFlow:preset_stretching')).toBe(true);
  });

  it('allows deleting user-created custom flows', () => {
    expect(isNonDeletableCatalogKey('customFlow:abcdefgh1234')).toBe(false);
  });
});

describe('resolveUserBagRoutineCatalogKeys', () => {
  it('prefers catalog selection over order so applied fixed routines do not leak', () => {
    expect(
      resolveUserBagRoutineCatalogKeys({
        priorityCategoryOrder: ['healthIntake', 'work'],
        routineCatalogSelectionKeys: ['work'],
      }),
    ).toEqual(['work']);
  });
});

describe('sanitizePriorityCategoryOrderKeys', () => {
  it('removes legacy water without adding healthIntake', () => {
    expect(sanitizePriorityCategoryOrderKeys(['water', 'work'])).toEqual(['work']);
  });

  it('keeps healthIntake when explicitly selected', () => {
    expect(sanitizePriorityCategoryOrderKeys(['healthIntake', 'work'])).toEqual([
      'healthIntake',
      'work',
    ]);
  });

  it('drops retired keys before catalog filter', () => {
    expect(sanitizePriorityCategoryOrderKeys(['medicine', 'reading'])).toEqual(['reading']);
  });
});

describe('filterKeysToPriorityCatalog', () => {
  it('excludes retired water key', () => {
    expect(filterKeysToPriorityCatalog(['water', 'work'])).toEqual(['work']);
  });
});
