import { cancelAllScheduledLocalNotifications } from '@shared/lib/notifications';

import { flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import {
  LegacyStorageKeys,
  STORAGE_MIGRATION_FLAG_KEY,
  StorageKeys,
} from './storageKeys';

/** 앱 로컬 데이터(스토리지 + 예약 알림)를 전부 초기화합니다. */
export async function resetAppLocalData(): Promise<void> {
  await cancelAllScheduledLocalNotifications();

  const keys = new Set<string>([
    ...Object.values(StorageKeys),
    ...Object.values(LegacyStorageKeys),
    STORAGE_MIGRATION_FLAG_KEY,
  ]);

  for (const key of keys) {
    localStorageClient.removeItem(key);
  }

  await flushLocalStorageClientWrites();
}
