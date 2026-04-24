import {
  filterDayPlanFlowBlocks,
  formatHhmmClockKo,
  normalizeMedicineDetailConfig,
  parseHHmmToMinutes,
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
  loadMedicineReminderScheduled,
  saveMedicineReminderScheduled,
} from '@shared/lib/storage';

const MAX_MEDICINE_REMINDER_SLOTS = 32;

const MEDICINE_CATEGORY_LABEL = '약 복용';

type DosePart = 'morning' | 'lunch' | 'dinner';

type CollectedSlot = {
  slotKey: string;
  blockId: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

function doseLabelKo(part: DosePart): string {
  if (part === 'morning') return '아침';
  if (part === 'lunch') return '점심';
  return '저녁';
}

function collectFromBlocks(): CollectedSlot[] {
  const blocks = useDayPlanStore.getState().blocks;
  const out: CollectedSlot[] = [];

  for (const b of filterDayPlanFlowBlocks(blocks)) {
    if (b.category.trim() !== MEDICINE_CATEGORY_LABEL) continue;
    const raw = loadGoalDetailBlockConfig(b.id) ?? loadGoalDetailCategoryConfig('medicine');
    const cfg = normalizeMedicineDetailConfig(raw ?? {});

    const parts: Array<{
      part: DosePart;
      on: boolean;
      notify: boolean;
      hhmm: string;
    }> = [
      { part: 'morning', on: cfg.morningOn, notify: cfg.morningNotify, hhmm: cfg.morningTime },
      { part: 'lunch', on: cfg.lunchOn, notify: cfg.lunchNotify, hhmm: cfg.lunchTime },
      { part: 'dinner', on: cfg.dinnerOn, notify: cfg.dinnerNotify, hhmm: cfg.dinnerTime },
    ];

    for (const row of parts) {
      if (!row.on || !row.notify) continue;
      const m = parseHHmmToMinutes(row.hhmm.trim());
      if (m === null || m >= 24 * 60) continue;
      const hour = Math.floor(m / 60);
      const minute = m % 60;
      const doseName = (cfg.doseLabel ?? '').trim() || '약';
      const slotKey = `${b.id}:${row.part}`;
      const labelKo = doseLabelKo(row.part);
      out.push({
        slotKey,
        blockId: b.id,
        hour,
        minute,
        title: '복용 알림',
        body: `${doseName} · ${labelKo} 복용 ${formatHhmmClockKo(row.hhmm.trim())}이에요.`,
      });
    }
  }

  return out;
}

/**
 * 일정에 포함된 약 복용 블록의 목표 상세 설정을 읽어, 슬롯별 매일 로컬 알림을 다시 예약합니다.
 */
export async function syncMedicineReminderNotifications(): Promise<void> {
  const prev = loadMedicineReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  saveMedicineReminderScheduled([]);

  await useLocalNotificationsStore.getState().refreshPermission();
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return;
  }

  const slots = collectFromBlocks().slice(0, MAX_MEDICINE_REMINDER_SLOTS);
  const nextRows: { slotKey: string; notificationId: string }[] = [];

  for (const s of slots) {
    const nid = await scheduleDailyLocalNotification({
      title: s.title,
      body: s.body,
      hour: s.hour,
      minute: s.minute,
      data: { eventType: 'medicineDoseReminder', blockId: s.blockId },
    });
    if (nid) {
      nextRows.push({ slotKey: s.slotKey, notificationId: nid });
    }
  }

  saveMedicineReminderScheduled(nextRows);
}
