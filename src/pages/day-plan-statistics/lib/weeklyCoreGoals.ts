import { addDaysToLocalDateKey } from '@entities/day-plan';
import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';

export type WeeklyCoreGoal = {
  categoryKey: string;
  title: string;
  icon: 'book.fill' | 'figure.run' | 'drop.fill' | 'brain.head.profile' | 'bag.fill' | 'star.fill';
  completed: number;
  target: number;
  deltaLabel: string;
  sparklinePath: string;
  metricSubtitle: string;
};

function categoryIcon(categoryKey: string): WeeklyCoreGoal['icon'] {
  const k = categoryKey.toLowerCase();
  if (k.includes('reading') || k.includes('study')) return 'book.fill';
  if (k.includes('workout') || k.includes('stretch') || k.includes('yoga') || k.includes('fitness')) {
    return 'figure.run';
  }
  if (k.includes('water') || k.includes('medicine')) return 'drop.fill';
  if (k.includes('meditation') || k.includes('mind') || k.includes('journal')) return 'brain.head.profile';
  if (k.includes('work') || k.includes('planning')) return 'bag.fill';
  return 'star.fill';
}

function buildSparklinePath(values: number[], width = 40, height = 10): string {
  if (values.length === 0) return `M0,${height - 1} L${width},${height - 1}`;
  const max = Math.max(1, ...values);
  const step = values.length <= 1 ? width : width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * step;
      const y = height - 1 - (v / max) * (height - 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function formatDeltaLabel(current: number, prev: number): string {
  if (prev <= 0) return current > 0 ? '+100%' : '0%';
  const pct = Math.round(((current - prev) / prev) * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

export function buildWeeklyCoreGoals(input: {
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  weekStartKey: string;
  weekEndKey: string;
  prevWeekStartKey: string;
  prevWeekEndKey: string;
  categoryLabel: (key: string) => string;
  limit?: number;
}): WeeklyCoreGoal[] {
  const { dailyStatsByDate, weekStartKey, weekEndKey, prevWeekStartKey, prevWeekEndKey, categoryLabel, limit = 2 } =
    input;

  const weekTotals = new Map<string, number>();
  const prevTotals = new Map<string, number>();

  for (const row of Object.values(dailyStatsByDate)) {
    if (row.dateKey >= weekStartKey && row.dateKey <= weekEndKey) {
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        weekTotals.set(key, (weekTotals.get(key) ?? 0) + count);
      }
    }
    if (row.dateKey >= prevWeekStartKey && row.dateKey <= prevWeekEndKey) {
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        prevTotals.set(key, (prevTotals.get(key) ?? 0) + count);
      }
    }
  }

  const ranked = [...weekTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);

  return ranked.map(([categoryKey, completed]) => {
    const prev = prevTotals.get(categoryKey) ?? 0;
    const target = Math.max(completed + 1, prev > 0 ? Math.ceil(prev * 1.15) : 5, 5);
    const dayValues: number[] = [];
    for (let i = 0; i < 7; i += 1) {
      const dateKey = addDaysToLocalDateKey(weekStartKey, i);
      if (dateKey > weekEndKey) break;
      const row = dailyStatsByDate[dateKey];
      dayValues.push(row ? getCategoryCompletions(row)[categoryKey] ?? 0 : 0);
    }
    return {
      categoryKey,
      title: categoryLabel(categoryKey),
      icon: categoryIcon(categoryKey),
      completed,
      target,
      deltaLabel: formatDeltaLabel(completed, prev),
      sparklinePath: buildSparklinePath(dayValues),
      metricSubtitle: '이번 주 완료',
    };
  });
}
