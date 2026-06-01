import { localStorageClient } from '../localStorageClient';
import { StorageKeys } from '../storageKeys';
import { getDevMockSeedBundleVersion, runDevMockClear, runDevMockSeed } from './runDevMockSeed';

describe('devMockSeed', () => {
  beforeEach(() => {
    localStorageClient.removeItem('pokit:dev-mock-seed-bundle-version');
    localStorageClient.removeItem(StorageKeys.historyDailyStats);
    localStorageClient.removeItem(StorageKeys.historyAchievements);
    localStorageClient.removeItem(StorageKeys.historyMeta);
    localStorageClient.removeItem(StorageKeys.horizonCompletions);
    localStorageClient.removeItem(StorageKeys.horizonGoals);
  });

  it('getDevMockSeedBundleVersion reflects registered modules', () => {
    expect(getDevMockSeedBundleVersion()).toBe('history-daily@3+horizon-completions@4');
  });

  it('runDevMockSeed writes bundle version key', async () => {
    await runDevMockSeed();
    expect(localStorageClient.getItemRaw('pokit:dev-mock-seed-bundle-version')).toBe(
      getDevMockSeedBundleVersion(),
    );
  });

  it('runDevMockClear removes seeded storage and bundle version key', async () => {
    await runDevMockSeed();
    await runDevMockClear();

    expect(localStorageClient.getItemRaw('pokit:dev-mock-seed-bundle-version')).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.historyDailyStats)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.horizonCompletions)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.horizonGoals)).toBeNull();
  });
});
