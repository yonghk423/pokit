import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  LegacyStorageKeys,
  STORAGE_MIGRATION_FLAG_KEY,
  StorageKeys,
} from './storageKeys';

/**
 * `lockflow:*` 키를 `pokit:*`로 1회 복사한다.
 * 신규 키에 값이 없고 레거시 키에만 있을 때만 이전한다.
 */
export async function migrateLegacyStorageKeys(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const alreadyMigrated = await AsyncStorage.getItem(STORAGE_MIGRATION_FLAG_KEY);
    if (alreadyMigrated === '1') return;

    const pairs = Object.keys(StorageKeys) as (keyof typeof StorageKeys)[];
    for (const name of pairs) {
      const nextKey = StorageKeys[name];
      const legacyKey = LegacyStorageKeys[name];
      const [nextValue, legacyValue] = await AsyncStorage.multiGet([nextKey, legacyKey]).then(
        (rows) => rows.map(([, value]) => value),
      );

      if ((nextValue == null || nextValue === '') && legacyValue != null && legacyValue !== '') {
        await AsyncStorage.setItem(nextKey, legacyValue);
      }
    }

    await AsyncStorage.setItem(STORAGE_MIGRATION_FLAG_KEY, '1');
  } catch {
    // 마이그레이션 실패는 앱 기동을 막지 않음
  }
}
