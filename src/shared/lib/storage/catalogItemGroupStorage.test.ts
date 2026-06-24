import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import {
  loadStandardCatalogGroupOverrides,
  resolveCatalogItemGroupKey,
  updateCatalogItemGroup,
  updateStandardCatalogGroup,
} from './catalogItemGroupStorage';
import { appendCustomFlowCatalogEntry } from './customFlowCatalogStorage';

describe('catalogItemGroupStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.standardCatalogGroupOverrides);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  });

  it('resolves default system group for standard keys', () => {
    expect(resolveCatalogItemGroupKey('water')).toBe('health');
    expect(resolveCatalogItemGroupKey('reading')).toBe('productivity');
  });

  it('persists standard catalog group override', () => {
    updateStandardCatalogGroup('reading', 'health');
    expect(loadStandardCatalogGroupOverrides()).toEqual({ reading: 'health' });
    expect(resolveCatalogItemGroupKey('reading')).toBe('health');
  });

  it('clears override when moved back to default group', () => {
    updateStandardCatalogGroup('water', 'productivity');
    expect(resolveCatalogItemGroupKey('water')).toBe('productivity');
    updateStandardCatalogGroup('water', 'health');
    expect(loadStandardCatalogGroupOverrides()).toEqual({});
    expect(resolveCatalogItemGroupKey('water')).toBe('health');
  });

  it('updates custom flow group through unified API', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:test', groupKey: 'health' });
    updateCatalogItemGroup('customFlow:test', 'productivity');
    expect(resolveCatalogItemGroupKey('customFlow:test')).toBe('productivity');
  });
});
