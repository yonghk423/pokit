import {
  categoryReminderLabelKo,
  findReminderScheduleItem,
  formatHhmmClockKo,
  isCustomFlowCategoryKey,
  normalizeReminderDetailConfig,
  parseHHmmToMinutes,
  resolveCategoryReminderNotifyWeekdays,
  resolveCustomFlowTemplateKey,
  resolvePriorityRoutineCategoryKey,
  resolveReminderItemTitle,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationsByEventType,
  scheduleWeeklyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadCategoryReminderRules,
  loadCategoryReminderScheduled,
  loadGoalDetailCategoryConfig,
  saveCategoryReminderScheduled,
} from '@shared/lib/storage';

/** 요일별 주간 예약까지 포함 (카테고리×시각×요일) */
const MAX_CATEGORY_REMINDER_SLOTS = 120;
export const CATEGORY_REMINDER_EVENT_TYPE = 'categoryReminder';
const CATEGORY_REMINDER_NOTIFICATION_ID_PREFIX = 'pokit:category-reminder:';

/**
 * 여러 스토어 구독이 한 변경에 연달아 반응해도 취소·재예약이 겹치지 않게 합니다.
 * 직렬화하지 않으면 각 실행이 같은 이전 ID를 읽고 새 알림을 중복 예약할 수 있습니다.
 */
let categoryReminderSyncQueue: Promise<void> = Promise.resolve();

function buildCategoryReminderNotificationId(slotKey: string): string {
  return `${CATEGORY_REMINDER_NOTIFICATION_ID_PREFIX}${slotKey}`;
}

function resolveCategoryReminderNotificationBody(categoryKey: string, hhmm: string): string {
  const label = categoryReminderLabelKo(categoryKey);
  const clock = formatHhmmClockKo(hhmm.trim());
  if (isCustomFlowCategoryKey(categoryKey)) {
    const raw = loadGoalDetailCategoryConfig(categoryKey);
    if (resolveCustomFlowTemplateKey(raw) === 'reminder') {
      const cfg = normalizeReminderDetailConfig(raw);
      const item = findReminderScheduleItem(cfg.reminderItems, hhmm.trim());
      if (item) {
        const title = resolveReminderItemTitle(item);
        return `${label} · ${title} (${clock})`;
      }
    }
  }
  return `${label} · ${clock}입니다.`;
}

function collectTodayPlanCategoryKeys(): string[] {
  const draft = useDayPlanDraftStore.getState();
  const plan = useDayPlanStore.getState();
  const keys = new Set<string>();
  for (const key of draft.priorityCategoryOrder) {
    const k = resolvePriorityRoutineCategoryKey(key);
    if (k) keys.add(k);
  }
  for (const key of draft.prioritySectionsCategoryOrder) {
    const k = resolvePriorityRoutineCategoryKey(key);
    if (k) keys.add(k);
  }
  for (const block of plan.blocks) {
    const k = typeof block.categoryKey === 'string' ? block.categoryKey.trim() : '';
    if (k) keys.add(k);
  }
  return [...keys];
}

type Slot = {
  slotKey: string;
  categoryKey: string;
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/**
 * 저장된 카테고리 알림 규칙을 읽어 로컬 알림을 다시 예약합니다.
 * 적용 중인 그룹(또는 오늘 일정에 담긴 항목)만 대상으로 하며, 권한이 없으면 기존 예약만 취소합니다.
 */
async function performCategoryReminderNotificationSync(): Promise<void> {
  const prev = loadCategoryReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  /** 과거 경쟁 상태로 저장 목록에서 유실된 고아 예약까지 함께 정리합니다. */
  await cancelScheduledNotificationsByEventType(CATEGORY_REMINDER_EVENT_TYPE);
  saveCategoryReminderScheduled([]);

  await useLocalNotificationsStore.getState().refreshPermission();
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return;
  }

  const rules = loadCategoryReminderRules();
  const enabledKeys = Object.entries(rules)
    .filter(([, row]) => row?.enabled && Array.isArray(row.times) && row.times.length > 0)
    .map(([key]) => key);
  if (enabledKeys.length === 0) return;

  const fixed = useFixedFlowSetsStore.getState();
  const weekdaysByKey = resolveCategoryReminderNotifyWeekdays({
    categoryKeys: enabledKeys,
    sets: fixed.sets,
    activeSetIds: fixed.activeSetIds,
    todayPlanCategoryKeys: collectTodayPlanCategoryKeys(),
  });
  if (weekdaysByKey.size === 0) return;

  const slots: Slot[] = [];

  for (const [categoryKey, row] of Object.entries(rules)) {
    if (!row?.enabled || !Array.isArray(row.times)) continue;
    const weekdays = weekdaysByKey.get(categoryKey);
    if (!weekdays || weekdays.length === 0) continue;

    const seen = new Set<string>();
    for (const hhmm of row.times) {
      if (typeof hhmm !== 'string') continue;
      const m = parseHHmmToMinutes(hhmm.trim());
      if (m === null || m >= 24 * 60) continue;
      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const timeKey = hhmm.trim();
      const body = resolveCategoryReminderNotificationBody(categoryKey, timeKey);
      for (const weekday of weekdays) {
        const slotKey = `${categoryKey}:${timeKey}@${weekday}`;
        if (seen.has(slotKey)) continue;
        seen.add(slotKey);
        slots.push({
          slotKey,
          categoryKey,
          weekday,
          hour,
          minute,
          title: '루틴 알림',
          body,
        });
      }
    }
  }

  const capped = slots.slice(0, MAX_CATEGORY_REMINDER_SLOTS);
  const nextRows: { slotKey: string; notificationId: string }[] = [];

  for (const s of capped) {
    const nid = await scheduleWeeklyLocalNotification({
      identifier: buildCategoryReminderNotificationId(s.slotKey),
      title: s.title,
      body: s.body,
      weekday: s.weekday,
      hour: s.hour,
      minute: s.minute,
      data: { eventType: CATEGORY_REMINDER_EVENT_TYPE, categoryKey: s.categoryKey },
    });
    if (nid) {
      nextRows.push({ slotKey: s.slotKey, notificationId: nid });
    }
  }

  saveCategoryReminderScheduled(nextRows);
}

export function syncCategoryReminderNotifications(): Promise<void> {
  const run = categoryReminderSyncQueue.then(
    performCategoryReminderNotificationSync,
    performCategoryReminderNotificationSync,
  );
  categoryReminderSyncQueue = run.catch(() => undefined);
  return run;
}
