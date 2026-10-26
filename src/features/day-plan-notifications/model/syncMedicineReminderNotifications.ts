import {
  extractMedicineConfigFromRaw,
  filterDayPlanFlowBlocks,
  HEALTH_INTAKE_CATEGORY_KEY,
  HEALTH_INTAKE_LABEL_KO,
  HEALTH_INTAKE_LABEL_KO_LEGACY,
  isHealthIntakeRelatedCategoryKey,
  parseHHmmToMinutes,
  listTodayPlanCategoryKeys,
  resolveBlockCategoryKey,
  resolveCustomFlowTemplateKey,
  useDayPlanStore,
} from '@entities/day-plan';
import {
  cancelLocalNotificationsById,
  cancelScheduledNotificationsByEventType,
} from '@shared/lib/notifications';
import {
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  loadMedicineReminderScheduled,
  saveMedicineReminderScheduled,
} from '@shared/lib/storage';
import { t } from '@shared/lib/i18n';

const MEDICINE_CATEGORY_LABEL = '약 복용';
export const MEDICINE_DOSE_REMINDER_EVENT_TYPE = 'medicineDoseReminder';

/**
 * 부트스트랩·스토어 구독이 한 변경에 연달아 반응해도 취소가 겹치지 않게 합니다.
 */
let medicineReminderSyncQueue: Promise<void> = Promise.resolve();
let lastSyncedMedicineReminderKey = '';

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
    categoryLabel === HEALTH_INTAKE_LABEL_KO ||
    categoryLabel === HEALTH_INTAKE_LABEL_KO_LEGACY
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
    const categoryKey = resolveBlockCategoryKey(b) ?? '';
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

async function cancelAllMedicineReminderNotifications(): Promise<void> {
  const prev = loadMedicineReminderScheduled();
  if (prev.length > 0) {
    await cancelLocalNotificationsById(prev.map((r) => r.notificationId));
  }
  /** 과거 동시 실행에서 저장 목록 밖으로 유실된 고아 예약도 제거합니다. */
  await cancelScheduledNotificationsByEventType(MEDICINE_DOSE_REMINDER_EVENT_TYPE);
  saveMedicineReminderScheduled([]);
}

async function performMedicineReminderNotificationSync(
  _overlay?: MedicineReminderConfigOverlay,
): Promise<boolean> {
  // 복용·섭취 시각 푸시 알림은 현재 제품에서 쓰지 않음. 기존 예약만 정리한다.
  if (lastSyncedMedicineReminderKey !== 'disabled') {
    await cancelAllMedicineReminderNotifications();
    lastSyncedMedicineReminderKey = 'disabled';
  }
  return true;
}

/**
 * 복용·섭취 알림은 비활성. 호출 시 기존 예약을 취소한다.
 */
export function syncMedicineReminderNotifications(
  overlay?: MedicineReminderConfigOverlay,
): Promise<boolean> {
  const run = medicineReminderSyncQueue.then(
    () => performMedicineReminderNotificationSync(overlay),
    () => performMedicineReminderNotificationSync(overlay),
  );
  medicineReminderSyncQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
