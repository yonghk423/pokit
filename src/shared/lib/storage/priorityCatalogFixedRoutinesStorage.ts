import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedShape = {
  /** `PICKER_CATEGORIES`의 `key` 값만, 중복 없이 순서 유지 */
  categoryKeys?: string[];
};

export function loadPriorityCatalogFixedRoutineKeys(): string[] {
  const raw = localStorageClient.getJson<PersistedShape>(StorageKeys.priorityCatalogFixedRoutines);
  if (!raw || typeof raw !== 'object') return [];
  const keys = raw.categoryKeys;
  return Array.isArray(keys) ? keys.filter((k): k is string => typeof k === 'string' && k.trim().length > 0) : [];
}

export function savePriorityCatalogFixedRoutineKeys(categoryKeys: string[]): void {
  localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, {
    categoryKeys: [...categoryKeys],
  });
}
