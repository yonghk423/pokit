import {
  categoryKeysReferToSameRoutine,
  excludeEndedTodayCategoryKeys,
  isEndedTodayCategoryKey,
  resolveEndedTodayCategoryKeys,
} from './endedTodayCategoryKeys';

describe('endedTodayCategoryKeys', () => {
  it('ignores ended keys from another day', () => {
    expect(
      resolveEndedTodayCategoryKeys(['fasting'], '2026-09-13', '2026-09-14'),
    ).toEqual([]);
  });

  it('keeps ended keys for the same day', () => {
    expect(
      resolveEndedTodayCategoryKeys(['fasting', 'fasting'], '2026-09-14', '2026-09-14'),
    ).toEqual(['fasting']);
  });

  it('matches instance keys to the same routine', () => {
    expect(categoryKeysReferToSameRoutine('reading::instance:second', 'reading')).toBe(true);
    expect(isEndedTodayCategoryKey('reading::instance:second', ['reading'])).toBe(true);
    expect(excludeEndedTodayCategoryKeys(['reading', 'fasting'], ['reading'])).toEqual([
      'fasting',
    ]);
  });
});
