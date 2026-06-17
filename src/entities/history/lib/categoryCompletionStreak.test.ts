import { computeCategoryCompletionStreak, formatCategoryStreakLabel } from './categoryCompletionStreak';

describe('categoryCompletionStreak', () => {
  const map = {
    '2026-06-15': { dateKey: '2026-06-15', categoryCompletions: { reading: 1 } } as any,
    '2026-06-16': { dateKey: '2026-06-16', categoryCompletions: { reading: 1 } } as any,
    '2026-06-17': { dateKey: '2026-06-17', categoryCompletions: { reading: 1 } } as any,
  };

  it('counts consecutive days for a category ending at anchor', () => {
    expect(computeCategoryCompletionStreak(map, 'reading', '2026-06-17')).toBe(3);
    expect(computeCategoryCompletionStreak(map, 'reading', '2026-06-16')).toBe(2);
    expect(computeCategoryCompletionStreak(map, 'reading', '2026-06-14')).toBe(0);
  });

  it('returns zero when anchor day has no completion', () => {
    expect(computeCategoryCompletionStreak(map, 'water', '2026-06-17')).toBe(0);
  });

  it('formats streak labels', () => {
    expect(formatCategoryStreakLabel(0)).toBe('연속 없음');
    expect(formatCategoryStreakLabel(5)).toBe('연속 5일');
  });
});
