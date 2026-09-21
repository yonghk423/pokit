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
import { t } from '@shared/lib/i18n';

export const PRIORITY_DAY_END_NOTIFICATION_ID = 'pokit:priority-day-end';
const PRIORITY_DAY_END_EVENT_TYPE = 'priorityDayEnd';

let syncInFlight: Promise<boolean> | null = null;
let lastSyncedAlarmKey = '';

function buildSyncKey(enabled: boolean, reminderHhmm: string, reminderNextDay: boolean): string {
  return `${enabled ? '1' : '0'}:${reminderHhmm.trim()}:${reminderNextDay ? '1' : '0'}`;
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
  /** 자정 넘김 하루에서 다음 날(아침) 시각인지 — 표시·저장용. 매일 동일 시계 시각에 울림 */
  reminderNextDay?: boolean;
}): Promise<boolean> {
  const reminderNextDay = Boolean(input.reminderNextDay);
  const syncKey = buildSyncKey(input.enabled, input.reminderHhmm, reminderNextDay);
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
        savePriorityDayEndAlarm({
          enabled: false,
          reminderHhmm: input.reminderHhmm,
          reminderNextDay,
          notificationId: null,
        });
        lastSyncedAlarmKey = syncKey;
        return true;
      }

      const m = parseHHmmToMinutes(input.reminderHhmm);
      if (m === null || m >= 24 * 60) {
        savePriorityDayEndAlarm({
          enabled: false,
          reminderHhmm: input.reminderHhmm,
          reminderNextDay,
          notificationId: null,
        });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const permitted = await ensureLocalNotificationPermission();
      if (!permitted) {
        savePriorityDayEndAlarm({
          enabled: false,
          reminderHhmm: input.reminderHhmm,
          reminderNextDay,
          notificationId: null,
        });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const timeLabel = reminderNextDay
        ? `${formatHhmmClockKo(input.reminderHhmm)}${t('dayRhythm.nextDaySuffix')}`
        : formatHhmmClockKo(input.reminderHhmm);
      const nid = await scheduleDailyLocalNotification({
        identifier: PRIORITY_DAY_END_NOTIFICATION_ID,
        title: t('notify.priorityDayEnd.title'),
        body: t('notify.priorityDayEnd.body', { time: timeLabel }),
        hour,
        minute,
        data: {
          eventType: PRIORITY_DAY_END_EVENT_TYPE,
          reminderNextDay,
        },
      });

      if (!nid) {
        savePriorityDayEndAlarm({
          enabled: false,
          reminderHhmm: input.reminderHhmm,
          reminderNextDay,
          notificationId: null,
        });
        lastSyncedAlarmKey = syncKey;
        return false;
      }

      savePriorityDayEndAlarm({
        enabled: true,
        reminderHhmm: input.reminderHhmm,
        reminderNextDay,
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
