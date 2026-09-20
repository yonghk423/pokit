import {
  clearDailyRhythmOnboardingCompleted,
  loadDailyRhythmOnboardingCompleted,
  markDailyRhythmOnboardingCompleted,
  loadDailyRhythmWindowChipGuidePending,
  clearDailyRhythmWindowChipGuidePending,
} from './dailyRhythmOnboardingStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('dailyRhythmOnboardingStorage', () => {
  beforeEach(() => {
    clearDailyRhythmOnboardingCompleted();
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

  it('keeps session latch after storage key is removed', () => {
    markDailyRhythmOnboardingCompleted();
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
    // 디스크 키만 지워도 세션 중에는 완료로 본다 (탭 remount 방어)
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
  });

  it('clears session latch on explicit clear', () => {
    markDailyRhythmOnboardingCompleted();
    clearDailyRhythmOnboardingCompleted();
    expect(loadDailyRhythmOnboardingCompleted()).toBe(false);
  });

  it('clears window chip guide pending after play', () => {
    markDailyRhythmOnboardingCompleted();
    clearDailyRhythmWindowChipGuidePending();
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(false);
  });

  it('does not treat legacy completed users as pending', () => {
    clearDailyRhythmOnboardingCompleted();
    localStorageClient.setJson(StorageKeys.dailyRhythmOnboarding, { completed: true });
    expect(loadDailyRhythmWindowChipGuidePending()).toBe(false);
    expect(loadDailyRhythmOnboardingCompleted()).toBe(true);
  });
});
