import type { WeeklyFlowHistoryRow } from './buildWeeklyFlowHistory';
import { groupWeeklyFlowHistoryRows } from './groupFlowHistoryRows';

function weeklyRow(
  partial: Pick<WeeklyFlowHistoryRow, 'historyKey' | 'categoryKey' | 'completedDays'> &
    Partial<WeeklyFlowHistoryRow>,
): WeeklyFlowHistoryRow {
  return {
    label: partial.categoryKey,
    icon: 'figure.walk',
    weekdayDone: Array.from({ length: 7 }, () => false),
    ...partial,
  };
}

describe('groupWeeklyFlowHistoryRows', () => {
  it('wraps each category row as a single card group', () => {
    const groups = groupWeeklyFlowHistoryRows([
      weeklyRow({
        historyKey: 'fasting',
        categoryKey: 'fasting',
        completedDays: 2,
        label: '체중조절',
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.categoryKey).toBe('fasting');
    expect(groups[0]?.row.historyKey).toBe('fasting');
  });
});
