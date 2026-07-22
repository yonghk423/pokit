import {
  filterDayPlanFlowBlocks,
  formatHhmmClockKo,
  extractWaterConfigFromRaw,
  normalizeWaterDetailConfig,
  parseHHmmToMinutes,
  resolveBlockCategoryKey,
  useDayPlanStore,
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
const WATER_NOTIFICATION_ID_PREFIX = 'pokit:water-reminder:';

let syncInFlight: Promise<void> | null = null;
let lastSyncedWaterReminderKey = '';

type CollectedSlot = {
  slotKey: string;
  blockId: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

function buildWaterReminderSyncKey(
  opts: { routineStartHhmm: string; routineEndHhmm: string },
  slots: CollectedSlot[],
): string {
  const rangeKey = `${opts.routineStartHhmm.trim()}~${opts.routineEndHhmm.trim()}`;
  const slotKey = slots
    .map((s) => `${s.slotKey}:${s.blockId}:${s.hour}:${s.minute}:${s.title}:${s.body}`)
    .join('|');
  return `${rangeKey}::${slotKey}`;
}

function buildWaterReminderIdentifier(slotKey: string): string {
  return `${WATER_NOTIFICATION_ID_PREFIX}${slotKey}`;
}

function wallMinuteToHhmm(m: number): string {
  const x = Math.max(0, Math.min(24 * 60 - 1, Math.floor(m)));
  const h = Math.floor(x / 60);
  const min = x % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function collectSlots(): CollectedSlot[] {
  const blocks = useDayPlanStore.getState().blocks;
  const byClock = new Map<string, CollectedSlot>();

  for (const b of filterDayPlanFlowBlocks(blocks)) {
    const categoryKey = resolveBlockCategoryKey(b);
    const categoryLabel = b.category.trim();
    const isWaterBlock =
      categoryKey === 'water' ||
      categoryLabel === WATER_CATEGORY_LABEL ||
      categoryLabel === '수분';
    if (!isWaterBlock) continue;
    const raw =
      loadGoalDetailBlockConfig(b.id) ?? loadGoalDetailCategoryConfig('water');
    const cfg = extractWaterConfigFromRaw(raw ?? {});
    if (!cfg.smartNotification || cfg.reminderTimes.length === 0) continue;

    const firstLine = b.title?.trim().split('\n')[0]?.trim() ?? '';
    const label = firstLine.length > 0 ? firstLine : '수분';

    for (const hhmmRaw of cfg.reminderTimes) {
      const hhmm = hhmmRaw.trim();
      const wall = parseHHmmToMinutes(hhmm);
      if (wall === null || wall >= 24 * 60) continue;
      const clockKey = wallMinuteToHhmm(wall);
      if (byClock.has(clockKey)) continue;

      byClock.set(clockKey, {
        slotKey: `water:${clockKey}`,
        blockId: b.id,
        hour: Math.floor(wall / 60),
        minute: wall % 60,
        title: '수분 알림',
        body: `${label} · ${formatHhmmClockKo(hhmm)}입니다.`,
      });
    }
  }

  return [...byClock.values()].sort((a, b) => a.hour * 60 + a.minute - b.hour * 60 - b.minute);
}

/**
 * 일정의 수분 블록에 저장된 **사용자 지정 알림 시각**만 읽어 매일 알림을 다시 예약합니다.
 */
export async function syncWaterReminderNotifications(opts: {
  routineStartHhmm: string;
  routineEndHhmm: string;
}): Promise<void> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      await useLocalNotificationsStore.getState().refreshPermission();
      if (useLocalNotificationsStore.getState().permission !== 'granted') {
        const deniedSyncKey = `denied:${opts.routineStartHhmm.trim()}~${opts.routineEndHhmm.trim()}`;
        if (deniedSyncKey === lastSyncedWaterReminderKey) return;
        const prev = loadWaterReminderScheduled();
        if (prev.length > 0) {
          await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
        }
        saveWaterReminderScheduled([]);
        lastSyncedWaterReminderKey = deniedSyncKey;
        return;
      }

      const collected = collectSlots().slice(
        0,
        MAX_WATER_REMINDER_SLOTS,
      );
      const syncKey = `granted:${buildWaterReminderSyncKey(opts, collected)}`;
      if (syncKey === lastSyncedWaterReminderKey) return;

      const prev = loadWaterReminderScheduled();
      if (prev.length > 0) {
        await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
      }
      saveWaterReminderScheduled([]);

      const nextRows: { slotKey: string; notificationId: string }[] = [];

      for (const s of collected) {
        const nid = await scheduleDailyLocalNotification({
          identifier: buildWaterReminderIdentifier(s.slotKey),
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
      lastSyncedWaterReminderKey = syncKey;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}
