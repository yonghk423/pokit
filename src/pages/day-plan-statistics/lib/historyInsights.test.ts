import { buildHistoryInsights } from './historyInsights';

describe('buildHistoryInsights', () => {
  it('returns strengths and weaknesses when data exists', () => {
    const report = buildHistoryInsights({
      todayCompletionRate: 0.8,
      todayCompletedCount: 4,
      sameWeekdayAverageScore: 60,
      streak: 8,
      weekCompletionDelta: 2,
    });

    expect(report.hasData).toBe(true);
    expect(report.dimensions).toHaveLength(1);
    expect(report.dimensions[0]?.scope).toBe('daily');
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.overallScore).toBe(80);
  });

  it('flags empty daily record as weakness', () => {
    const report = buildHistoryInsights({
      todayCompletionRate: 0,
      todayCompletedCount: 0,
      sameWeekdayAverageScore: 0,
      streak: 0,
      weekCompletionDelta: 0,
    });

    expect(report.hasData).toBe(false);
    expect(report.weaknesses.some((item) => item.title.includes('비어'))).toBe(true);
  });
});
