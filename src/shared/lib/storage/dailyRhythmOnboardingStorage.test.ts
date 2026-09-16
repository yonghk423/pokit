import {
  loadDailyRhythmOnboardingCompleted,
  markDailyRhythmOnboardingCompleted,
  loadDailyRhythmWindowChipGuidePending,
  clearDailyRhythmWindowChipGuidePending,
} from './dailyRhythmOnboardingStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('dailyRhythmOnboardingStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
  });

  it('defaults to not completed', () => {
    expect(loadDailyRhythmOnboardingCompleted()).toBe(false);
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(false);
  });

  it('marks onboarding completed and queues window chip guide', () => {
    markDailyRhythmOnboardingCompleted();
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(true);
  });

  it('clears window chip guide pending after play', () => {
    markDailyRhythmOnboardingCompleted();
    clearDailyRhythmWindowChipGuidePending();
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(false);
  });

  it('does not treat legacy completed users as pending', () => {
    localStorageClient.setJson(StorageKeys.dailyRhythmOnboarding, { completed: true });
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(false);
  });
});
