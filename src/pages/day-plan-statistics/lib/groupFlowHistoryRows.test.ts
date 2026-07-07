import type { WeeklyFlowHistoryRow } from './buildWeeklyFlowHistory';
import { groupWeeklyFlowHistoryRows } from './groupFlowHistoryRows';

function weeklyRow(
  partial: Pick<WeeklyFlowHistoryRow, 'historyKey' | 'categoryKey' | 'layoutMode' | 'completedDays'> &
    Partial<WeeklyFlowHistoryRow>,
): WeeklyFlowHistoryRow {
  return {
    layoutIcon: 'clock',
    layoutLabel: '타임라인',
    label: partial.categoryKey,
    icon: 'figure.walk',
    weekdayDone: Array.from({ length: 7 }, () => false),
    ...partial,
  };
}

describe('groupWeeklyFlowHistoryRows', () => {
  it('merges layout mode rows into one category card group', () => {
    const groups = groupWeeklyFlowHistoryRows([
      weeklyRow({
        historyKey: 'bag:fasting',
        categoryKey: 'fasting',
        layoutMode: 'bag',
        completedDays: 1,
        label: '체중조절',
      }),
      weeklyRow({
        historyKey: 'spine:fasting',
        categoryKey: 'fasting',
        layoutMode: 'spine',
        completedDays: 1,
        label: '체중조절',
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.categoryKey).toBe('fasting');
    expect(groups[0]?.modeRows.map((row) => row.historyKey)).toEqual([
      'bag:fasting',
      'spine:fasting',
    ]);
  });
});
