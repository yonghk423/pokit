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
import { loadPriorityDayStartAlarm, savePriorityDayStartAlarm } from '@shared/lib/storage';
import { t } from '@shared/lib/i18n';

/** OS 예약 ID — 재예약 시 동일 ID로 덮어써 중복 방지 */
export const PRIORITY_DAY_START_NOTIFICATION_ID = 'pokit:priority-day-start';
const PRIORITY_DAY_START_EVENT_TYPE = 'priorityDayStart';

/** 직렬 큐 — in-flight Promise를 그대로 반환하면 다른 시각 요청이 유실된다 */
let syncQueue: Promise<boolean> = Promise.resolve(true);
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

async function performSync(input: { enabled: boolean; startHhmm: string }): Promise<boolean> {
  const startHhmm = input.startHhmm.trim();
  const syncKey = buildSyncKey(input.enabled, startHhmm);
  if (syncKey === lastSyncedAlarmKey) {
    return true;
  }

  if (!input.enabled) {
    await cancelAllPriorityDayStartNotifications();
    savePriorityDayStartAlarm({ enabled: false, notificationId: null });
    lastSyncedAlarmKey = syncKey;
    return true;
  }

  const m = parseHHmmToMinutes(startHhmm);
  if (m === null || m >= 24 * 60) {
    await cancelAllPriorityDayStartNotifications();
    savePriorityDayStartAlarm({ enabled: false, notificationId: null });
    lastSyncedAlarmKey = syncKey;
    return false;
  }

  const hour = Math.floor(m / 60);
  const minute = m % 60;

  /**
   * 이미 같은 시·분으로 예약돼 있으면 cancel→재예약을 하지 않는다.
   * (현재 분에 재예약하면 iOS가 즉시 한 번 더 울리는 경우가 있음)
   */
  const existing = await getScheduledDailyLocalTrigger(PRIORITY_DAY_START_NOTIFICATION_ID);
  if (existing && existing.hour === hour && existing.minute === minute) {
    savePriorityDayStartAlarm({
      enabled: true,
      notificationId: PRIORITY_DAY_START_NOTIFICATION_ID,
    });
    lastSyncedAlarmKey = syncKey;
    return true;
  }

  await cancelAllPriorityDayStartNotifications();

  const permitted = await ensureLocalNotificationPermission();
  if (!permitted) {
    savePriorityDayStartAlarm({ enabled: false, notificationId: null });
    lastSyncedAlarmKey = syncKey;
    return false;
  }

  const startLabel = formatHhmmClockKo(startHhmm);
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

  await cancelScheduledNotificationsByEventTypeExcept(
    PRIORITY_DAY_START_EVENT_TYPE,
    PRIORITY_DAY_START_NOTIFICATION_ID,
  );

  savePriorityDayStartAlarm({
    enabled: true,
    notificationId: nid,
  });
  lastSyncedAlarmKey = syncKey;
  return true;
}

/**
 * 저장된「하루 시작」알림을 끄거나, `startHhmm`에 맞춰 매일 반복 알림을 다시 예약합니다.
 * 권한 거부 시 `enabled`는 저장소에서 false로 돌아갑니다.
 * 연속 호출은 큐로 직렬화해 마지막 요청 시각이 OS에 반영되게 합니다.
 */
export async function syncPriorityDayStartAlarm(input: {
  enabled: boolean;
  startHhmm: string;
}): Promise<boolean> {
  const run = syncQueue.then(
    () => performSync(input),
    () => performSync(input),
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
