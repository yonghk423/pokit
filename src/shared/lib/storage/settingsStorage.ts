import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanScheduledNotification = {
  notificationId: string;
  blockId: string;
  kind: 'start' | 'end';
};

export type PriorityDayStartAlarmPersisted = {
  enabled: boolean;
  notificationId: string | null;
};

/** 카테고리별 매일 반복 알림 — 시각은 `HH:mm`(24h), 24:00 미지원 */
export type CategoryReminderRuleRow = {
  enabled: boolean;
  times: string[];
};

export type CategoryReminderRules = Record<string, CategoryReminderRuleRow>;

export type CategoryReminderScheduledRow = {
  /** `${categoryKey}:${normalizedHhmm}` */
  slotKey: string;
  notificationId: string;
};

/** 약 복용 슬롯별 매일 알림 예약 — `${blockId}:morning|lunch|dinner` */
export type MedicineReminderScheduledRow = {
  slotKey: string;
  notificationId: string;
};

/** 수분 주기 알림(매일) — `water:HH:mm` 등 */
export type WaterReminderScheduledRow = {
  slotKey: string;
  notificationId: string;
};

type SettingsStorageShape = {
  dayPlanScheduledNotifications?: DayPlanScheduledNotification[];
  priorityDayStartAlarm?: PriorityDayStartAlarmPersisted;
  categoryReminderRules?: CategoryReminderRules;
  categoryReminderScheduled?: CategoryReminderScheduledRow[];
  medicineReminderScheduled?: MedicineReminderScheduledRow[];
  waterReminderScheduled?: WaterReminderScheduledRow[];
};

function readRoot(): SettingsStorageShape {
  const raw =
    localStorageClient.getJson<SettingsStorageShape>(StorageKeys.settings) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

export function loadDayPlanScheduledNotifications(): DayPlanScheduledNotification[] {
  const root = readRoot();
  const rows = root.dayPlanScheduledNotifications;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is DayPlanScheduledNotification =>
      Boolean(
        row &&
        typeof row === 'object' &&
        typeof row.notificationId === 'string' &&
        typeof row.blockId === 'string' &&
        (row.kind === 'start' || row.kind === 'end'),
      ),
  );
}

export function saveDayPlanScheduledNotifications(
  rows: DayPlanScheduledNotification[],
): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    dayPlanScheduledNotifications: rows,
  });
}

const DEFAULT_PRIORITY_DAY_START_ALARM: PriorityDayStartAlarmPersisted = {
  enabled: true,
  notificationId: null,
};

export function loadPriorityDayStartAlarm(): PriorityDayStartAlarmPersisted {
  const root = readRoot();
  const v = root.priorityDayStartAlarm;
  if (!v || typeof v !== 'object') {
    return { ...DEFAULT_PRIORITY_DAY_START_ALARM };
  }
  return {
    enabled: Boolean(v.enabled),
    notificationId: typeof v.notificationId === 'string' ? v.notificationId : null,
  };
}

export function savePriorityDayStartAlarm(next: PriorityDayStartAlarmPersisted): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    priorityDayStartAlarm: {
      enabled: next.enabled,
      notificationId: next.notificationId,
    },
  });
}

function isCategoryReminderRuleRow(v: unknown): v is CategoryReminderRuleRow {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  if (typeof o.enabled !== 'boolean') return false;
  if (!Array.isArray(o.times)) return false;
  return o.times.every((t) => typeof t === 'string');
}

export function loadCategoryReminderRules(): CategoryReminderRules {
  const root = readRoot();
  const raw = root.categoryReminderRules;
  if (!raw || typeof raw !== 'object') return {};
  const out: CategoryReminderRules = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || !isCategoryReminderRuleRow(v)) continue;
    out[k] = { enabled: v.enabled, times: [...v.times] };
  }
  return out;
}

export function saveCategoryReminderRules(next: CategoryReminderRules): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    categoryReminderRules: next,
  });
}

export function loadCategoryReminderScheduled(): CategoryReminderScheduledRow[] {
  const root = readRoot();
  const rows = root.categoryReminderScheduled;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is CategoryReminderScheduledRow =>
      Boolean(
        row &&
        typeof row === 'object' &&
        typeof (row as CategoryReminderScheduledRow).slotKey === 'string' &&
        typeof (row as CategoryReminderScheduledRow).notificationId === 'string',
      ),
  );
}

export function saveCategoryReminderScheduled(rows: CategoryReminderScheduledRow[]): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    categoryReminderScheduled: rows,
  });
}

export function loadMedicineReminderScheduled(): MedicineReminderScheduledRow[] {
  const root = readRoot();
  const rows = root.medicineReminderScheduled;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is MedicineReminderScheduledRow =>
      Boolean(
        row &&
        typeof row === 'object' &&
        typeof (row as MedicineReminderScheduledRow).slotKey === 'string' &&
        typeof (row as MedicineReminderScheduledRow).notificationId === 'string',
      ),
  );
}

export function saveMedicineReminderScheduled(rows: MedicineReminderScheduledRow[]): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    medicineReminderScheduled: rows,
  });
}

export function loadWaterReminderScheduled(): WaterReminderScheduledRow[] {
  const root = readRoot();
  const rows = root.waterReminderScheduled;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is WaterReminderScheduledRow =>
      Boolean(
        row &&
        typeof row === 'object' &&
        typeof (row as WaterReminderScheduledRow).slotKey === 'string' &&
        typeof (row as WaterReminderScheduledRow).notificationId === 'string',
      ),
  );
}

export function saveWaterReminderScheduled(rows: WaterReminderScheduledRow[]): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    waterReminderScheduled: rows,
  });
}
