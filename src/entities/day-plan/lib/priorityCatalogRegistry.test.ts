import {
  filterKeysToPriorityCatalog,
  isNonDeletableCatalogKey,
  resolveUserBagRoutineCatalogKeys,
  sanitizePriorityCategoryOrderKeys,
} from './priorityCatalogRegistry';

describe('isNonDeletableCatalogKey', () => {
  it('allows deleting standard keys, builtin presets, and user flows', () => {
    expect(isNonDeletableCatalogKey('reading')).toBe(false);
    expect(isNonDeletableCatalogKey('work')).toBe(false);
    expect(isNonDeletableCatalogKey('healthIntake')).toBe(false);
    expect(isNonDeletableCatalogKey('fasting')).toBe(false);
    expect(isNonDeletableCatalogKey('customFlow:preset_daily_clean')).toBe(false);
    expect(isNonDeletableCatalogKey('customFlow:preset_stretching')).toBe(false);
    expect(isNonDeletableCatalogKey('customFlow:abcdefgh1234')).toBe(false);
  });
});

describe('resolveUserBagRoutineCatalogKeys', () => {
  it('prefers catalog selection over order so applied fixed routines do not leak', () => {
    expect(
      resolveUserBagRoutineCatalogKeys({
        priorityCategoryOrder: ['healthIntake', 'work'],
        routineCatalogSelectionKeys: ['reading'],
      }),
    ).toEqual(['reading']);
  });
});

describe('sanitizePriorityCategoryOrderKeys', () => {
  it('removes legacy water without adding healthIntake', () => {
    expect(sanitizePriorityCategoryOrderKeys(['water', 'reading'])).toEqual(['reading']);
  });

  it('keeps healthIntake when explicitly selected', () => {
    expect(sanitizePriorityCategoryOrderKeys(['healthIntake', 'reading'])).toEqual([
      'healthIntake',
      'reading',
    ]);
  });

  it('drops retired keys before catalog filter', () => {
    expect(sanitizePriorityCategoryOrderKeys(['medicine', 'reading'])).toEqual(['reading']);
  });

  it('drops note(work) from routine catalog lists', () => {
    expect(sanitizePriorityCategoryOrderKeys(['work', 'reading'])).toEqual(['reading']);
  });

  it('preserves distinct routine occurrence keys for the same catalog category', () => {
    expect(
      sanitizePriorityCategoryOrderKeys([
        'reading',
        'reading::instance:first',
        'reading::instance:second',
      ]),
    ).toEqual([
      'reading',
      'reading::instance:first',
      'reading::instance:second',
    ]);
  });
});

describe('filterKeysToPriorityCatalog', () => {
  it('excludes retired water key', () => {
    expect(filterKeysToPriorityCatalog(['water', 'reading'])).toEqual(['reading']);
  });

  it('excludes note(work) from routine catalog', () => {
    expect(filterKeysToPriorityCatalog(['work', 'reading'])).toEqual(['reading']);
  });
});
