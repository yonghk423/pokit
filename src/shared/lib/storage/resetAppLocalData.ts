import { cancelAllScheduledLocalNotifications } from '@shared/lib/notifications';

import { clearPokitLocalStorage } from './localStorageClient';

/** 앱 로컬 데이터(스토리지 + 예약 알림)를 전부 초기화합니다. */
export async function resetAppLocalData(): Promise<void> {
  await cancelAllScheduledLocalNotifications();
  await clearPokitLocalStorage();
}
