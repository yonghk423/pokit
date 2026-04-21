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

type SettingsStorageShape = {
  dayPlanScheduledNotifications?: DayPlanScheduledNotification[];
  priorityDayStartAlarm?: PriorityDayStartAlarmPersisted;
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
