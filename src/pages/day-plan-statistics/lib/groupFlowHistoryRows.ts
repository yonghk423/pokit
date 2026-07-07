import {
  ROUTINE_HISTORY_LAYOUT_MODES,
  type RoutineHistoryLayoutMode,
} from '@shared/lib/routineHistoryLayoutKey';

import type { MonthlyFlowHistoryRow } from './buildMonthlyFlowHistory';
import type { WeeklyFlowHistoryRow } from './buildWeeklyFlowHistory';

export type FlowHistoryCategoryGroup<TRow> = {
  categoryKey: string;
  label: string;
  icon: string;
  timeLabel?: string;
  startDateLabel?: string;
  modeRows: TRow[];
};

function layoutModeOrder(mode: RoutineHistoryLayoutMode): number {
  const index = ROUTINE_HISTORY_LAYOUT_MODES.indexOf(mode);
  return index < 0 ? ROUTINE_HISTORY_LAYOUT_MODES.length : index;
}

function sortModeRows<TRow extends { layoutMode: RoutineHistoryLayoutMode; completedDays: number }>(
  rows: TRow[],
): TRow[] {
  return [...rows].sort(
    (a, b) =>
      layoutModeOrder(a.layoutMode) - layoutModeOrder(b.layoutMode) ||
      b.completedDays - a.completedDays,
  );
}

function pickEarliestStartDateLabel(labels: Array<string | undefined>): string | undefined {
  return labels.find((label) => Boolean(label?.trim()));
}

function groupRowsByCategory<TRow extends WeeklyFlowHistoryRow | MonthlyFlowHistoryRow>(
  rows: TRow[],
): FlowHistoryCategoryGroup<TRow>[] {
  const byCategory = new Map<string, TRow[]>();

  for (const row of rows) {
    const list = byCategory.get(row.categoryKey) ?? [];
    list.push(row);
    byCategory.set(row.categoryKey, list);
  }

  const groups: FlowHistoryCategoryGroup<TRow>[] = [];

  for (const modeRows of byCategory.values()) {
    const sorted = sortModeRows(modeRows);
    const first = sorted[0];
    if (!first) continue;

    groups.push({
      categoryKey: first.categoryKey,
      label: first.label,
      icon: first.icon,
      timeLabel: first.timeLabel,
      startDateLabel: pickEarliestStartDateLabel(sorted.map((row) => row.startDateLabel)),
      modeRows: sorted,
    });
  }

  groups.sort((a, b) => {
    const aTotal = a.modeRows.reduce((sum, row) => sum + row.completedDays, 0);
    const bTotal = b.modeRows.reduce((sum, row) => sum + row.completedDays, 0);
    return bTotal - aTotal || a.label.localeCompare(b.label, 'ko');
  });

  return groups;
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
