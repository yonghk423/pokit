import {
  loadDailyRhythmOnboardingCompleted,
  markDailyRhythmOnboardingCompleted,
} from './dailyRhythmOnboardingStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('dailyRhythmOnboardingStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
  });

  it('defaults to not completed', () => {
    expect(loadDailyRhythmOnboardingCompleted()).toBe(false);
  });

  it('marks onboarding completed', () => {
    markDailyRhythmOnboardingCompleted();
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
  });
});
