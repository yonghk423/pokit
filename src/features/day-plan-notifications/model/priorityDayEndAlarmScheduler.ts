import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  cancelScheduledNotificationsByEventType,
  ensureLocalNotificationPermission,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import { loadPriorityDayEndAlarm, savePriorityDayEndAlarm } from '@shared/lib/storage';

export const PRIORITY_DAY_END_NOTIFICATION_ID = 'pokit:priority-day-end';
const PRIORITY_DAY_END_EVENT_TYPE = 'priorityDayEnd';

let syncInFlight: Promise<boolean> | null = null;
let lastSyncedAlarmKey = '';

function buildSyncKey(enabled: boolean, reminderHhmm: string): string {
  return `${enabled ? '1' : '0'}:${reminderHhmm.trim()}`;
}

async function cancelAllPriorityDayEndNotifications(): Promise<void> {
  const prev = loadPriorityDayEndAlarm();
  await cancelScheduledNotificationByIdentifier(PRIORITY_DAY_END_NOTIFICATION_ID);
  if (prev.notificationId && prev.notificationId !== PRIORITY_DAY_END_NOTIFICATION_ID) {
    await cancelLocalNotificationsById([prev.notificationId]);
  }
  await cancelScheduledNotificationsByEventType(PRIORITY_DAY_END_EVENT_TYPE);
}

export async function syncPriorityDayEndAlarm(input: {
  enabled: boolean;
  reminderHhmm: string;
}): Promise<boolean> {
  const syncKey = buildSyncKey(input.enabled, input.reminderHhmm);
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      if (syncKey === lastSyncedAlarmKey) {
        return true;
      }

      await cancelAllPriorityDayEndNotifications();

      if (!input.enabled) {
        savePriorityDayEndAlarm({ enabled: false, reminderHhmm: input.reminderHhmm, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return true;
      }

      const m = parseHHmmToMinutes(input.reminderHhmm);
      if (m === null || m >= 24 * 60) {
        savePriorityDayEndAlarm({ enabled: false, reminderHhmm: input.reminderHhmm, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const permitted = await ensureLocalNotificationPermission();
      if (!permitted) {
        savePriorityDayEndAlarm({ enabled: false, reminderHhmm: input.reminderHhmm, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const timeLabel = formatHhmmClockKo(input.reminderHhmm);
      const nid = await scheduleDailyLocalNotification({
        identifier: PRIORITY_DAY_END_NOTIFICATION_ID,
        title: '오늘을 돌아볼 시간이에요',
        body: `${timeLabel} · 진행 상황을 한 번 확인해 보세요.`,
        hour,
        minute,
        data: { eventType: PRIORITY_DAY_END_EVENT_TYPE },
      });

      if (!nid) {
        savePriorityDayEndAlarm({ enabled: false, reminderHhmm: input.reminderHhmm, notificationId: null });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      savePriorityDayEndAlarm({
        enabled: true,
        reminderHhmm: input.reminderHhmm,
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
