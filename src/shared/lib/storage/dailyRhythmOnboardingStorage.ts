import { flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
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

/** 온보딩 완료 플래그를 쓰고 디스크에 반영될 때까지 기다린다. */
export async function markDailyRhythmOnboardingCompletedAndFlush(): Promise<void> {
  markDailyRhythmOnboardingCompleted();
  await flushLocalStorageClientWrites();
}
