import type { HistoryDailyStat } from '@entities/history';

export function countDaysInCompletionRateAverage(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
): number {
  let count = 0;
  for (const row of Object.values(dailyStatsByDate)) {
    if (row.dateKey < startDateKey || row.dateKey > endDateKey) continue;
    count += 1;
  }
  return count;
}

export function buildTrendPeriodRangeLabel(
  startDateKey: string,
  endDateKey: string,
  formatDateKeyKo: (dateKey: string) => string,
): string {
  if (startDateKey === endDateKey) return formatDateKeyKo(startDateKey);
  return `${formatDateKeyKo(startDateKey)}~${formatDateKeyKo(endDateKey)}`;
}

export function buildTrendRateSubtitle(input: {
  recordedDayCount: number;
  startDateKey: string;
  endDateKey: string;
  formatDateKeyKo: (dateKey: string) => string;
}): string {
  const period = buildTrendPeriodRangeLabel(
    input.startDateKey,
    input.endDateKey,
    input.formatDateKeyKo,
  );
  if (input.recordedDayCount <= 0) {
    return `${period} · 아직 완료 기록이 없어요`;
  }
  return `${period} · 기록 ${input.recordedDayCount}일의 평균 완료율`;
}

export function buildTrendDeltaContextLabel(currentRate: number, previousRate: number): string {
  if (previousRate <= 0 && currentRate <= 0) return '지난달 기록 없음';
  return '지난달 대비';
}

export function buildTrendGraphCaption(recordedDayCount: number): string {
  if (recordedDayCount <= 0) {
    return '오늘 탭에서 루틴을 완료하면 여기에 쌓여요';
  }
  return '이번 달 일별 완료율 추이';
}

export function buildTrendStreakFooter(streak: number): string {
  if (streak >= 14) return `연속 ${streak}일 — 장기 흐름이 자리 잡고 있어요`;
  if (streak >= 7) return `연속 ${streak}일 — 꾸준히 이어가는 중이에요`;
  if (streak > 0) return `연속 ${streak}일 — 흐름을 쌓는 중이에요`;
  return '연속 달성 0일 — 오늘 하나만 완료해도 1일부터 시작해요';
}
