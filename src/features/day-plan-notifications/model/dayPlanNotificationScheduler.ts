import { cancelLocalNotificationsById } from '@shared/lib/notifications';
import {
  loadDayPlanScheduledNotifications,
  saveDayPlanScheduledNotifications,
} from '@shared/lib/storage';

/** 일정 시작 예약 알림 제거 후(현재는 시작 알림 미사용) 저장소의 예약 목록만 비웁니다. */
export async function rescheduleDayPlanNotifications(): Promise<boolean> {
  const prev = loadDayPlanScheduledNotifications();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((x) => x.notificationId));
  }
  saveDayPlanScheduledNotifications([]);
  return true;
}

export async function cancelDayPlanNotificationsForBlock(blockId: string): Promise<void> {
  if (!blockId) return;
  const prev = loadDayPlanScheduledNotifications();
  if (prev.length === 0) return;

  const remove = prev.filter((x) => x.blockId === blockId);
  if (remove.length === 0) return;

  await cancelLocalNotificationsById(remove.map((x) => x.notificationId));
  const next = prev.filter((x) => x.blockId !== blockId);
  saveDayPlanScheduledNotifications(next);
}
