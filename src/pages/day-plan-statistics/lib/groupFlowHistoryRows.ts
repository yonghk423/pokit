import type { MonthlyFlowHistoryRow } from './buildMonthlyFlowHistory';
import type { WeeklyFlowHistoryRow } from './buildWeeklyFlowHistory';

export type FlowHistoryCategoryGroup<TRow> = {
  categoryKey: string;
  label: string;
  icon: string;
  timeLabel?: string;
  startDateLabel?: string;
  row: TRow;
};

function groupRowsByCategory<TRow extends WeeklyFlowHistoryRow | MonthlyFlowHistoryRow>(
  rows: TRow[],
): FlowHistoryCategoryGroup<TRow>[] {
  return rows.map((row) => ({
    categoryKey: row.categoryKey,
    label: row.label,
    icon: row.icon,
    timeLabel: row.timeLabel,
    startDateLabel: row.startDateLabel,
    row,
  }));
}

export function groupWeeklyFlowHistoryRows(
  rows: WeeklyFlowHistoryRow[],
): FlowHistoryCategoryGroup<WeeklyFlowHistoryRow>[] {
  return groupRowsByCategory(rows);
}

export function groupMonthlyFlowHistoryRows(
  rows: MonthlyFlowHistoryRow[],
): FlowHistoryCategoryGroup<MonthlyFlowHistoryRow>[] {
  return groupRowsByCategory(rows);
}
