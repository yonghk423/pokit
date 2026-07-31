import { flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedGuideBook = {
  seen: boolean;
};

export function loadGuideBookSeen(): boolean {
  const v = localStorageClient.getJson<PersistedGuideBook>(StorageKeys.guideBook);
  return v?.seen === true;
}

export function markGuideBookSeen(): void {
  localStorageClient.setJson<PersistedGuideBook>(StorageKeys.guideBook, { seen: true });
}

export async function markGuideBookSeenAndFlush(): Promise<void> {
  markGuideBookSeen();
  await flushLocalStorageClientWrites();
}
