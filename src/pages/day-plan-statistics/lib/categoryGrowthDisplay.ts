import type { HistoryCategoryBreakdownRow } from '@entities/history';

export type CategorySortMode = 'share' | 'growth' | 'recent';

export type CategoryGrowthDisplayRow = HistoryCategoryBreakdownRow & {
  barPercent: number;
  primaryLabel: string;
  secondaryLabel: string;
};

function spreadBarPercents(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max <= min) return values.map(() => 50);
  return values.map((v) => Math.max(6, Math.round(((v - min) / (max - min)) * 100)));
}

function scaleBarPercents(values: number[]): number[] {
  const max = Math.max(1, ...values);
  return values.map((v) => Math.max(6, Math.round((v / max) * 100)));
}

export function growthRatio(current: number, prev: number): number {
  const c = Math.max(0, current);
  const p = Math.max(0, prev);
  if (p <= 0) return c > 0 ? 1 : 0;
  return c / p - 1;
}

export function buildCategoryGrowthDisplayRows(
  rows: HistoryCategoryBreakdownRow[],
  mode: CategorySortMode,
  currentWeek: Record<string, number>,
  prevWeek: Record<string, number>,
  formatDeltaPercent: (ratio: number) => string,
  formatCountKo: (count: number) => string,
): CategoryGrowthDisplayRow[] {
  if (mode === 'share') {
    return rows.map((row) => {
      const g = growthRatio(
        currentWeek[row.categoryKey] ?? 0,
        prevWeek[row.categoryKey] ?? 0,
      );
      return {
        ...row,
        barPercent: Math.max(6, Math.round(row.ratio * 100)),
        primaryLabel: `${Math.round(row.ratio * 100)}%`,
        secondaryLabel: `지난주 대비 ${formatDeltaPercent(g)}`,
      };
    });
  }

  if (mode === 'recent') {
    const counts = rows.map((r) => currentWeek[r.categoryKey] ?? 0);
    const bars = scaleBarPercents(counts);
    const weekTotal = counts.reduce((s, n) => s + n, 0);
    return rows.map((row, i) => {
      const n = counts[i] ?? 0;
      const weekShare = weekTotal > 0 ? Math.round((n / weekTotal) * 100) : 0;
      return {
        ...row,
        barPercent: bars[i] ?? 6,
        primaryLabel: `${weekShare}%`,
        secondaryLabel: `이번 주 ${formatCountKo(n)} · 30일 ${Math.round(row.ratio * 100)}%`,
      };
    });
  }

  const growthValues = rows.map((r) =>
    growthRatio(currentWeek[r.categoryKey] ?? 0, prevWeek[r.categoryKey] ?? 0),
  );
  const bars = spreadBarPercents(growthValues);
  return rows.map((row, i) => ({
    ...row,
    barPercent: bars[i] ?? 6,
    primaryLabel: formatDeltaPercent(growthValues[i] ?? 0),
    secondaryLabel: `이번 주 ${formatCountKo(currentWeek[row.categoryKey] ?? 0)} · 지난주 ${formatCountKo(prevWeek[row.categoryKey] ?? 0)}`,
  }));
}

export function sortCategoryBreakdownRows(
  rows: HistoryCategoryBreakdownRow[],
  mode: CategorySortMode,
  currentWeek: Record<string, number>,
  prevWeek: Record<string, number>,
): HistoryCategoryBreakdownRow[] {
  const next = [...rows];
  if (mode === 'growth') {
    next.sort((a, b) => {
      const bg = growthRatio(
        currentWeek[b.categoryKey] ?? 0,
        prevWeek[b.categoryKey] ?? 0,
      );
      const ag = growthRatio(
        currentWeek[a.categoryKey] ?? 0,
        prevWeek[a.categoryKey] ?? 0,
      );
      return bg - ag;
    });
    return next;
  }
  if (mode === 'recent') {
    next.sort(
      (a, b) =>
        (currentWeek[b.categoryKey] ?? 0) - (currentWeek[a.categoryKey] ?? 0),
    );
    return next;
  }
  return next;
}
