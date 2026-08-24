import {
  countPendingRoutinesByLayout,
  parseHHmmToMinutes,
  totalPendingRoutinesByLayout,
  useDayPlanDraftStore,
  useDayPlanLayoutModeVisibilityStore,
  useDayPlanStore,
  type PendingRoutineCountsByLayout,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  ensureLocalNotificationPermission,
  getScheduledLocalNotifications,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadIncompleteRoutineReminder,
  saveIncompleteRoutineReminder,
} from '@shared/lib/storage';

import { buildIncompleteRoutineReminderNotificationContent } from '../lib/incompleteRoutineReminderCopy';

export const INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID = 'pokit:incomplete-routine-reminder';
export const INCOMPLETE_ROUTINE_REMINDER_EVENT_TYPE = 'incompleteRoutineReminder';
const INCOMPLETE_ROUTINE_WEEKLY_ID_PREFIX = 'pokit:incomplete-routine-weekly:';
const INCOMPLETE_ROUTINE_DATE_ID_PREFIX = 'pokit:incomplete-routine-date:';

let syncInFlight: Promise<boolean> | null = null;
let resyncRequestedWhileInFlight = false;
let lastSyncedKey = '';

/**
 * `daily2` — 매일 시·분 캘린더 트리거(하루 시작 알림과 동일 경로).
 * 예전 DATE(→ 초 단위 지연) / 7일 원샷 캘린더는 시각이 수~십수 분 밀릴 수 있음.
 */
const INCOMPLETE_REMINDER_SCHEDULER_VERSION = 'daily2';

function buildSyncKey(
  enabled: boolean,
  reminderHhmm: string,
  counts: PendingRoutineCountsByLayout,
): string {
  return [
    INCOMPLETE_REMINDER_SCHEDULER_VERSION,
    enabled ? '1' : '0',
    reminderHhmm.trim(),
    counts.bag,
    counts.sections,
    counts.spine,
  ].join(':');
}

function readPendingCounts(): PendingRoutineCountsByLayout {
  const { blocks, completedBlockIds, skippedBlockIds } = useDayPlanStore.getState();
  const {
    priorityCategoryOrder,
    prioritySectionsCategoryOrder,
    prioritySectionsMealSlots,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
    isFocusStarted,
    priorityStart,
    priorityEnd,
  } = useDayPlanDraftStore.getState();
  const { visibility } = useDayPlanLayoutModeVisibilityStore.getState();
  return countPendingRoutinesByLayout({
    visibility,
    priorityCategoryOrder,
    prioritySectionsCategoryOrder,
    prioritySectionsMealSlots,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
    isFocusStarted,
    priorityStart,
    priorityEnd,
    blocks,
    completedBlockIds,
    skippedBlockIds,
  });
}

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
 * 저장된 미완료 일정 알림 설정과 오늘 남은 루틴 수를 반영해
 * 매일 같은 시·분에 울리는 캘린더 알림을 다시 예약합니다.
 * 미완료 일정이 없으면 예약만 취소하고 설정은 유지합니다.
 */
export async function syncIncompleteRoutineReminderNotifications(): Promise<boolean> {
  if (syncInFlight) {
    resyncRequestedWhileInFlight = true;
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const config = loadIncompleteRoutineReminder();
      const pendingCounts = readPendingCounts();
      const pendingCount = totalPendingRoutinesByLayout(pendingCounts);
      const syncKey = buildSyncKey(config.enabled, config.reminderHhmm, pendingCounts);

      if (syncKey === lastSyncedKey) {
        return true;
      }

      await cancelAllIncompleteRoutineReminderNotifications(config.notificationId);

      if (!config.enabled) {
        saveIncompleteRoutineReminder({
          enabled: false,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
        lastSyncedKey = syncKey;
        return true;
      }

      await useLocalNotificationsStore.getState().refreshPermission();
      if (useLocalNotificationsStore.getState().permission !== 'granted') {
        saveIncompleteRoutineReminder({
          enabled: config.enabled,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
        lastSyncedKey = syncKey;
        return false;
      }

      if (pendingCount === 0) {
        saveIncompleteRoutineReminder({
          enabled: true,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
        lastSyncedKey = syncKey;
        return true;
      }

      const m = parseHHmmToMinutes(config.reminderHhmm);
      if (m === null || m >= 24 * 60) {
        saveIncompleteRoutineReminder({
          enabled: false,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
        lastSyncedKey = syncKey;
        return false;
      }

      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const { title, body } = buildIncompleteRoutineReminderNotificationContent(pendingCounts);

      let nid: string | null = null;
      try {
        nid = await scheduleDailyLocalNotification({
          identifier: INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID,
          title,
          body,
          hour,
          minute,
          data: { eventType: INCOMPLETE_ROUTINE_REMINDER_EVENT_TYPE },
        });
      } catch (error) {
        console.warn('[notifications] incomplete routine reminder daily schedule failed', error);
      }

      if (!nid) {
        saveIncompleteRoutineReminder({
          enabled: config.enabled,
          reminderHhmm: config.reminderHhmm,
          notificationId: null,
        });
        lastSyncedKey = syncKey;
        return false;
      }

      saveIncompleteRoutineReminder({
        enabled: true,
        reminderHhmm: config.reminderHhmm,
        notificationId: nid,
      });
      lastSyncedKey = syncKey;
      return true;
    } finally {
      syncInFlight = null;
      if (resyncRequestedWhileInFlight) {
        resyncRequestedWhileInFlight = false;
        void syncIncompleteRoutineReminderNotifications().catch((error) => {
          console.warn('[notifications] incomplete routine reminder resync failed', error);
        });
      }
    }
  })();

  return syncInFlight;
}

/** 설정 저장 후 미완료 일정 알림을 동기화합니다. 권한 거부 시 `enabled`를 끕니다. */
export async function saveIncompleteRoutineReminderSettings(input: {
  enabled: boolean;
  reminderHhmm: string;
}): Promise<boolean> {
  const hhmm = input.reminderHhmm.trim();
  const prev = loadIncompleteRoutineReminder();

  if (input.enabled) {
    const permitted = await ensureLocalNotificationPermission();
    await useLocalNotificationsStore.getState().refreshPermission();
    if (!permitted) {
      saveIncompleteRoutineReminder({
        enabled: false,
        reminderHhmm: hhmm || prev.reminderHhmm,
        notificationId: null,
      });
      lastSyncedKey = '';
      await syncIncompleteRoutineReminderNotifications();
      return false;
    }
  }

  saveIncompleteRoutineReminder({
    enabled: input.enabled,
    reminderHhmm: hhmm || prev.reminderHhmm,
    notificationId: input.enabled ? prev.notificationId : null,
  });
  lastSyncedKey = '';
  return syncIncompleteRoutineReminderNotifications();
}
