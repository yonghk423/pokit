import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type PersistedDayPlan<TBlock = unknown> = {
  dateKey: string;
  blocks: TBlock[];
  completedBlockIds: string[];
  skippedBlockIds: string[];
  /** 잠금화면 Live Activity 체크리스트에서 `진행 중`으로 쓸 블록(선택). 구버전 저장본과 호환. */
  liveActivityChecklistFocusBlockId?: string | null;
  /** 당일 퀵메모(없으면 빈 배열). 이전 저장본과 호환 */
  quickMemos?: Array<{
    id: string;
    text: string;
    createdAt: number;
    isDone: boolean;
  }>;
};

export function loadDayPlan<TBlock = unknown>(): PersistedDayPlan<TBlock> | null {
  return localStorageClient.getJson<PersistedDayPlan<TBlock>>(StorageKeys.dayPlan);
}

export function saveDayPlan<TBlock = unknown>(data: PersistedDayPlan<TBlock>): void {
  localStorageClient.setJson(StorageKeys.dayPlan, data);
}
