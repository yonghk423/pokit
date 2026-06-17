import {
  buildHistoryCalendarDensityLegend,
  calendarDensityDayTextColor,
  completionDensityLevel,
  getHistoryCalendarDensityColors,
} from './historyCalendarDensity';

describe('historyCalendarDensity', () => {
  it('maps completion counts to density levels', () => {
    expect(completionDensityLevel(0)).toBe(0);
    expect(completionDensityLevel(1)).toBe(1);
    expect(completionDensityLevel(3)).toBe(1);
    expect(completionDensityLevel(4)).toBe(1);
    expect(completionDensityLevel(5)).toBe(2);
    expect(completionDensityLevel(9)).toBe(2);
    expect(completionDensityLevel(10)).toBe(3);
    expect(completionDensityLevel(20)).toBe(3);
  });

  it('builds three legend tiers', () => {
    const legend = buildHistoryCalendarDensityLegend(false);
    expect(legend.map((row) => row.label)).toEqual(['3개 이하', '5개 이상', '10개 이상']);
  });

  it('uses light text on vivid mid/high tiers', () => {
    expect(calendarDensityDayTextColor(2, false, false, '#111')).toBe('#1e293b');
    expect(calendarDensityDayTextColor(3, false, true, '#fff')).toBe('#fafafa');
  });

  it('returns chromatic swatches for each level', () => {
    const colors = getHistoryCalendarDensityColors(false);
    expect(colors[1]).toMatch(/^#/);
    expect(colors[2]).toMatch(/^#/);
    expect(colors[3]).toMatch(/^#/);
  });
});
