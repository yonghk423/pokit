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

export type IncompleteRoutineReminderPersisted = {
  enabled: boolean;
  reminderHhmm: string;
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

/** 루틴 시작 시각 알림 — 카테고리별 on/off */
export type RoutineStartNotifyRuleRow = {
  enabled: boolean;
};

export type RoutineStartNotifyRules = Record<string, RoutineStartNotifyRuleRow>;

/** 루틴 시작 알림 OS 예약 — `${categoryKey}:${HH:mm}` */
export type RoutineStartNotifyScheduledRow = {
  slotKey: string;
  notificationId: string;
};

export type AppearanceMode = 'light' | 'dark';

/** 앱 글씨체 — ko/en/ja 공통 (한글·라틴 위주 디스플레이 폰트) */
export type AppFontId =
  | 'dongle'
  | 'gaegu'
  | 'songMyung'
  | 'gothicA1'
  | 'hiMelody'
  | 'hanken';

/** 글씨 크기 — 작게 / 기본 / 크게 */
export type AppFontSizeId = 'sm' | 'md' | 'lg';

/** 하루(시작~마무리) 구간이 지난 뒤 오늘 탭 담기 처리 */
export type PriorityDayRollMode = 'reset' | 'keep';

export type PriorityDayEndAlarmPersisted = {
  enabled: boolean;
  reminderHhmm: string;
  notificationId: string | null;
};

type SettingsStorageShape = {
  dayPlanScheduledNotifications?: DayPlanScheduledNotification[];
  priorityDayStartAlarm?: PriorityDayStartAlarmPersisted;
  priorityDayEndAlarm?: PriorityDayEndAlarmPersisted;
  incompleteRoutineReminder?: IncompleteRoutineReminderPersisted;
  categoryReminderRules?: CategoryReminderRules;
  categoryReminderScheduled?: CategoryReminderScheduledRow[];
  medicineReminderScheduled?: MedicineReminderScheduledRow[];
  waterReminderScheduled?: WaterReminderScheduledRow[];
  routineStartNotifyRules?: RoutineStartNotifyRules;
  routineStartNotifyScheduled?: RoutineStartNotifyScheduledRow[];
  appearanceMode?: AppearanceMode;
  /** 글씨체 · 글씨 크기 */
  appFontId?: AppFontId;
  appFontSizeId?: AppFontSizeId;
  priorityDayRollMode?: PriorityDayRollMode;
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
  enabled: false,
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

const DEFAULT_PRIORITY_DAY_END_ALARM: PriorityDayEndAlarmPersisted = {
  enabled: false,
  reminderHhmm: '22:00',
  notificationId: null,
};

export function loadPriorityDayEndAlarm(): PriorityDayEndAlarmPersisted {
  const root = readRoot();
  const v = root.priorityDayEndAlarm;
  if (!v || typeof v !== 'object') {
    return { ...DEFAULT_PRIORITY_DAY_END_ALARM };
  }
  const hhmm =
    typeof v.reminderHhmm === 'string' && v.reminderHhmm.trim().length > 0
      ? v.reminderHhmm.trim()
      : DEFAULT_PRIORITY_DAY_END_ALARM.reminderHhmm;
  return {
    enabled: Boolean(v.enabled),
    reminderHhmm: hhmm,
    notificationId: typeof v.notificationId === 'string' ? v.notificationId : null,
  };
}

export function savePriorityDayEndAlarm(next: PriorityDayEndAlarmPersisted): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    priorityDayEndAlarm: {
      enabled: next.enabled,
      reminderHhmm: next.reminderHhmm,
      notificationId: next.notificationId,
    },
  });
}

const DEFAULT_INCOMPLETE_ROUTINE_REMINDER: IncompleteRoutineReminderPersisted = {
  enabled: false,
  reminderHhmm: '22:00',
  notificationId: null,
};

