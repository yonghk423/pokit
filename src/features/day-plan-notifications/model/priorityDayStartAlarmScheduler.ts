import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  ensureLocalNotificationPermission,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import { loadPriorityDayStartAlarm, savePriorityDayStartAlarm } from '@shared/lib/storage';

/**
 * 저장된「하루 시작」알림을 끄거나, `startHhmm`에 맞춰 매일 반복 알림을 다시 예약합니다.
 * 권한 거부 시 `enabled`는 저장소에서 false로 돌아갑니다.
 */
export async function syncPriorityDayStartAlarm(input: {
  enabled: boolean;
  startHhmm: string;
}): Promise<boolean> {
  try {
    const prev = loadPriorityDayStartAlarm();
    if (prev.notificationId) {
      await cancelLocalNotificationsById([prev.notificationId]);
    }

    if (!input.enabled) {
      savePriorityDayStartAlarm({ enabled: false, notificationId: null });
      return true;
    }

    const m = parseHHmmToMinutes(input.startHhmm);
    if (m === null || m >= 24 * 60) {
      savePriorityDayStartAlarm({ enabled: false, notificationId: null });
      return false;
    }

    const permitted = await ensureLocalNotificationPermission();
    if (!permitted) {
      savePriorityDayStartAlarm({ enabled: false, notificationId: null });
      return false;
    }

    const hour = Math.floor(m / 60);
    const minute = m % 60;
    const startLabel = formatHhmmClockKo(input.startHhmm);
    const nid = await scheduleDailyLocalNotification({
      title: '오늘이 시작됐어요',
      body: `하루 시작 · ${startLabel} 시간 입니다.`,
      hour,
      minute,
      data: { eventType: 'priorityDayStart' },
    });

    if (!nid) {
      savePriorityDayStartAlarm({ enabled: false, notificationId: null });
      return false;
    }

    savePriorityDayStartAlarm({ enabled: true, notificationId: nid });
    return true;
  } finally {
    void useLocalNotificationsStore.getState().refreshPermission();
  }
}
