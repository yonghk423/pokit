import { localStorageClient } from './localStorageClient';
import {
  loadRoutineStartTimes,
  normalizeRoutineStartTimes,
  saveRoutineStartTimes,
} from './routineStartTimesStorage';
import { StorageKeys } from './storageKeys';

describe('routineStartTimesStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.routineStartTimes);
  });

  it('normalizes valid entries and drops invalid ranges', () => {
    const next = normalizeRoutineStartTimes({
      byCategoryKey: {
        healthIntake: { startMinutes: 9 * 60, endMinutes: 9 * 60 + 30 },
        bad: { startMinutes: 10 * 60, endMinutes: 9 * 60 },
        overnight: {
          startMinutes: 23 * 60,
          endMinutes: 30,
          endsNextCalendarDay: true,
        },
      },
    });
    expect(next.byCategoryKey).toEqual({
      healthIntake: { startMinutes: 9 * 60, endMinutes: 9 * 60 + 30 },
      overnight: {
        startMinutes: 23 * 60,
        endMinutes: 30,
        endsNextCalendarDay: true,
      },
    });
  });

  it('persists and reloads by category key', () => {
    saveRoutineStartTimes({
      byCategoryKey: {
        'customFlow:stretch': { startMinutes: 13 * 60 + 10, endMinutes: 13 * 60 + 40 },
      },
    });
    expect(loadRoutineStartTimes()).toEqual({
      byCategoryKey: {
        'customFlow:stretch': { startMinutes: 13 * 60 + 10, endMinutes: 13 * 60 + 40 },
      },
    });
  });
});
