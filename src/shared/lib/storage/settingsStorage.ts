import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type DayPlanStartNotificationTiming = '5min' | 'atStart';

export type DayPlanNotificationSettings = {
  startEnabled: boolean;
  endEnabled: boolean;
  startTiming: DayPlanStartNotificationTiming;
};

export type DayPlanScheduledNotification = {
  notificationId: string;
  blockId: string;
  kind: 'start' | 'end';
};

type SettingsStorageShape = {
  dayPlanNotifications?: DayPlanNotificationSettings;
  dayPlanScheduledNotifications?: DayPlanScheduledNotification[];
};

const DEFAULT_DAY_PLAN_NOTIFICATION_SETTINGS: DayPlanNotificationSettings = {
  startEnabled: true,
  endEnabled: false,
  startTiming: 'atStart',
};

function readRoot(): SettingsStorageShape {
  const raw =
    localStorageClient.getJson<SettingsStorageShape>(StorageKeys.settings) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

export function getDefaultDayPlanNotificationSettings(): DayPlanNotificationSettings {
  return { ...DEFAULT_DAY_PLAN_NOTIFICATION_SETTINGS };
}

export function loadDayPlanNotificationSettings(): DayPlanNotificationSettings {
  const root = readRoot();
  const settings = root.dayPlanNotifications;
  if (!settings || typeof settings !== 'object') {
    return getDefaultDayPlanNotificationSettings();
  }

  const startTiming: DayPlanStartNotificationTiming =
    settings.startTiming === 'atStart' ? 'atStart' : '5min';

  return {
    startEnabled: Boolean(settings.startEnabled),
    endEnabled: Boolean(settings.endEnabled),
    startTiming,
  };
}

export function saveDayPlanNotificationSettings(
  settings: DayPlanNotificationSettings,
): void {
  const root = readRoot();
  localStorageClient.setJson<SettingsStorageShape>(StorageKeys.settings, {
    ...root,
    dayPlanNotifications: settings,
  });
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
