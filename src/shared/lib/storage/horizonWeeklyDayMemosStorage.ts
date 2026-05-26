import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type HorizonWeeklyDayMemosPersisted = Record<string, string>;

function loadAll(): HorizonWeeklyDayMemosPersisted {
  const raw = localStorageClient.getJson<HorizonWeeklyDayMemosPersisted>(
    StorageKeys.horizonWeeklyDayMemos,
  );
  if (!raw || typeof raw !== 'object') return {};
  const out: HorizonWeeklyDayMemosPersisted = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!DATE_KEY_RE.test(key) || typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) out[key] = trimmed;
  }
  return out;
}

function saveAll(data: HorizonWeeklyDayMemosPersisted): void {
  localStorageClient.setJson(StorageKeys.horizonWeeklyDayMemos, data);
}

export function loadHorizonWeeklyDayMemo(dateKey: string): string {
  if (!DATE_KEY_RE.test(dateKey)) return '';
  return loadAll()[dateKey] ?? '';
}

export function saveHorizonWeeklyDayMemo(dateKey: string, text: string): void {
  if (!DATE_KEY_RE.test(dateKey)) return;
  const all = loadAll();
  const trimmed = text.trim();
  if (!trimmed) {
    const { [dateKey]: _removed, ...rest } = all;
    saveAll(rest);
    return;
  }
  saveAll({ ...all, [dateKey]: trimmed });
}

export function horizonWeeklyDayMemoHasContent(dateKey: string): boolean {
  return loadHorizonWeeklyDayMemo(dateKey).length > 0;
}
