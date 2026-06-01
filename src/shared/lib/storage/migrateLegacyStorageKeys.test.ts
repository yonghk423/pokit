import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { migrateLegacyStorageKeys } from './migrateLegacyStorageKeys';
import { LegacyStorageKeys, STORAGE_MIGRATION_FLAG_KEY, StorageKeys } from './storageKeys';

describe('migrateLegacyStorageKeys', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  });

  it('copies legacy values into pokit keys once', async () => {
    await AsyncStorage.setItem(LegacyStorageKeys.settings, JSON.stringify({ migrated: true }));
    await migrateLegacyStorageKeys();
    const next = await AsyncStorage.getItem(StorageKeys.settings);
    expect(next).toContain('migrated');
    expect(await AsyncStorage.getItem(STORAGE_MIGRATION_FLAG_KEY)).toBe('1');
  });

  it('skips migration when flag is already set', async () => {
    await AsyncStorage.setItem(STORAGE_MIGRATION_FLAG_KEY, '1');
    await AsyncStorage.setItem(LegacyStorageKeys.settings, JSON.stringify({ legacy: true }));
    await migrateLegacyStorageKeys();
    expect(await AsyncStorage.getItem(StorageKeys.settings)).toBeNull();
  });

  it('no-ops on web', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'web' });
    await AsyncStorage.setItem(LegacyStorageKeys.settings, JSON.stringify({ legacy: true }));
    await migrateLegacyStorageKeys();
    expect(await AsyncStorage.getItem(StorageKeys.settings)).toBeNull();
  });
});
