import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export function loadRoutines<T>(): T[] {
  const data = localStorageClient.getJson<T[]>(StorageKeys.routines);
  return Array.isArray(data) ? data : [];
}

export function saveRoutines<T>(routines: T[]): void {
  localStorageClient.setJson(StorageKeys.routines, routines);
}

