import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type Persisted = { skipConfirm: boolean };

export function loadPriorityBagRemoveConfirmSkip(): boolean {
  const v = localStorageClient.getJson<Persisted>(StorageKeys.priorityBagRemoveConfirmSkip);
  return Boolean(v?.skipConfirm);
}

export function savePriorityBagRemoveConfirmSkip(skipConfirm: boolean): void {
  localStorageClient.setJson(StorageKeys.priorityBagRemoveConfirmSkip, { skipConfirm });
}
