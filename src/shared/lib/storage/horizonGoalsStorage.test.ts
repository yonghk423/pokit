import { createHorizonBlock, parseHorizonGoalDocument } from './horizonGoalBlocks';
import { localStorageClient } from './localStorageClient';
import {
  loadMonthlyGoalDocument,
  loadWeeklyGoalDocument,
  saveMonthlyGoalDocument,
  saveWeeklyGoalDocument,
} from './horizonGoalsStorage';
import { StorageKeys } from './storageKeys';

describe('horizonGoalsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.horizonGoals);
  });

  it('persists weekly goal document by week start key', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [createHorizonBlock('paragraph', { text: '이번 주 목표' })],
    });
    saveWeeklyGoalDocument('2025-05-19', doc);
    const loaded = loadWeeklyGoalDocument('2025-05-19');
    expect(loaded.blocks[0]?.text).toBe('이번 주 목표');
  });

  it('persists monthly goal document separately', () => {
    const doc = parseHorizonGoalDocument({
      version: 2,
      blocks: [createHorizonBlock('heading2', { text: '5월 전략' })],
    });
    saveMonthlyGoalDocument('2025-05', doc);
    expect(loadMonthlyGoalDocument('2025-05').blocks[0]?.text).toBe('5월 전략');
    expect(loadWeeklyGoalDocument('2025-05-19').blocks).toHaveLength(0);
  });
});
