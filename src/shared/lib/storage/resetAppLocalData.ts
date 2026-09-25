import { cancelAllScheduledLocalNotifications } from '@shared/lib/notifications';

import { clearDailyRhythmOnboardingCompleted } from './dailyRhythmOnboardingStorage';
import { clearReadingBookstoreTapGuide } from './readingBookstoreTapGuideStorage';
import { clearPokitLocalStorage } from './localStorageClient';

/** 앱 로컬 데이터(스토리지 + 예약 알림)를 전부 초기화합니다. */
export async function resetAppLocalData(): Promise<void> {
  await cancelAllScheduledLocalNotifications();
  await clearPokitLocalStorage();
  // clearPokitLocalStorage 이후에도 세션 래치가 남으면 온보딩이 다시 안 뜬다
  clearDailyRhythmOnboardingCompleted();
  clearReadingBookstoreTapGuide();
}
