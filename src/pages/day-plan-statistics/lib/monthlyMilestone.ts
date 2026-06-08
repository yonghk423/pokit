import { addDaysToLocalDateKey } from '@entities/day-plan';
import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';

export type MonthlyHeatCell = {
  dateKey: string;
  level: number;
};

export type MonthlyTopFlow = {
  categoryKey: string;
  title: string;
  icon: 'book.fill' | 'figure.run' | 'drop.fill' | 'brain.head.profile' | 'bag.fill' | 'moon.fill' | 'star.fill';
  hitDays: number;
  totalDays: number;
};

export type MonthlyVisualSnapshot = {
  dateKey: string;
  title: string;
  subtitle: string;
  level: number;
};

function categoryIcon(categoryKey: string): MonthlyTopFlow['icon'] {
  const k = categoryKey.toLowerCase();
  if (k.includes('reading') || k.includes('study')) return 'book.fill';
  if (k.includes('sleep') || k.includes('rest')) return 'moon.fill';
  if (k.includes('workout') || k.includes('stretch') || k.includes('yoga')) return 'figure.run';
  if (k.includes('water') || k.includes('medicine')) return 'drop.fill';
  if (k.includes('meditation') || k.includes('mind') || k.includes('journal')) return 'brain.head.profile';
  if (k.includes('work') || k.includes('planning')) return 'bag.fill';
  return 'star.fill';
}

function completionLevel(completedFlowCount: number): number {
  if (completedFlowCount >= 6) return 4;
  if (completedFlowCount >= 4) return 3;
  if (completedFlowCount >= 2) return 2;
  if (completedFlowCount >= 1) return 1;
  return 0;
}

export function buildMonthlyHeatCells(
  todayDateKey: string,
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  dayCount = 30,
): MonthlyHeatCell[] {
  return Array.from({ length: dayCount }, (_, idx) => {
    const dateKey = addDaysToLocalDateKey(todayDateKey, -dayCount + 1 + idx);
    const completions = dailyStatsByDate[dateKey]?.completedFlowCount ?? 0;
    return { dateKey, level: completionLevel(completions) };
  });
}

export function chunkHeatRows(cells: MonthlyHeatCell[], columns = 7): MonthlyHeatCell[][] {
  const rows: MonthlyHeatCell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    rows.push(cells.slice(i, i + columns));
  }
  return rows;
}

export function buildMonthlyCompletionRate(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
): number {
  let activeDays = 0;
  let totalRate = 0;
  for (const row of Object.values(dailyStatsByDate)) {
    if (row.dateKey < startDateKey || row.dateKey > endDateKey) continue;
    totalRate += Math.max(0, Math.min(1, Number(row.completionRate) || 0));
    activeDays += 1;
  }
  if (activeDays <= 0) return 0;
  return totalRate / activeDays;
}

export function buildMonthlyFlowTotal(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
): number {
  let total = 0;
  for (const row of Object.values(dailyStatsByDate)) {
    if (row.dateKey < startDateKey || row.dateKey > endDateKey) continue;
    total += Math.max(0, row.completedFlowCount);
  }
  return total;
}

