import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type GoalDetailSettingsStorageShape = {
  byCategory?: Record<string, unknown>;
};

function readRoot(): GoalDetailSettingsStorageShape {
  const raw =
    localStorageClient.getJson<GoalDetailSettingsStorageShape>(
      StorageKeys.goalDetailSettings,
    ) ?? {};
  return raw && typeof raw === 'object' ? raw : {};
}

export function loadGoalDetailCategoryConfig(categoryKey: string): unknown | null {
  if (!categoryKey) return null;
  const root = readRoot();
  const byCategory = root.byCategory ?? {};
  return Object.prototype.hasOwnProperty.call(byCategory, categoryKey)
    ? byCategory[categoryKey]
    : null;
}

export function saveGoalDetailCategoryConfig(
  categoryKey: string,
  config: unknown,
): void {
  if (!categoryKey) return;
  const root = readRoot();
  const byCategory = { ...(root.byCategory ?? {}) };
  byCategory[categoryKey] = config;
  localStorageClient.setJson(StorageKeys.goalDetailSettings, { byCategory });
}
