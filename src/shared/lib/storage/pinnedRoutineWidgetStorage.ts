import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PinnedRoutineWidgetPersisted = {
  categoryKey: string | null;
};

export function normalizePinnedRoutineWidget(raw: unknown): PinnedRoutineWidgetPersisted {
  if (!raw || typeof raw !== 'object') return { categoryKey: null };
  const key = (raw as { categoryKey?: unknown }).categoryKey;
  if (typeof key !== 'string') return { categoryKey: null };
  const trimmed = key.trim();
  return { categoryKey: trimmed.length > 0 ? trimmed : null };
}

export function loadPinnedRoutineCategoryKey(): string | null {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.pinnedRoutineWidget);
  return normalizePinnedRoutineWidget(raw).categoryKey;
}

export function savePinnedRoutineCategoryKey(categoryKey: string | null): void {
  const next: PinnedRoutineWidgetPersisted = {
    categoryKey:
      typeof categoryKey === 'string' && categoryKey.trim().length > 0 ? categoryKey.trim() : null,
  };
  localStorageClient.setJson(StorageKeys.pinnedRoutineWidget, next);
}
