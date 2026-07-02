import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  hideStandardCatalogKey,
  isStandardCatalogKeyHidden,
  loadHiddenStandardCatalogKeys,
} from './hiddenStandardCatalogStorage';

describe('hiddenStandardCatalogStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
  });

  it('tracks hidden standard catalog keys', () => {
    expect(loadHiddenStandardCatalogKeys()).toEqual([]);
    hideStandardCatalogKey('water');
    expect(isStandardCatalogKeyHidden('water')).toBe(true);
    expect(loadHiddenStandardCatalogKeys()).toEqual(['water']);
  });
});
