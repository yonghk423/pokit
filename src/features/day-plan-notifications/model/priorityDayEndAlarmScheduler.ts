import { formatHhmmClockKo, parseHHmmToMinutes } from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  cancelScheduledNotificationsByEventType,
  cancelScheduledNotificationsByEventTypeExcept,
  ensureLocalNotificationPermission,
  getScheduledDailyLocalTrigger,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import { loadPriorityDayEndAlarm, savePriorityDayEndAlarm } from '@shared/lib/storage';
import { t } from '@shared/lib/i18n';

export const PRIORITY_DAY_END_NOTIFICATION_ID = 'pokit:priority-day-end';
const PRIORITY_DAY_END_EVENT_TYPE = 'priorityDayEnd';

/** 직렬 큐 — in-flight Promise를 그대로 반환하면 다른 시각 요청이 유실된다 */
let syncQueue: Promise<boolean> = Promise.resolve(true);
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

async function performSync(input: {
  enabled: boolean;
  reminderHhmm: string;
  reminderNextDay: boolean;
}): Promise<boolean> {
  const reminderHhmm = input.reminderHhmm.trim();
  const reminderNextDay = Boolean(input.reminderNextDay);
  const syncKey = buildSyncKey(input.enabled, reminderHhmm, reminderNextDay);
  if (syncKey === lastSyncedAlarmKey) {
    return true;
  }

  if (!input.enabled) {
    await cancelAllPriorityDayEndNotifications();
    savePriorityDayEndAlarm({
      enabled: false,
      reminderHhmm,
      reminderNextDay,
      notificationId: null,
    });
    lastSyncedAlarmKey = syncKey;
    return true;
  }

  const m = parseHHmmToMinutes(reminderHhmm);
  if (m === null || m >= 24 * 60) {
    await cancelAllPriorityDayEndNotifications();
    savePriorityDayEndAlarm({
      enabled: false,
      reminderHhmm,
      reminderNextDay,
      notificationId: null,
    });
    lastSyncedAlarmKey = syncKey;
    return false;
  }

  const hour = Math.floor(m / 60);
  const minute = m % 60;

  const existing = await getScheduledDailyLocalTrigger(PRIORITY_DAY_END_NOTIFICATION_ID);
  if (existing && existing.hour === hour && existing.minute === minute) {
    savePriorityDayEndAlarm({
      enabled: true,
      reminderHhmm,
      reminderNextDay,
      notificationId: PRIORITY_DAY_END_NOTIFICATION_ID,
    });
    lastSyncedAlarmKey = syncKey;
    return true;
  }

  await cancelAllPriorityDayEndNotifications();

  const permitted = await ensureLocalNotificationPermission();
  if (!permitted) {
    savePriorityDayEndAlarm({
      enabled: false,
      reminderHhmm,
      reminderNextDay,
      notificationId: null,
    });
    lastSyncedAlarmKey = syncKey;
    return false;
  }

  const timeLabel = reminderNextDay
    ? `${formatHhmmClockKo(reminderHhmm)}${t('dayRhythm.nextDaySuffix')}`
    : formatHhmmClockKo(reminderHhmm);
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
      reminderHhmm,
      reminderNextDay,
      notificationId: null,
    });
    lastSyncedAlarmKey = syncKey;
    return false;
  }

  await cancelScheduledNotificationsByEventTypeExcept(
    PRIORITY_DAY_END_EVENT_TYPE,
    PRIORITY_DAY_END_NOTIFICATION_ID,
  );

  savePriorityDayEndAlarm({
    enabled: true,
    reminderHhmm,
    reminderNextDay,
    notificationId: nid,
  });
  lastSyncedAlarmKey = syncKey;
  return true;
}

export async function syncPriorityDayEndAlarm(input: {
  enabled: boolean;
  reminderHhmm: string;
  /** 자정 넘김 하루에서 다음 날(아침) 시각인지 — 표시·저장용. 매일 동일 시계 시각에 울림 */
  reminderNextDay?: boolean;
}): Promise<boolean> {
  const run = syncQueue.then(
    () =>
      performSync({
        enabled: input.enabled,
        reminderHhmm: input.reminderHhmm,
        reminderNextDay: Boolean(input.reminderNextDay),
      }),
    () =>
      performSync({
        enabled: input.enabled,
        reminderHhmm: input.reminderHhmm,
        reminderNextDay: Boolean(input.reminderNextDay),
      }),
  );
  syncQueue = run.then(
    () => true,
    () => true,
  );
  try {
    return await run;
  } finally {
    void useLocalNotificationsStore.getState().refreshPermission();
  }
}
