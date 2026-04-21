import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedDailyRhythmOnboarding = {
  completed: boolean;
};

export function loadDailyRhythmOnboardingCompleted(): boolean {
  const v = localStorageClient.getJson<PersistedDailyRhythmOnboarding>(
    StorageKeys.dailyRhythmOnboarding,
  );
  return v?.completed === true;
}

export function markDailyRhythmOnboardingCompleted(): void {
  localStorageClient.setJson<PersistedDailyRhythmOnboarding>(StorageKeys.dailyRhythmOnboarding, {
    completed: true,
  });
}
