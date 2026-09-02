import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  cancelScheduledNotificationsByEventType,
  ensureLocalNotificationPermission,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import { loadPriorityDayStartAlarm, savePriorityDayStartAlarm } from '@shared/lib/storage';
import { t } from '@shared/lib/i18n';

/** OS 예약 ID — 재예약 시 동일 ID로 덮어써 중복 방지 */
export const PRIORITY_DAY_START_NOTIFICATION_ID = 'pokit:priority-day-start';
const PRIORITY_DAY_START_EVENT_TYPE = 'priorityDayStart';

let syncInFlight: Promise<boolean> | null = null;
let lastSyncedAlarmKey = '';

function buildSyncKey(enabled: boolean, startHhmm: string): string {
  return `${enabled ? '1' : '0'}:${startHhmm.trim()}`;
}

async function cancelAllPriorityDayStartNotifications(): Promise<void> {
  const prev = loadPriorityDayStartAlarm();
  await cancelScheduledNotificationByIdentifier(PRIORITY_DAY_START_NOTIFICATION_ID);
  if (prev.notificationId && prev.notificationId !== PRIORITY_DAY_START_NOTIFICATION_ID) {
    await cancelLocalNotificationsById([prev.notificationId]);
  }
  await cancelScheduledNotificationsByEventType(PRIORITY_DAY_START_EVENT_TYPE);
}

/**
 * 저장된「하루 시작」알림을 끄거나, `startHhmm`에 맞춰 매일 반복 알림을 다시 예약합니다.
 * 권한 거부 시 `enabled`는 저장소에서 false로 돌아갑니다.
 */
export async function syncPriorityDayStartAlarm(input: {
  enabled: boolean;
  startHhmm: string;
}): Promise<boolean> {
  const syncKey = buildSyncKey(input.enabled, input.startHhmm);
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      if (syncKey === lastSyncedAlarmKey) {
        return true;
      }

      await cancelAllPriorityDayStartNotifications();

      if (!input.enabled) {
        savePriorityDayStartAlarm({ enabled: false, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return true;
      }

      const m = parseHHmmToMinutes(input.startHhmm);
      if (m === null || m >= 24 * 60) {
        savePriorityDayStartAlarm({ enabled: false, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const permitted = await ensureLocalNotificationPermission();
      if (!permitted) {
        savePriorityDayStartAlarm({ enabled: false, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const startLabel = formatHhmmClockKo(input.startHhmm);
      const nid = await scheduleDailyLocalNotification({
        identifier: PRIORITY_DAY_START_NOTIFICATION_ID,
        title: t('notify.priorityDayStart.title'),
        body: t('notify.priorityDayStart.body', { time: startLabel }),
        hour,
        minute,
        data: { eventType: PRIORITY_DAY_START_EVENT_TYPE },
      });

      if (!nid) {
        savePriorityDayStartAlarm({ enabled: false, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      savePriorityDayStartAlarm({
        enabled: true,
        notificationId: nid,
      });
      lastSyncedAlarmKey = syncKey;
      return true;
    } finally {
      syncInFlight = null;
      void useLocalNotificationsStore.getState().refreshPermission();
    }
  })();

  return syncInFlight;
}