export function buildGrowthTrendPath(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  todayDateKey: string,
  pointCount = 6,
  width = 100,
  height = 40,
): { d: string; endX: number; endY: number } {
  const values: number[] = [];
  const span = 30;
  const step = Math.max(1, Math.floor(span / pointCount));
  for (let i = 0; i < pointCount; i += 1) {
    const offset = -span + 1 + i * step;
    const dateKey = addDaysToLocalDateKey(todayDateKey, offset);
    const row = dailyStatsByDate[dateKey];
    const rate = row ? Math.max(0, Math.min(1, Number(row.completionRate) || 0)) : 0;
    values.push(rate);
  }
  if (values.every((v) => v === 0)) {
    return { d: `M0 ${height - 4} L${width} ${height - 4}`, endX: width, endY: height - 4 };
  }
  const max = Math.max(0.01, ...values);
  const xStep = values.length <= 1 ? width : width / (values.length - 1);
  const coords = values.map((v, i) => {
    const x = i * xStep;
    const y = height - 4 - (v / max) * (height - 10);
    return { x, y };
  });
  if (coords.length === 1) {
    return { d: `M${coords[0].x} ${coords[0].y}`, endX: coords[0].x, endY: coords[0].y };
  }
  let d = `M${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q${cx} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  const last = coords[coords.length - 1];
  return { d, endX: last.x, endY: last.y };
}

export function buildMonthlySuccessSummary(
  rate: number,
  rateDeltaPct: number,
  streak: number,
): string {
  if (rate <= 0) return '이번 달 기록이 쌓이면 완료 패턴과 성장 트렌드가 표시돼요.';
  if (rateDeltaPct >= 10) {
    return `완료율이 전월보다 높아졌어요. 최근 ${streak}일 연속 기록을 이어가며 페이스가 안정되고 있어요.`;
  }
  if (rateDeltaPct <= -10) {
    return '완료율이 다소 낮아졌어요. 부담이 적은 플로우 하나부터 다시 채워 보세요.';
  }
  return `완료율이 비교적 고른 편이에요. 이번 달 ${streak}일 연속 기록을 기준으로 다음 목표를 잡아 보세요.`;
}

export function buildMonthlyTopFlow(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  todayDateKey: string,
  categoryLabel: (key: string) => string,
  totalDays = 30,
): MonthlyTopFlow | null {
  const startKey = addDaysToLocalDateKey(todayDateKey, -totalDays + 1);
  const hitByCategory = new Map<string, number>();

  for (let i = 0; i < totalDays; i += 1) {
    const dateKey = addDaysToLocalDateKey(startKey, i);
    const row = dailyStatsByDate[dateKey];
    if (!row) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count <= 0) continue;
      hitByCategory.set(key, (hitByCategory.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...hitByCategory.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  if (!top) return null;

  return {
    categoryKey: top[0],
    title: categoryLabel(top[0]),
    icon: categoryIcon(top[0]),
    hitDays: top[1],
    totalDays,
  };
}

export function buildMonthlyVisualSnapshots(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  todayDateKey: string,
  limit = 3,
): MonthlyVisualSnapshot[] {
  const startKey = addDaysToLocalDateKey(todayDateKey, -29);
  const rows = Object.values(dailyStatsByDate)
    .filter((row) => row.dateKey >= startKey && row.dateKey <= todayDateKey && row.completedFlowCount > 0)
    .sort((a, b) => b.completedFlowCount - a.completedFlowCount || b.dateKey.localeCompare(a.dateKey))
    .slice(0, limit);

  return rows.map((row) => {
    const top = Object.entries(getCategoryCompletions(row)).sort((a, b) => b[1] - a[1])[0];
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.dateKey);
    const dateLabel = m ? `${Number(m[2])}월 ${Number(m[3])}일` : row.dateKey;
    return {
      dateKey: row.dateKey,
      title: top ? categoryLabelFromKey(top[0]) : '기록된 하루',
      subtitle: `${dateLabel} · 완료 ${row.completedFlowCount}개`,
      level: completionLevel(row.completedFlowCount),
    };
  });
}

function categoryLabelFromKey(key: string): string {
  if (key.includes('reading')) return '독서의 기록';
  if (key.includes('meditation') || key.includes('mind')) return '마음 챙김';
  if (key.includes('workout') || key.includes('stretch')) return '몸을 돌본 날';
  if (key.includes('water')) return '수분 챙김';
  return '집중의 순간';
}

export function buildMonthlyClosingNote(rate: number, streak: number, topFlowTitle: string | null): string {
  if (rate <= 0) {
    return '"작은 완료 하나가 달의 방향을 바꿉니다. 내일 한 가지부터 시작해 보세요."';
  }
  if (streak >= 14 && topFlowTitle) {
    return `"이번 달은 ${topFlowTitle} 중심으로 페이스가 잡혔어요. 연속 ${streak}일의 기록이 다음 달의 기준선이 됩니다."`;
  }
  if (rate >= 0.75) {
    return '"이번 달은 건축적인 명료함이 특징이었어요. 불필요한 부담을 줄이며 자신만의 페이스를 찾았어요."';
  }
  return '"완료와 쉼이 번갈아 있었던 달이에요. 다음 달에는 가장 잘 되던 시간대에 플로우를 배치해 보세요."';
}

function formatDeltaPercent(current: number, prev: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

export function buildMonthlyRateDeltaLabel(currentRate: number, previousRate: number): string {
  const pct = formatDeltaPercent(Math.round(currentRate * 100), Math.round(previousRate * 100));
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}