export function loadIncompleteRoutineReminder(): IncompleteRoutineReminderPersisted {
  const root = readRoot();
  const v = root.incompleteRoutineReminder;
  if (!v || typeof v !== 'object') {
    return { ...DEFAULT_INCOMPLETE_ROUTINE_REMINDER };
  }
  const hhmm = typeof v.reminderHhmm === 'string' && v.reminderHhmm.trim().length > 0
    ? v.reminderHhmm.trim()
    : DEFAULT_INCOMPLETE_ROUTINE_REMINDER.reminderHhmm;
  return {
    enabled: Boolean(v.enabled),
    reminderHhmm: hhmm,
    notificationId: typeof v.notificationId === 'string' ? v.notificationId : null,
  };
}

export function saveIncompleteRoutineReminder(next: IncompleteRoutineReminderPersisted): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    incompleteRoutineReminder: {
      enabled: next.enabled,
      reminderHhmm: next.reminderHhmm,
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

export function loadRoutineStartNotifyRules(): RoutineStartNotifyRules {
  const root = readRoot();
  const raw = root.routineStartNotifyRules;
  if (!raw || typeof raw !== 'object') return {};
  const out: RoutineStartNotifyRules = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!k || !v || typeof v !== 'object') continue;
    const enabled = (v as RoutineStartNotifyRuleRow).enabled;
    if (typeof enabled !== 'boolean') continue;
    out[k] = { enabled };
  }
  return out;
}

export function saveRoutineStartNotifyRules(next: RoutineStartNotifyRules): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    routineStartNotifyRules: next,
  });
}

export function loadRoutineStartNotifyScheduled(): RoutineStartNotifyScheduledRow[] {
  const root = readRoot();
  const rows = root.routineStartNotifyScheduled;
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row): row is RoutineStartNotifyScheduledRow =>
      Boolean(
        row &&
        typeof row === 'object' &&
        typeof (row as RoutineStartNotifyScheduledRow).slotKey === 'string' &&
        typeof (row as RoutineStartNotifyScheduledRow).notificationId === 'string',
      ),
  );
}

export function saveRoutineStartNotifyScheduled(rows: RoutineStartNotifyScheduledRow[]): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    routineStartNotifyScheduled: rows,
  });
}

export function loadAppearanceMode(): AppearanceMode {
  const root = readRoot();
  return root.appearanceMode === 'dark' ? 'dark' : 'light';
}

export function saveAppearanceMode(mode: AppearanceMode): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    appearanceMode: mode,
  });
}

function parseAppFontId(value: unknown): AppFontId {
  if (
    value === 'dongle' ||
    value === 'gaegu' ||
    value === 'songMyung' ||
    value === 'gothicA1' ||
    value === 'hiMelody'
  ) {
    return value;
  }
  // 이전 후보 → 동글 시티팝으로 이전
  return 'dongle';
}

export function loadAppFontId(): AppFontId {
  const root = readRoot();
  return parseAppFontId(root.appFontId);
}

export function saveAppFontId(fontId: AppFontId): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    appFontId: parseAppFontId(fontId),
  });
}

function parseAppFontSizeId(value: unknown): AppFontSizeId {
  if (value === 'sm' || value === 'md' || value === 'lg') return value;
  return 'md';
}

export function loadAppFontSizeId(): AppFontSizeId {
  const root = readRoot();
  return parseAppFontSizeId(root.appFontSizeId);
}

export function saveAppFontSizeId(sizeId: AppFontSizeId): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    appFontSizeId: parseAppFontSizeId(sizeId),
  });
}

const DEFAULT_PRIORITY_DAY_ROLL_MODE: PriorityDayRollMode = 'reset';

export function loadPriorityDayRollMode(): PriorityDayRollMode {
  const root = readRoot();
  return root.priorityDayRollMode === 'keep' ? 'keep' : DEFAULT_PRIORITY_DAY_ROLL_MODE;
}

export function savePriorityDayRollMode(mode: PriorityDayRollMode): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    priorityDayRollMode: mode === 'keep' ? 'keep' : 'reset',
  });
}
