import { LegacyStorageKeys, StorageKeys, STORAGE_MIGRATION_FLAG_KEY } from './storageKeys';

describe('storageKeys', () => {
  it('uses pokit namespace for all keys', () => {
    for (const key of Object.values(StorageKeys)) {
      expect(key.startsWith('pokit:')).toBe(true);
    }
  });

  it('maps legacy lockflow keys', () => {
    expect(LegacyStorageKeys.dayPlan).toBe('lockflow:day-plan');
    expect(STORAGE_MIGRATION_FLAG_KEY).toBe('pokit:storage-migration-v1');
  });
});
