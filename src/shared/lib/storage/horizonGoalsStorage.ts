import {
  horizonDocumentToPlainText,
  type HorizonGoalDocument,
  parseHorizonGoalDocument,
} from './horizonGoalBlocks';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

export type {
  HorizonBlockType,
  HorizonGoalBlock,
  HorizonGoalDocument,
} from './horizonGoalBlocks';
export {
  createHorizonBlock,
  createHorizonBlockId,
  EMPTY_HORIZON_DOCUMENT,
  estimateHorizonDocumentProgress,
  HORIZON_BLOCK_TYPE_LABELS,
  horizonDocumentHasContent,
  horizonDocumentToPlainText,
  parseHorizonGoalDocument,
} from './horizonGoalBlocks';

type HorizonGoalsPersisted = {
  weekly: Record<string, unknown>;
  monthly: Record<string, unknown>;
};

const EMPTY: HorizonGoalsPersisted = { weekly: {}, monthly: {} };

function loadAll(): HorizonGoalsPersisted {
  const raw = localStorageClient.getJson<HorizonGoalsPersisted>(StorageKeys.horizonGoals);
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    weekly: raw.weekly && typeof raw.weekly === 'object' ? raw.weekly : {},
    monthly: raw.monthly && typeof raw.monthly === 'object' ? raw.monthly : {},
  };
}

function saveAll(data: HorizonGoalsPersisted): void {
  localStorageClient.setJson(StorageKeys.horizonGoals, data);
}

export function loadWeeklyGoalDocument(weekStartKey: string): HorizonGoalDocument {
  return parseHorizonGoalDocument(loadAll().weekly[weekStartKey]);
}

export function saveWeeklyGoalDocument(weekStartKey: string, doc: HorizonGoalDocument): void {
  const all = loadAll();
  saveAll({ ...all, weekly: { ...all.weekly, [weekStartKey]: doc } });
}

export function loadMonthlyGoalDocument(monthKey: string): HorizonGoalDocument {
  return parseHorizonGoalDocument(loadAll().monthly[monthKey]);
}

export function saveMonthlyGoalDocument(monthKey: string, doc: HorizonGoalDocument): void {
  const all = loadAll();
  saveAll({ ...all, monthly: { ...all.monthly, [monthKey]: doc } });
}

/** @deprecated 블록 문서 API 사용 */
export function loadWeeklyGoalText(weekStartKey: string): string {
  return horizonDocumentToPlainText(loadWeeklyGoalDocument(weekStartKey));
}

export function saveWeeklyGoalText(weekStartKey: string, text: string): void {
  saveWeeklyGoalDocument(weekStartKey, parseHorizonGoalDocument(text));
}

export function loadMonthlyGoalText(monthKey: string): string {
  return horizonDocumentToPlainText(loadMonthlyGoalDocument(monthKey));
}

export function saveMonthlyGoalText(monthKey: string, text: string): void {
  saveMonthlyGoalDocument(monthKey, parseHorizonGoalDocument(text));
}

export function clearHorizonGoalsStorage(): void {
  localStorageClient.removeItem(StorageKeys.horizonGoals);
}
