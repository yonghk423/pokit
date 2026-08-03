import {
  categoryReminderLabelKo,
  collectRoutineStartNotifySlots,
  formatHhmmClockKo,
  parseHHmmToMinutes,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationsByEventType,
  ensureLocalNotificationPermission,
  scheduleWeeklyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadDayMealSlotSchedule,
  loadRoutineStartNotifyRules,
  loadRoutineStartNotifyScheduled,
  saveRoutineStartNotifyRules,
  saveRoutineStartNotifyScheduled,
} from '@shared/lib/storage';

const MAX_ROUTINE_START_NOTIFY_SLOTS = 40;
export const ROUTINE_START_EVENT_TYPE = 'routineStart';
const ROUTINE_START_NOTIFICATION_ID_PREFIX = 'pokit:routine-start:';
let routineStartSyncQueue: Promise<void> = Promise.resolve();

function buildRoutineStartNotificationId(slotKey: string): string {
  return `${ROUTINE_START_NOTIFICATION_ID_PREFIX}${slotKey}`;
}

/**
 * 켜진 루틴 시작 알림을 취소 후 다시 예약합니다.
 * 권한이 없으면 예약만 비웁니다(규칙은 유지).
 * 알림 시각은 루틴/일정 시작 시각에서만 해석합니다.
 */
async function performRoutineStartNotificationSync(): Promise<void> {
  const prev = loadRoutineStartNotifyScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  /** 과거 동시 실행에서 저장 목록 밖으로 유실된 고아 예약도 제거합니다. */
  await cancelScheduledNotificationsByEventType(ROUTINE_START_EVENT_TYPE);
  saveRoutineStartNotifyScheduled([]);

  await useLocalNotificationsStore.getState().refreshPermission();
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return;
  }

  const rules = loadRoutineStartNotifyRules();
  const enabledKeys = Object.entries(rules)
    .filter(([, row]) => row?.enabled)
    .map(([key]) => key);
  if (enabledKeys.length === 0) return;

  const fixed = useFixedFlowSetsStore.getState();
  const draft = useDayPlanDraftStore.getState();
  const plan = useDayPlanStore.getState();

  const slots = collectRoutineStartNotifySlots({
    enabledCategoryKeys: enabledKeys,
    sets: fixed.sets,
    activeSetIds: fixed.activeSetIds,
    includeInactiveSets: false,
    layoutMode: fixed.fixedRoutineApplyLayoutMode,
    mealSchedule: loadDayMealSlotSchedule(),
    planBlocks: plan.blocks,
    sectionsMealSlots: {
      ...draft.priorityMealSlotOverrides,
      ...draft.prioritySectionsMealSlots,
    },
  }).slice(0, MAX_ROUTINE_START_NOTIFY_SLOTS);

  const nextRows: { slotKey: string; notificationId: string }[] = [];
  for (const slot of slots) {
    const total = parseHHmmToMinutes(slot.hhmm);
    if (total === null || total >= 24 * 60) continue;
    const hour = Math.floor(total / 60);
    const minute = total % 60;

    const label = categoryReminderLabelKo(slot.categoryKey);
    const clock = formatHhmmClockKo(slot.hhmm);
    for (const weekday of slot.weekdays) {
      const slotKey = `${slot.slotKey}@${weekday}`;
      const nid = await scheduleWeeklyLocalNotification({
        identifier: buildRoutineStartNotificationId(slotKey),
        title: '루틴 시작',
        body: `${label} · ${clock}에 시작할 시간이에요.`,
        weekday,
        hour,
        minute,
        data: {
          eventType: ROUTINE_START_EVENT_TYPE,
          categoryKey: slot.categoryKey,
        },
      });
      if (nid) {
        nextRows.push({ slotKey, notificationId: nid });
      }
    }
  }

  saveRoutineStartNotifyScheduled(nextRows);
}

export function syncRoutineStartNotifications(): Promise<void> {
  const run = routineStartSyncQueue.then(
    performRoutineStartNotificationSync,
    performRoutineStartNotificationSync,
  );
  routineStartSyncQueue = run.catch(() => undefined);
  return run;
}

/**
 * 루틴 시작 알림 토글 저장 후 동기화.
 * 켤 때 권한 요청 — 거부되면 false를 반환하고 규칙은 끈 상태로 둡니다.
 */
export async function persistRoutineStartNotifyToggle(
  categoryKey: string,
  enabled: boolean,
): Promise<boolean> {
  const key = categoryKey.trim();
  if (!key) return false;

  const rules = loadRoutineStartNotifyRules();
  if (!enabled) {
    const next = { ...rules };
    delete next[key];
    saveRoutineStartNotifyRules(next);
    await syncRoutineStartNotifications();
    return true;
  }

  const permitted = await ensureLocalNotificationPermission();
  if (!permitted) {
    const next = { ...rules };
    delete next[key];
    saveRoutineStartNotifyRules(next);
    await syncRoutineStartNotifications();
    return false;
  }

  saveRoutineStartNotifyRules({
    ...rules,
    [key]: { enabled: true },
  });
  await syncRoutineStartNotifications();
  return true;
}

export function isRoutineStartNotifyEnabled(categoryKey: string): boolean {
  const row = loadRoutineStartNotifyRules()[categoryKey.trim()];
  return Boolean(row?.enabled);
}
