import { buildHistoryInsights } from './historyInsights';

describe('buildHistoryInsights', () => {
  it('returns strengths and weaknesses when data exists', () => {
    const report = buildHistoryInsights({
      todayCompletionRate: 0.8,
      todayCompletedCount: 4,
      sameWeekdayAverageScore: 60,
      weeklyCompletionRate: 0.85,
      previousWeeklyCompletionRate: 0.7,
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
    expect(report.dimensions.find((d) => d.scope === 'weekly')?.score).toBe(85);
  });

  it('uses weekly completion rate instead of balance score for weekly dimension', () => {
    const report = buildHistoryInsights({
      todayCompletionRate: 1,
      todayCompletedCount: 4,
      sameWeekdayAverageScore: 0,
      weeklyCompletionRate: 1,
      previousWeeklyCompletionRate: 0,
      weeklyBalanceScore: 20,
      weeklyBalanceRows: [{ key: 'health', label: '건강/신체 관리', value: 4 }],
      monthlyRate: 1,
      previousMonthlyRate: 0,
      activeDaysInMonth: 1,
      streak: 1,
      weekCompletionDelta: 4,
    });

    expect(report.dimensions.find((d) => d.scope === 'weekly')?.score).toBe(100);
  });
});
