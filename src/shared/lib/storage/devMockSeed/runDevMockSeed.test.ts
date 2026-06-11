import { localStorageClient } from '../localStorageClient';
import { StorageKeys } from '../storageKeys';
import { getDevMockSeedBundleVersion, runDevMockClear, runDevMockSeed } from './runDevMockSeed';

describe('devMockSeed', () => {
  beforeEach(() => {
    localStorageClient.removeItem('pokit:dev-mock-seed-bundle-version');
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.historyDailyStats);
    localStorageClient.removeItem(StorageKeys.historyAchievements);
    localStorageClient.removeItem(StorageKeys.historyMeta);
    localStorageClient.removeItem(StorageKeys.horizonCompletions);
    localStorageClient.removeItem(StorageKeys.horizonGoals);
  });

  it('getDevMockSeedBundleVersion reflects registered modules', () => {
    expect(getDevMockSeedBundleVersion()).toBe('history-daily@9+horizon-completions@5');
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
    expect(localStorageClient.getJson(StorageKeys.customCatalogGroups)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.customFlowCatalog)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.historyDailyStats)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.horizonCompletions)).toBeNull();
    expect(localStorageClient.getJson(StorageKeys.horizonGoals)).toBeNull();
  });
});
