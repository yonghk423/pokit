import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export function loadLastSeenAppVersion(): string | null {
  const raw = localStorageClient.getItemRaw(StorageKeys.lastSeenAppVersion);
  if (!raw || !raw.trim()) return null;
  return raw.trim();
}

export function saveLastSeenAppVersion(version: string): void {
  localStorageClient.setItemRaw(StorageKeys.lastSeenAppVersion, version.trim());
}
