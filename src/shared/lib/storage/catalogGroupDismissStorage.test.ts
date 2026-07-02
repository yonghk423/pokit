import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  dismissCatalogGroupKey,
  isCatalogGroupDismissed,
  loadDismissedCatalogGroupKeys,
  restoreCatalogGroupKey,
} from './catalogGroupDismissStorage';

describe('catalogGroupDismissStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dismissedCatalogGroups);
  });

  it('tracks dismissed catalog groups', () => {
    expect(loadDismissedCatalogGroupKeys()).toEqual([]);
    dismissCatalogGroupKey('health');
    expect(isCatalogGroupDismissed('health')).toBe(true);
    restoreCatalogGroupKey('health');
    expect(isCatalogGroupDismissed('health')).toBe(false);
  });
});
