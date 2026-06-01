import {
  addMonths,
  buildCalendarMonthGrid,
  dateKeyMonthPrefix,
  formatMonthTitleKo,
  horizonFocusDateKeyForMonth,
  isSameLocalDay,
  toMonthStart,
} from './buildCalendarMonthGrid';

describe('buildCalendarMonthGrid', () => {
  it('builds 42-day grid starting on monday week', () => {
    const may2025 = toMonthStart(new Date(2025, 4, 15));
    const grid = buildCalendarMonthGrid(may2025);
    expect(grid).toHaveLength(42);
    expect(grid[0]?.getDay()).toBe(1);
  });

  it('adds months from month start', () => {
    const may = toMonthStart(new Date(2025, 4, 1));
    const june = addMonths(may, 1);
    expect(june.getMonth()).toBe(5);
    expect(formatMonthTitleKo(may)).toBe('2025년 5월');
  });

  it('compares local calendar day', () => {
    const a = new Date(2025, 4, 26, 9, 0, 0);
    const b = new Date(2025, 4, 26, 23, 0, 0);
    expect(isSameLocalDay(a, b)).toBe(true);
  });

  it('extracts month prefix from date key', () => {
    expect(dateKeyMonthPrefix('2025-05-26')).toBe('2025-05');
    expect(dateKeyMonthPrefix('bad')).toBe('');
  });

  it('focuses today when month matches, otherwise first day', () => {
    expect(horizonFocusDateKeyForMonth(2025, 5, '2025-05-26')).toBe('2025-05-26');
    expect(horizonFocusDateKeyForMonth(2025, 6, '2025-05-26')).toBe('2025-06-01');
  });
});
