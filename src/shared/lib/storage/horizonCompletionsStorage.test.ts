import { localStorageClient } from './localStorageClient';
import {
  clearMonthlyCompletion,
  clearWeeklyCompletion,
  listMonthlyCompletions,
  listWeeklyCompletions,
  loadMonthlyCompletion,
  loadWeeklyCompletion,
  saveMonthlyCompletion,
  saveWeeklyCompletion,
} from './horizonCompletionsStorage';
import { StorageKeys } from './storageKeys';

describe('horizonCompletionsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.horizonCompletions);
  });

  it('saves and loads weekly completion with document snapshot', () => {
    saveWeeklyCompletion({
      periodKey: '2025-05-19',
      label: '5월 3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
      summaryText: '주간 전략 요약',
      document: {
        version: 2,
        blocks: [
          {
            id: 'b1',
            type: 'paragraph',
            text: '집중 주간',
            bold: true,
            underline: true,
          },
        ],
      },
    });
    const row = loadWeeklyCompletion('2025-05-19');
    expect(row?.document?.blocks[0]?.bold).toBe(true);
    expect(row?.document?.blocks[0]?.underline).toBe(true);
  });

  it('lists weekly completions newest first', () => {
    saveWeeklyCompletion({
      periodKey: 'a',
      label: 'A',
      completedAt: '2025-05-20T10:00:00.000Z',
    });
    saveWeeklyCompletion({
      periodKey: 'b',
      label: 'B',
      completedAt: '2025-05-22T10:00:00.000Z',
    });
    expect(listWeeklyCompletions().map((e) => e.periodKey)).toEqual(['b', 'a']);
  });

  it('clears weekly completion', () => {
    saveWeeklyCompletion({
      periodKey: '2025-05-19',
      label: '5월 3주차',
      completedAt: '2025-05-25T10:00:00.000Z',
    });
    clearWeeklyCompletion('2025-05-19');
    expect(loadWeeklyCompletion('2025-05-19')).toBeNull();
  });

  it('saves and lists monthly completion', () => {
    saveMonthlyCompletion({
      periodKey: '2025-05',
      label: '5월',
      completedAt: '2025-05-31T10:00:00.000Z',
      summaryText: '월간 전략',
    });
    expect(loadMonthlyCompletion('2025-05')?.summaryText).toBe('월간 전략');
    expect(listMonthlyCompletions()[0]?.periodKey).toBe('2025-05');
    clearMonthlyCompletion('2025-05');
    expect(loadMonthlyCompletion('2025-05')).toBeNull();
  });
});
