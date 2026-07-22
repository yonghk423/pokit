import {
  categoryReminderLabelKo,
  findReminderScheduleItem,
  formatHhmmClockKo,
  isCustomFlowCategoryKey,
  normalizeReminderDetailConfig,
  parseHHmmToMinutes,
  resolveCustomFlowTemplateKey,
  resolveReminderItemTitle,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadCategoryReminderRules,
  loadCategoryReminderScheduled,
  loadGoalDetailCategoryConfig,
  saveCategoryReminderScheduled,
} from '@shared/lib/storage';

const MAX_CATEGORY_REMINDER_SLOTS = 40;

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

type Slot = {
  slotKey: string;
  categoryKey: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

/**
 * 저장된 카테고리 알림 규칙을 읽어 매일 로컬 알림을 다시 예약합니다.
 * 권한이 없으면 기존 예약만 취소하고 저장소의 예약 ID 목록을 비웁니다.
 */
export async function syncCategoryReminderNotifications(): Promise<void> {
  const prev = loadCategoryReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  saveCategoryReminderScheduled([]);

  await useLocalNotificationsStore.getState().refreshPermission();
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return;
  }

  const rules = loadCategoryReminderRules();
  const slots: Slot[] = [];

  for (const [categoryKey, row] of Object.entries(rules)) {
    if (!row?.enabled || !Array.isArray(row.times)) continue;
    const seen = new Set<string>();
    for (const hhmm of row.times) {
      if (typeof hhmm !== 'string') continue;
      const m = parseHHmmToMinutes(hhmm.trim());
      if (m === null || m >= 24 * 60) continue;
      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const slotKey = `${categoryKey}:${hhmm.trim()}`;
      if (seen.has(slotKey)) continue;
      seen.add(slotKey);
      slots.push({
        slotKey,
        categoryKey,
        hour,
        minute,
        title: '루틴 알림',
        body: resolveCategoryReminderNotificationBody(categoryKey, hhmm.trim()),
      });
    }
  }

  const capped = slots.slice(0, MAX_CATEGORY_REMINDER_SLOTS);
  const nextRows: { slotKey: string; notificationId: string }[] = [];

  for (const s of capped) {
    const nid = await scheduleDailyLocalNotification({
      title: s.title,
      body: s.body,
      hour: s.hour,
      minute: s.minute,
      data: { eventType: 'categoryReminder', categoryKey: s.categoryKey },
    });
    if (nid) {
      nextRows.push({ slotKey: s.slotKey, notificationId: nid });
    }
  }

  saveCategoryReminderScheduled(nextRows);
}
