import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type AppReviewPromptRow = {
  firstOpenedAt: string;
  requestedAt?: string;
};

type PersistedAppReviewPrompt = {
  v: 1;
  firstOpenedAt: string;
  requestedAt?: string;
};

function isIsoTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function loadAppReviewPrompt(): AppReviewPromptRow | null {
  const raw = localStorageClient.getJson<PersistedAppReviewPrompt>(StorageKeys.appReviewPrompt);
  if (!raw || raw.v !== 1 || !isIsoTime(raw.firstOpenedAt)) return null;
  const row: AppReviewPromptRow = { firstOpenedAt: raw.firstOpenedAt };
  if (isIsoTime(raw.requestedAt)) row.requestedAt = raw.requestedAt;
  return row;
}

export function saveAppReviewPrompt(row: AppReviewPromptRow): void {
  const payload: PersistedAppReviewPrompt = {
    v: 1,
    firstOpenedAt: row.firstOpenedAt,
    ...(row.requestedAt ? { requestedAt: row.requestedAt } : {}),
  };
  localStorageClient.setJson(StorageKeys.appReviewPrompt, payload);
}
