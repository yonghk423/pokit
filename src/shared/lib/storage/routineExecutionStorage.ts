import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export function loadRoutineExecutions<T>(): T[] {
  const data = localStorageClient.getJson<T[]>(StorageKeys.routineExecutions);
  return Array.isArray(data) ? data : [];
}

export function saveRoutineExecutions<T>(executions: T[]): void {
  localStorageClient.setJson(StorageKeys.routineExecutions, executions);
}

