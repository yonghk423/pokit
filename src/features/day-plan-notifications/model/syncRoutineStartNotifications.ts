import {
  categoryReminderLabelKo,
  collectRoutineStartNotifySlots,
  formatHhmmClockKo,
  listTodayPlanCategoryKeys,
  parseHHmmToMinutes,
  useDayPlanStore,
  useFixedFlowSetsStore,
  useRoutineStartTimesStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationsByEventType,
  ensureLocalNotificationPermission,
  scheduleDailyLocalNotification,
  scheduleWeeklyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadRoutineStartNotifyRules,
  loadRoutineStartNotifyScheduled,
  saveRoutineStartNotifyRules,
  saveRoutineStartNotifyScheduled,
  WEEKDAY_PRESET_DAILY,
} from '@shared/lib/storage';
import { t } from '@shared/lib/i18n';

const MAX_ROUTINE_START_NOTIFY_SLOTS = 40;
export const ROUTINE_START_EVENT_TYPE = 'routineStart';
const ROUTINE_START_NOTIFICATION_ID_PREFIX = 'pokit:routine-start:';
let routineStartSyncQueue: Promise<void> = Promise.resolve();

function buildRoutineStartNotificationId(slotKey: string): string {
  return `${ROUTINE_START_NOTIFICATION_ID_PREFIX}${slotKey}`;
}

function isDailyWeekdays(weekdays: readonly number[]): boolean {
  if (weekdays.length !== WEEKDAY_PRESET_DAILY.length) return false;
  const set = new Set(weekdays);
  return WEEKDAY_PRESET_DAILY.every((d) => set.has(d));
}

/**
 * 켜진 루틴 시작 알림을 취소 후 다시 예약합니다.
 * 권한이 없으면 예약만 비웁니다(규칙은 유지).
 * 알림 시각은 루틴/일정 시작 시각에서만 해석합니다.
 */
async function performRoutineStartNotificationSync(): Promise<void> {
  /** 권한을 먼저 확인한다. 취소→권한실패 순이면 잘 되던 예약이 통째로 지워질 수 있다. */
  await useLocalNotificationsStore.getState().refreshPermission();
  const granted = useLocalNotificationsStore.getState().permission === 'granted';

  const prev = loadRoutineStartNotifyScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  /** 과거 동시 실행에서 저장 목록 밖으로 유실된 고아 예약도 제거합니다. */
  await cancelScheduledNotificationsByEventType(ROUTINE_START_EVENT_TYPE);
  saveRoutineStartNotifyScheduled([]);

  if (!granted) return;

  const rules = loadRoutineStartNotifyRules();
  const enabledKeys = Object.entries(rules)
    .filter(([, row]) => row?.enabled)
    .map(([key]) => key);
  if (enabledKeys.length === 0) return;

  const fixed = useFixedFlowSetsStore.getState();
  const plan = useDayPlanStore.getState();
  /** draft/mealSchedule 없이 전역 시작 시각·오늘 블록·spine만 사용 */
  const storedStartTimes = useRoutineStartTimesStore.getState().byCategoryKey;

  const slots = collectRoutineStartNotifySlots({
    enabledCategoryKeys: enabledKeys,
    sets: fixed.sets,
    activeSetIds: fixed.activeSetIds,
    includeInactiveSets: true,
    planBlocks: plan.blocks,
    todayCategoryKeys: listTodayPlanCategoryKeys(),
    storedStartTimes,
  }).slice(0, MAX_ROUTINE_START_NOTIFY_SLOTS);

  const nextRows: { slotKey: string; notificationId: string }[] = [];
  const seenIds = new Set<string>();
  for (const slot of slots) {
    const total = parseHHmmToMinutes(slot.hhmm);
    if (total === null || total >= 24 * 60) continue;
    const hour = Math.floor(total / 60);
    const minute = total % 60;

    const label = categoryReminderLabelKo(slot.categoryKey);
    const clock = formatHhmmClockKo(slot.hhmm);
    const title = t('notify.routineStart.title');
    const body = t('notify.routineStart.body', { label, clock });
    const data = {
      eventType: ROUTINE_START_EVENT_TYPE,
      categoryKey: slot.categoryKey,
    };

    /** 매일 요일이면 WEEKLY×7 대신 DAILY 1건 — 하루 시작 알림과 같은 경로로 안정화 */
    if (isDailyWeekdays(slot.weekdays)) {
      const slotKey = slot.slotKey;
      const identifier = buildRoutineStartNotificationId(slotKey);
      if (seenIds.has(identifier)) continue;
      seenIds.add(identifier);
      const nid = await scheduleDailyLocalNotification({
        identifier,
        title,
        body,
        hour,
        minute,
        data,
      });
      if (nid) {
        nextRows.push({ slotKey, notificationId: nid });
      }
      continue;
    }

    for (const weekday of slot.weekdays) {
      const slotKey = `${slot.slotKey}@${weekday}`;
      const identifier = buildRoutineStartNotificationId(slotKey);
      if (seenIds.has(identifier)) continue;
      seenIds.add(identifier);
      const nid = await scheduleWeeklyLocalNotification({
        identifier,
        title,
        body,
        weekday,
        hour,
        minute,
        data,
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
