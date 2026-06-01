import { addDaysToLocalDateKey, categoryReminderLabelKo } from '@entities/day-plan';
import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';

export type PeriodActivityLine = {
  categoryKey: string;
  label: string;
  completions: number;
};

function isBetween(dateKey: string, startDateKey: string, endDateKey: string): boolean {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

export function aggregatePeriodActivities(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
): PeriodActivityLine[] {
  const map: Record<string, number> = {};

  for (const row of Object.values(dailyStatsByDate)) {
    if (!isBetween(row.dateKey, startDateKey, endDateKey)) continue;
    for (const [key, countRaw] of Object.entries(getCategoryCompletions(row))) {
      const count = Math.max(0, Math.floor(Number(countRaw) || 0));
      if (count <= 0) continue;
      map[key] = (map[key] ?? 0) + count;
    }
  }

  return Object.entries(map)
    .map(([categoryKey, completions]) => ({
      categoryKey,
      label: categoryReminderLabelKo(categoryKey),
      completions,
    }))
    .sort((a, b) => b.completions - a.completions);
}

export function getWeeklyPeriodRange(weekStartKey: string): { startDateKey: string; endDateKey: string } {
  return {
    startDateKey: weekStartKey,
    endDateKey: addDaysToLocalDateKey(weekStartKey, 6),
  };
}

export function getMonthlyPeriodRange(monthKey: string): { startDateKey: string; endDateKey: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) {
    return { startDateKey: monthKey, endDateKey: monthKey };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const lastDay = new Date(year, month, 0, 12, 0, 0, 0).getDate();
  const mo = String(month).padStart(2, '0');
  return {
    startDateKey: `${year}-${mo}-01`,
    endDateKey: `${year}-${mo}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function formatPeriodActivityLines(lines: PeriodActivityLine[], limit = 5): string[] {
  if (lines.length === 0) return [];
  return lines.slice(0, limit).map((row, idx) => `${idx + 1}. ${row.label} · ${row.completions}개`);
}
