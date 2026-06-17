import {
  buildTrendDeltaContextLabel,
  buildTrendGraphCaption,
  buildTrendRateSubtitle,
  buildTrendStreakFooter,
  countDaysInCompletionRateAverage,
} from './historyTrendCardCopy';

describe('historyTrendCardCopy', () => {
  const formatDateKeyKo = (dateKey: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!m) return dateKey;
    return `${Number(m[2])}월 ${Number(m[3])}일`;
  };

  it('counts only rows inside the month range', () => {
    const count = countDaysInCompletionRateAverage(
      {
        '2026-06-01': { dateKey: '2026-06-01', completionRate: 0.5 } as any,
        '2026-06-17': { dateKey: '2026-06-17', completionRate: 0.8 } as any,
        '2026-05-31': { dateKey: '2026-05-31', completionRate: 1 } as any,
      },
      '2026-06-01',
      '2026-06-17',
    );
    expect(count).toBe(2);
  });

  it('builds subtitle with period and recorded day count', () => {
    expect(
      buildTrendRateSubtitle({
        recordedDayCount: 10,
        startDateKey: '2026-06-01',
        endDateKey: '2026-06-17',
        formatDateKeyKo,
      }),
    ).toBe('6월 1일~6월 17일 · 기록 10일의 평균 완료율');
  });

  it('uses empty-state copy when there is no record', () => {
    expect(buildTrendGraphCaption(0)).toContain('오늘 탭');
    expect(buildTrendDeltaContextLabel(0, 0)).toBe('지난달 기록 없음');
    expect(buildTrendStreakFooter(0)).toContain('연속 달성 0일');
  });
});
