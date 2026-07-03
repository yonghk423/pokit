import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export function loadDismissedUpdateAvailableVersion(): string | null {
  const raw = localStorageClient.getItemRaw(StorageKeys.updateAvailableDismissedVersion);
  if (!raw || !raw.trim()) return null;
  return raw.trim();
}

export function saveDismissedUpdateAvailableVersion(version: string): void {
  localStorageClient.setItemRaw(StorageKeys.updateAvailableDismissedVersion, version.trim());
}
