import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  getScheduledLocalNotifications,
} from '@shared/lib/notifications';
import {
  loadIncompleteRoutineReminder,
  saveIncompleteRoutineReminder,
} from '@shared/lib/storage';

export const INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID = 'pokit:incomplete-routine-reminder';
export const INCOMPLETE_ROUTINE_REMINDER_EVENT_TYPE = 'incompleteRoutineReminder';
const INCOMPLETE_ROUTINE_WEEKLY_ID_PREFIX = 'pokit:incomplete-routine-weekly:';
const INCOMPLETE_ROUTINE_DATE_ID_PREFIX = 'pokit:incomplete-routine-date:';

let syncInFlight: Promise<boolean> | null = null;

async function cancelAllIncompleteRoutineReminderNotifications(
  notificationId: string | null,
): Promise<void> {
  await cancelScheduledNotificationByIdentifier(INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID);
  if (notificationId && notificationId !== INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID) {
    await cancelLocalNotificationsById([notificationId]);
  }
  for (const weekday of [0, 1, 2, 3, 4, 5, 6]) {
    await cancelScheduledNotificationByIdentifier(
      `${INCOMPLETE_ROUTINE_WEEKLY_ID_PREFIX}${weekday}`,
    );
  }
  const scheduled = await getScheduledLocalNotifications();
  const staleIds = scheduled
    .filter(
      (row) =>
        row.eventType === INCOMPLETE_ROUTINE_REMINDER_EVENT_TYPE ||
        row.identifier.startsWith(INCOMPLETE_ROUTINE_DATE_ID_PREFIX) ||
        row.identifier.startsWith(INCOMPLETE_ROUTINE_WEEKLY_ID_PREFIX) ||
        row.identifier === INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID,
    )
    .map((row) => row.identifier);
  if (staleIds.length > 0) {
    await cancelLocalNotificationsById([...new Set(staleIds)]);
  }
}

/**
 * 미완료 일정 알림 기능은 제거됨.
 * 남아 있는 예약·저장값을 끄고 취소만 수행합니다.
 */
export async function syncIncompleteRoutineReminderNotifications(): Promise<boolean> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const config = loadIncompleteRoutineReminder();
      await cancelAllIncompleteRoutineReminderNotifications(config.notificationId);
      if (config.enabled || config.notificationId) {
        saveIncompleteRoutineReminder({
          enabled: false,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
      }
      return true;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/** @deprecated 미완료 일정 알림 UI 제거 — 호출 시 항상 끔 */
export async function saveIncompleteRoutineReminderSettings(input: {
  enabled: boolean;
  reminderHhmm: string;
}): Promise<boolean> {
  const prev = loadIncompleteRoutineReminder();
  saveIncompleteRoutineReminder({
    enabled: false,
    reminderHhmm: input.reminderHhmm.trim() || prev.reminderHhmm,
    notificationId: null,
  });
  return syncIncompleteRoutineReminderNotifications();
}
