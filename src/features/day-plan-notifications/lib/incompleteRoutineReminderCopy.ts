import type { PendingRoutineCountsByLayout } from '@entities/day-plan';
import { t, tIncompleteRoutineCountPart } from '@shared/lib/i18n';

const MODE_NOTIFICATION_SYMBOLS: Record<keyof PendingRoutineCountsByLayout, string> = {
  bag: '▤',
  sections: '☀︎',
  spine: '◷',
};

export function buildIncompleteRoutineReminderNotificationContent(
  counts: PendingRoutineCountsByLayout,
): {
  title: string;
  body: string;
} {
  const normalized: PendingRoutineCountsByLayout = {
    bag: Math.max(0, Math.floor(counts.bag)),
    sections: Math.max(0, Math.floor(counts.sections)),
    spine: Math.max(0, Math.floor(counts.spine)),
  };
  const total = normalized.bag + normalized.sections + normalized.spine;
  const body = (Object.keys(normalized) as (keyof PendingRoutineCountsByLayout)[])
    .filter((mode) => normalized[mode] > 0)
    .map(
      (mode) =>
        `${MODE_NOTIFICATION_SYMBOLS[mode]} ${tIncompleteRoutineCountPart(normalized[mode])}`,
    )
    .join('   ');

  return {
    title: t('notify.incomplete.title', { count: total }),
    body,
  };
}
