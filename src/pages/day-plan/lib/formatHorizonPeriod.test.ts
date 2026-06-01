import {
  formatMonthListLabelFromKey,
  formatMonthPeriodBadge,
  formatWeekPeriodBadge,
} from './formatHorizonPeriod';

describe('formatHorizonPeriod', () => {
  it('formats week badge from monday start key', () => {
    expect(formatWeekPeriodBadge('2025-05-26')).toBe('5월 4주차');
    expect(formatWeekPeriodBadge('2025-05-05')).toBe('5월 1주차');
  });

  it('returns empty string for invalid week key', () => {
    expect(formatWeekPeriodBadge('invalid')).toBe('');
  });

  it('formats month period badge', () => {
    expect(formatMonthPeriodBadge(2025, 5)).toBe('2025년 5월');
  });

  it('formats month list label from key', () => {
    expect(formatMonthListLabelFromKey('2025-05')).toBe('5월');
    expect(formatMonthListLabelFromKey('bad')).toBe('bad');
  });
});
