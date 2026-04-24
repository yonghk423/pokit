import {
  buildWaterRoutineReminderSlots,
  filterDayPlanFlowBlocks,
  formatHhmmClockKo,
  normalizeWaterDetailConfig,
  useDayPlanStore,
  waterReminderIntervalMinutes,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import {
  cancelLocalNotificationsById,
  scheduleDailyLocalNotification,
} from '@shared/lib/notifications';
import {
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  loadWaterReminderScheduled,
  saveWaterReminderScheduled,
} from '@shared/lib/storage';

const MAX_WATER_REMINDER_SLOTS = 48;

const WATER_CATEGORY_LABEL = '수분섭취';

type CollectedSlot = {
  slotKey: string;
  blockId: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

function wallMinuteToHhmm(m: number): string {
  const x = Math.max(0, Math.min(24 * 60 - 1, Math.floor(m)));
  const h = Math.floor(x / 60);
  const min = x % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function collectSlots(
  routineStartHhmm: string,
  routineEndHhmm: string,
): CollectedSlot[] {
  const blocks = useDayPlanStore.getState().blocks;
  const byClock = new Map<string, CollectedSlot>();

  for (const b of filterDayPlanFlowBlocks(blocks)) {
    if (b.category.trim() !== WATER_CATEGORY_LABEL) continue;
    const raw = loadGoalDetailBlockConfig(b.id) ?? loadGoalDetailCategoryConfig('water');
    const cfg = normalizeWaterDetailConfig(raw ?? {});
    if (!cfg.smartNotification) continue;

    const interval = waterReminderIntervalMinutes(cfg);
    const slots = buildWaterRoutineReminderSlots({
      routineStartHhmm,
      routineEndHhmm,
      intervalMinutes: interval,
    });

    const firstLine = b.title?.trim().split('\n')[0]?.trim() ?? '';
    const label = firstLine.length > 0 ? firstLine : '수분';

    for (const s of slots) {
      const hhmm = wallMinuteToHhmm(s.wallMinuteOfDay);
      const clockKey = hhmm;
      if (byClock.has(clockKey)) continue;

      const hour = Math.floor(s.wallMinuteOfDay / 60);
      const minute = s.wallMinuteOfDay % 60;
      const slotKey = `water:${clockKey}`;
      byClock.set(clockKey, {
        slotKey,
        blockId: b.id,
        hour,
        minute,
        title: '수분 알림',
        body: `${label} · ${formatHhmmClockKo(hhmm)}에 알림이 울려요.`,
      });
    }
  }

  return [...byClock.values()].sort((a, b) => a.hour * 60 + a.minute - b.hour * 60 - b.minute);
}

/**
 * 담기 구간과 일정의 수분 블록 설정을 읽어, 수분 주기 알림(매일 동일 시각)을 다시 예약합니다.
 */
export async function syncWaterReminderNotifications(opts: {
  routineStartHhmm: string;
  routineEndHhmm: string;
}): Promise<void> {
  const prev = loadWaterReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  saveWaterReminderScheduled([]);

  await useLocalNotificationsStore.getState().refreshPermission();
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return;
  }

  const collected = collectSlots(opts.routineStartHhmm, opts.routineEndHhmm).slice(
    0,
    MAX_WATER_REMINDER_SLOTS,
  );
  const nextRows: { slotKey: string; notificationId: string }[] = [];

  for (const s of collected) {
    const nid = await scheduleDailyLocalNotification({
      title: s.title,
      body: s.body,
      hour: s.hour,
      minute: s.minute,
      data: { eventType: 'waterIntervalReminder', blockId: s.blockId },
    });
    if (nid) {
      nextRows.push({ slotKey: s.slotKey, notificationId: nid });
    }
  }

  saveWaterReminderScheduled(nextRows);
}
