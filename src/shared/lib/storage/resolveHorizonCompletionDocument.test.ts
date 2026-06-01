import { localStorageClient } from './localStorageClient';
import { loadWeeklyCompletion, saveWeeklyCompletion } from './horizonCompletionsStorage';
import { resolveWeeklyCompletionDocument } from './resolveHorizonCompletionDocument';
import { saveWeeklyGoalDocument } from './horizonGoalsStorage';
import { createHorizonBlock } from './horizonGoalBlocks';
import { StorageKeys } from './storageKeys';

describe('resolveHorizonCompletionDocument', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.horizonCompletions);
    localStorageClient.removeItem(StorageKeys.horizonGoals);
  });

  it('prefers document snapshot on completion entry', () => {
    saveWeeklyCompletion({
      periodKey: '2025-05-19',
      label: '5월 3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
      document: {
        version: 2,
        blocks: [createHorizonBlock('heading1', { text: '스냅샷 제목', bold: true })],
      },
    });
    saveWeeklyGoalDocument('2025-05-19', {
      version: 2,
      blocks: [createHorizonBlock('paragraph', { text: '현재 문서' })],
    });

    const saved = loadWeeklyCompletion('2025-05-19');
    expect(saved).not.toBeNull();
    const doc = resolveWeeklyCompletionDocument(saved!);
    expect(doc.blocks[0]?.text).toBe('스냅샷 제목');
  });

  it('falls back to stored goal document when snapshot is missing', () => {
    saveWeeklyGoalDocument('2025-05-19', {
      version: 2,
      blocks: [createHorizonBlock('bullet', { text: '리스트 항목' })],
    });

    const doc = resolveWeeklyCompletionDocument({
      periodKey: '2025-05-19',
      label: '5월 3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
    });
    expect(doc.blocks[0]?.type).toBe('bullet');
  });
});
