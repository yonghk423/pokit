import { flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedDailyRhythmOnboarding = {
  completed: boolean;
  /**
   * 온보딩 완료 직후 오늘 탭 집중 시간 칩 1회 강조 대기.
   * 기존 완료 사용자(필드 없음)는 pending 이 아니므로 애니메이션을 다시 보지 않는다.
   */
  windowChipGuidePending?: boolean;
};

/**
 * 프로세스 생존 동안 온보딩 완료를 유지한다.
 * AsyncStorage 반영 전 remount·탭 복귀로 게이트가 다시 열리는 것을 막는다.
 * 데이터 초기화 시에만 풀어 준다.
 */
let sessionCompletedLatch = false;

function readDailyRhythmOnboarding(): PersistedDailyRhythmOnboarding | null {
  return localStorageClient.getJson<PersistedDailyRhythmOnboarding>(
    StorageKeys.dailyRhythmOnboarding,
  );
}

export function loadDailyRhythmOnboardingCompleted(): boolean {
  if (sessionCompletedLatch) return true;
  const completed = readDailyRhythmOnboarding()?.completed === true;
  if (completed) {
    sessionCompletedLatch = true;
  }
  return completed;
}

/** 온보딩 직후 집중 시간 칩 강조를 아직 재생하지 않았는지 */
export function loadDailyRhythmWindowChipGuidePending(): boolean {
  const v = readDailyRhythmOnboarding();
  return v?.completed === true && v.windowChipGuidePending === true;
}

export function markDailyRhythmOnboardingCompleted(): void {
  sessionCompletedLatch = true;
  localStorageClient.setJson<PersistedDailyRhythmOnboarding>(StorageKeys.dailyRhythmOnboarding, {
    completed: true,
    windowChipGuidePending: true,
  });
}

export function clearDailyRhythmWindowChipGuidePending(): void {
  const v = readDailyRhythmOnboarding();
  if (!v?.completed) return;
  if (v.windowChipGuidePending !== true) return;
  localStorageClient.setJson<PersistedDailyRhythmOnboarding>(StorageKeys.dailyRhythmOnboarding, {
    ...v,
    windowChipGuidePending: false,
  });
}

/**
 * 앱 데이터 초기화 등 — 온보딩을 다시 보여야 할 때 세션 래치·디스크 플래그를 함께 지운다.
 */
export function clearDailyRhythmOnboardingCompleted(): void {
  sessionCompletedLatch = false;
  localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
}

/** 온보딩 완료 플래그를 쓰고 디스크에 반영될 때까지 기다린다. */
export async function markDailyRhythmOnboardingCompletedAndFlush(): Promise<void> {
  markDailyRhythmOnboardingCompleted();
  await flushLocalStorageClientWrites();
}
