import { localStorageClient } from './localStorageClient';
import {
  horizonWeeklyDayMemoHasContent,
  loadHorizonWeeklyDayMemo,
  saveHorizonWeeklyDayMemo,
} from './horizonWeeklyDayMemosStorage';
import { StorageKeys } from './storageKeys';

describe('horizonWeeklyDayMemosStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.horizonWeeklyDayMemos);
  });

  it('saves and loads memo by date key', () => {
    saveHorizonWeeklyDayMemo('2025-05-26', '  오늘 집중  ');
    expect(loadHorizonWeeklyDayMemo('2025-05-26')).toBe('오늘 집중');
    expect(horizonWeeklyDayMemoHasContent('2025-05-26')).toBe(true);
  });

  it('removes entry when text is empty after trim', () => {
    saveHorizonWeeklyDayMemo('2025-05-26', '메모');
    saveHorizonWeeklyDayMemo('2025-05-26', '   ');
    expect(loadHorizonWeeklyDayMemo('2025-05-26')).toBe('');
    expect(horizonWeeklyDayMemoHasContent('2025-05-26')).toBe(false);
  });

  it('ignores invalid date keys', () => {
    saveHorizonWeeklyDayMemo('2025/05/26', 'x');
    expect(loadHorizonWeeklyDayMemo('2025/05/26')).toBe('');
    const raw = localStorageClient.getJson<Record<string, string>>(
      StorageKeys.horizonWeeklyDayMemos,
    );
    expect(raw).toBeNull();
  });

  it('filters invalid keys and empty values when loading persisted blob', () => {
    localStorageClient.setJson(StorageKeys.horizonWeeklyDayMemos, {
      '2025-05-26': '  유효  ',
      bad: '무시',
      '2025-05-27': '   ',
      '2025-05-28': 123,
    });
    expect(loadHorizonWeeklyDayMemo('2025-05-26')).toBe('유효');
    expect(loadHorizonWeeklyDayMemo('2025-05-27')).toBe('');
    expect(loadHorizonWeeklyDayMemo('bad')).toBe('');
  });

  it('keeps memos for different dates independently', () => {
    saveHorizonWeeklyDayMemo('2025-05-26', '월');
    saveHorizonWeeklyDayMemo('2025-05-27', '화');
    expect(loadHorizonWeeklyDayMemo('2025-05-26')).toBe('월');
    expect(loadHorizonWeeklyDayMemo('2025-05-27')).toBe('화');
  });
});
