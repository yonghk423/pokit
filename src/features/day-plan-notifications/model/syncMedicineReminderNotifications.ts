import {
  extractMedicineConfigFromRaw,
  filterDayPlanFlowBlocks,
  HEALTH_INTAKE_CATEGORY_KEY,
  HEALTH_INTAKE_LABEL_KO,
  isHealthIntakeRelatedCategoryKey,
  parseHHmmToMinutes,
  listTodayPlanCategoryKeys,
  resolveBlockCategoryKey,
  resolveCustomFlowTemplateKey,
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
import { t } from '@shared/lib/i18n';

const MAX_MEDICINE_REMINDER_SLOTS = 32;

const MEDICINE_CATEGORY_LABEL = '약 복용';

type DosePart = 'morning' | 'lunch' | 'dinner';

export type MedicineReminderSlot = {
  slotKey: string;
  blockId: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
};

function doseLabelKo(part: DosePart): string {
  if (part === 'morning') return t('notify.meal.morning');
  if (part === 'lunch') return t('notify.meal.lunch');
  return t('notify.meal.dinner');
}

function resolveMedicineStorageKey(categoryKey: string): string {
  return isHealthIntakeRelatedCategoryKey(categoryKey) ? HEALTH_INTAKE_CATEGORY_KEY : categoryKey;
}

export function isMedicineReminderCategory(categoryKey: string, raw: unknown): boolean {
  const key = categoryKey.trim();
  if (!key) return false;
  if (isHealthIntakeRelatedCategoryKey(key) || key === 'medicine') return true;
  return resolveCustomFlowTemplateKey(raw) === 'healthIntake';
}

function slotsFromRaw(categoryKey: string, blockId: string, raw: unknown): MedicineReminderSlot[] {
  const cfg = extractMedicineConfigFromRaw(raw ?? {});
  const parts: Array<{ part: DosePart; on: boolean; notify: boolean; hhmm: string }> = [
    { part: 'morning', on: cfg.morningOn, notify: cfg.morningNotify, hhmm: cfg.morningTime },
    { part: 'lunch', on: cfg.lunchOn, notify: cfg.lunchNotify, hhmm: cfg.lunchTime },
    { part: 'dinner', on: cfg.dinnerOn, notify: cfg.dinnerNotify, hhmm: cfg.dinnerTime },
  ];

  const out: MedicineReminderSlot[] = [];
  for (const row of parts) {
    if (!row.on || !row.notify) continue;
    const m = parseHHmmToMinutes(row.hhmm.trim());
    if (m === null || m >= 24 * 60) continue;
    const labelKo = doseLabelKo(row.part);
    out.push({
      slotKey: `${categoryKey}:${row.part}`,
      blockId,
      hour: Math.floor(m / 60),
      minute: m % 60,
      title: t('notify.medicine.title'),
      body: t('notify.medicine.body', { meal: labelKo }),
    });
  }
  return out;
}

function isMedicineFlowBlock(categoryKey: string, categoryLabel: string): boolean {
  return (
    isHealthIntakeRelatedCategoryKey(categoryKey) ||
    categoryKey === 'medicine' ||
    categoryLabel === MEDICINE_CATEGORY_LABEL ||
    categoryLabel === HEALTH_INTAKE_LABEL_KO
  );
}

export type MedicineReminderConfigOverlay = {
  categoryKey: string;
  raw: unknown;
};

function resolveCategoryConfigRaw(
  categoryKey: string,
  overlay?: MedicineReminderConfigOverlay,
): unknown {
  const storageKey = resolveMedicineStorageKey(categoryKey);
  if (overlay) {
    const overlayKey = overlay.categoryKey.trim();
    if (
      overlayKey === categoryKey ||
      overlayKey === storageKey ||
      resolveMedicineStorageKey(overlayKey) === storageKey
    ) {
      return overlay.raw;
    }
  }
  return loadGoalDetailCategoryConfig(storageKey);
}

/** 오늘 담기·구간·적용 세트·일정 블록의 약 복용 슬롯 */
export function collectMedicineReminderSlots(
  overlay?: MedicineReminderConfigOverlay,
): MedicineReminderSlot[] {
  const bySlot = new Map<string, MedicineReminderSlot>();

  for (const categoryKey of listTodayPlanCategoryKeys()) {
    const storageKey = resolveMedicineStorageKey(categoryKey);
    const raw = resolveCategoryConfigRaw(categoryKey, overlay);
    if (!isMedicineReminderCategory(categoryKey, raw) && !isMedicineReminderCategory(storageKey, raw)) {
      continue;
    }
    for (const slot of slotsFromRaw(storageKey, storageKey, raw)) {
      bySlot.set(slot.slotKey, slot);
    }
  }

  for (const b of filterDayPlanFlowBlocks(useDayPlanStore.getState().blocks)) {
    const categoryKey = resolveBlockCategoryKey(b);
    const categoryLabel = b.category.trim();
    const raw =
      loadGoalDetailBlockConfig(b.id) ??
      loadGoalDetailCategoryConfig(
        isHealthIntakeRelatedCategoryKey(categoryKey)
          ? HEALTH_INTAKE_CATEGORY_KEY
          : categoryKey === 'medicine'
            ? 'medicine'
            : categoryKey,
      );
    const isMedicine =
      isMedicineFlowBlock(categoryKey, categoryLabel) || isMedicineReminderCategory(categoryKey, raw);
    if (!isMedicine) continue;
    const storageKey = resolveMedicineStorageKey(
      categoryKey || (categoryLabel === MEDICINE_CATEGORY_LABEL ? 'medicine' : HEALTH_INTAKE_CATEGORY_KEY),
    );
    for (const slot of slotsFromRaw(storageKey, b.id, raw ?? {})) {
      bySlot.set(slot.slotKey, slot);
    }
  }

  return [...bySlot.values()];
}

/**
 * 오늘 일정에 있는 건강 섭취·약 복용 설정을 읽어 슬롯별 매일 로컬 알림을 다시 예약합니다.
 * 예약할 슬롯이 있으면 시스템 알림 권한을 요청합니다.
 */
export async function syncMedicineReminderNotifications(
  overlay?: MedicineReminderConfigOverlay,
): Promise<boolean> {
  const slots = collectMedicineReminderSlots(overlay).slice(0, MAX_MEDICINE_REMINDER_SLOTS);
  if (slots.length > 0) {
    const permitted = await useLocalNotificationsStore.getState().ensurePermission();
    if (!permitted) {
      const prevDenied = loadMedicineReminderScheduled();
      if (prevDenied.length > 0) {
        await cancelLocalNotificationsById(prevDenied.map((r) => r.notificationId));
      }
      saveMedicineReminderScheduled([]);
      return false;
    }
  } else {
    await useLocalNotificationsStore.getState().refreshPermission();
  }

  const prev = loadMedicineReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  saveMedicineReminderScheduled([]);

  if (useLocalNotificationsStore.getState().permission !== 'granted' && slots.length === 0) {
    return true;
  }
  if (useLocalNotificationsStore.getState().permission !== 'granted') {
    return false;
  }
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
  return true;
}
