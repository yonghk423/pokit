import { clearDailyRhythmOnboardingCompleted } from './dailyMateOnboardingStorage';
import { clearReadingBookstoreTapGuide } from './readingBookstoreTapGuideStorage';
import { clearPokitLocalStorage, flushLocalStorageClientWrites } from './localStorageClient';
import { initializeHeroCardEditHint } from './heroCardEditHintStorage';

/** 앱 로컬 데이터를 전부 초기화합니다. */
export async function resetAppLocalData(): Promise<void> {
  await clearPokitLocalStorage();
  // clearPokitLocalStorage 이후에도 세션 래치가 남으면 온보딩이 다시 안 뜬다
  clearDailyRhythmOnboardingCompleted();
  clearReadingBookstoreTapGuide();
  // Opt back into the hint before Settings saves the fresh default day plan.
  initializeHeroCardEditHint();
  await flushLocalStorageClientWrites();
}
