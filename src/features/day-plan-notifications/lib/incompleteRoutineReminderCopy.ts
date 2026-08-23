import type { PendingRoutineCountsByLayout } from '@entities/day-plan';

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
    .map((mode) => `${MODE_NOTIFICATION_SYMBOLS[mode]} ${normalized[mode]}개`)
    .join('   ');

  return {
    title: `미완료 루틴 ${total}개가 있습니다.`,
    body,
  };
}
