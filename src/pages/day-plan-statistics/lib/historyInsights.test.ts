import { buildHistoryInsights } from './historyInsights';

describe('buildHistoryInsights', () => {
  it('returns strengths and weaknesses when data exists', () => {
    const report = buildHistoryInsights({
      todayCompletionRate: 0.8,
      todayCompletedCount: 4,
      sameWeekdayAverageScore: 60,
      weeklyBalanceScore: 72,
      weeklyBalanceRows: [
        { key: 'work', label: '업무', value: 5 },
        { key: 'health', label: '건강', value: 1 },
        { key: 'personal', label: '개인', value: 0 },
        { key: 'mindset', label: '마인드셋', value: 2 },
        { key: 'social', label: '사교', value: 0 },
      ],
      monthlyRate: 0.75,
      previousMonthlyRate: 0.6,
      activeDaysInMonth: 12,
      streak: 8,
      weekCompletionDelta: 2,
    });

    expect(report.hasData).toBe(true);
    expect(report.dimensions).toHaveLength(3);
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.weaknesses.length).toBeGreaterThan(0);
    expect(report.overallScore).toBeGreaterThan(0);
  });
});
