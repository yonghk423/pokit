import {
  buildHorizonWeekDays,
  getHorizonWeekStartKey,
  HORIZON_WEEKDAY_SHORT_KO,
} from './buildHorizonWeekDays';

describe('buildHorizonWeekDays', () => {
  it('returns monday week start for wednesday', () => {
    expect(getHorizonWeekStartKey('2025-05-28')).toBe('2025-05-26');
  });

  it('returns previous monday for sunday', () => {
    expect(getHorizonWeekStartKey('2025-05-25')).toBe('2025-05-19');
  });

  it('builds 7 cells from monday with weekday labels', () => {
    const days = buildHorizonWeekDays('2025-05-26');
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.weekdayLabel)).toEqual([...HORIZON_WEEKDAY_SHORT_KO]);
    expect(days[0]).toEqual({ dateKey: '2025-05-26', weekdayLabel: '월', dayOfMonth: 26 });
    expect(days[6]?.dateKey).toBe('2025-06-01');
  });
});
