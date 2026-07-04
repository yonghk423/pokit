import {
  buildPrioritySectionCompletionKey,
  parsePrioritySectionCompletionKey,
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
});
