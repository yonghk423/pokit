import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadRoutineStartTimes } from '@shared/lib/storage/routineStartTimesStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { useRoutineStartTimesStore } from './routineStartTimesStore';

describe('useRoutineStartTimesStore', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.routineStartTimes);
    useRoutineStartTimesStore.setState({
      byCategoryKey: {},
      isHydrated: false,
    });
  });

  it('persists multiple category start times across hydrate', () => {
    useRoutineStartTimesStore.getState().hydrate();
    expect(
      useRoutineStartTimesStore.getState().setRoutineStartTime('healthIntake', {
        startMinutes: 8 * 60,
        endMinutes: 8 * 60 + 30,
      }),
    ).toBe(true);
    expect(
      useRoutineStartTimesStore.getState().setRoutineStartTime('customFlow:stretch', {
        startMinutes: 21 * 60 + 10,
        endMinutes: 21 * 60 + 40,
      }),
    ).toBe(true);

    expect(loadRoutineStartTimes().byCategoryKey).toEqual({
      healthIntake: { startMinutes: 8 * 60, endMinutes: 8 * 60 + 30 },
      'customFlow:stretch': { startMinutes: 21 * 60 + 10, endMinutes: 21 * 60 + 40 },
    });

    useRoutineStartTimesStore.setState({
      byCategoryKey: {},
      isHydrated: false,
    });
    useRoutineStartTimesStore.getState().hydrate();
    expect(useRoutineStartTimesStore.getState().byCategoryKey).toEqual({
      healthIntake: { startMinutes: 8 * 60, endMinutes: 8 * 60 + 30 },
      'customFlow:stretch': { startMinutes: 21 * 60 + 10, endMinutes: 21 * 60 + 40 },
    });
  });
});
