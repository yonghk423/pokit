import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationsByEventType,
} from '@shared/lib/notifications';
import {
  loadCategoryReminderScheduled,
  saveCategoryReminderScheduled,
} from '@shared/lib/storage';

export const CATEGORY_REMINDER_EVENT_TYPE = 'categoryReminder';

/**
 * 여러 스토어 구독이 한 변경에 연달아 반응해도 취소가 겹치지 않게 합니다.
 */
let categoryReminderSyncQueue: Promise<void> = Promise.resolve();

/**
 * 시간 알림 OS 예약은 사용하지 않음. 호출 시 기존 예약만 취소한다.
 */
async function performCategoryReminderNotificationSync(): Promise<void> {
  const prev = loadCategoryReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  await cancelScheduledNotificationsByEventType(CATEGORY_REMINDER_EVENT_TYPE);
  saveCategoryReminderScheduled([]);
}

export function syncCategoryReminderNotifications(): Promise<void> {
  const run = categoryReminderSyncQueue.then(
    performCategoryReminderNotificationSync,
    performCategoryReminderNotificationSync,
  );
  categoryReminderSyncQueue = run.catch(() => undefined);
  return run;
}
