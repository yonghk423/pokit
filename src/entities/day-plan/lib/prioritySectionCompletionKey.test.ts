import {
  buildPrioritySectionCompletionKey,
  migrateCompletionKeyInList,
  parsePrioritySectionCompletionKey,
  resolveFocusCompletionHistoryLayoutMode,
  toRoutineHistoryCategoryKey,
} from './prioritySectionCompletionKey';

describe('prioritySectionCompletionKey', () => {
  it('builds and parses slot-scoped completion keys', () => {
    expect(buildPrioritySectionCompletionKey('stretching', 'dinner')).toBe('stretching@dinner');
    expect(parsePrioritySectionCompletionKey('stretching@dinner')).toEqual({
      categoryKey: 'stretching',
      slot: 'dinner',
    });
  });

  it('keeps custom category keys intact', () => {
    expect(parsePrioritySectionCompletionKey('custom:life@night')).toEqual({
      categoryKey: 'custom:life',
      slot: 'night',
    });
    expect(toRoutineHistoryCategoryKey('custom:life@night')).toBe('custom:life');
  });

  it('treats plain keys without a meal slot suffix as category-only', () => {
    expect(parsePrioritySectionCompletionKey('water')).toEqual({ categoryKey: 'water' });
    expect(toRoutineHistoryCategoryKey('water')).toBe('water');
  });

  it('migrates slot-scoped completion keys in a list', () => {
    expect(
      migrateCompletionKeyInList(
        ['stretching@dawn', 'water@morning'],
        'stretching@dawn',
        'stretching@lunch',
      ),
    ).toEqual(['water@morning', 'stretching@lunch']);
  });

  it('resolves focus completion layout from key shape, not active tab', () => {
    expect(resolveFocusCompletionHistoryLayoutMode('water')).toBe('bag');
    expect(resolveFocusCompletionHistoryLayoutMode('water@morning')).toBe('sections');
    expect(resolveFocusCompletionHistoryLayoutMode('water', ['water'])).toBe('sections');
    expect(resolveFocusCompletionHistoryLayoutMode('reading', ['water'])).toBe('bag');
  });
});
