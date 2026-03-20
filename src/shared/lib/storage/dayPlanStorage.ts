import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlan<TBlock = unknown> = {
  dateKey: string;
  blocks: TBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
};

export function loadDayPlan<TBlock = unknown>(): PersistedDayPlan<TBlock> | null {
  return localStorageClient.getJson<PersistedDayPlan<TBlock>>(StorageKeys.dayPlan);
}

export function saveDayPlan<TBlock = unknown>(data: PersistedDayPlan<TBlock>): void {
  localStorageClient.setJson(StorageKeys.dayPlan, data);
}
