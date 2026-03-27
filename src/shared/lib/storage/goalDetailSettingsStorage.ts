import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type GoalDetailSettingsStorageShape = {
  byCategory?: Record<string, unknown>;
  byBlockId?: Record<string, unknown>;
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
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    byCategory,
    byBlockId: root.byBlockId ?? {},
  });
}

export function loadGoalDetailBlockConfig(blockId: string): unknown | null {
  if (!blockId) return null;
  const root = readRoot();
  const byBlockId = root.byBlockId ?? {};
  return Object.prototype.hasOwnProperty.call(byBlockId, blockId)
    ? byBlockId[blockId]
    : null;
}

export function saveGoalDetailBlockConfig(blockId: string, config: unknown): void {
  if (!blockId) return;
  const root = readRoot();
  const byBlockId = { ...(root.byBlockId ?? {}) };
  byBlockId[blockId] = config;
  localStorageClient.setJson(StorageKeys.goalDetailSettings, {
    byCategory: root.byCategory ?? {},
    byBlockId,
  });
}
