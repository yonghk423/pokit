import type { HistoryPeriodCompare } from '../lib/historyPeriodCompare';
import { t } from '@shared/lib/i18n';

function formatSignedDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

/** 전주/전월 대비 한 줄 — 이전 기록이 없으면 null */
export function formatHistoryCompareLine(
  compare: HistoryPeriodCompare,
  period: 'week' | 'month',
): string | null {
  if (!compare.hasPreviousData) return null;
  if (compare.activeDaysDelta === 0 && compare.completionsDelta === 0) {
    return t('history.summary.compare.same');
  }
  const scope =
    period === 'week' ? t('history.summary.compare.prevWeek') : t('history.summary.compare.prevMonth');
  return t('history.summary.compare.delta', {
    scope,
    activeDelta: formatSignedDelta(compare.activeDaysDelta),
    completionsDelta: formatSignedDelta(compare.completionsDelta),
  });
}
