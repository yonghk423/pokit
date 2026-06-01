import { localStorageClient } from './localStorageClient';
import {
  appendCustomFlowCatalogEntry,
  appendCustomFlowCatalogId,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  listCustomFlowCatalogEntries,
  listCustomFlowCatalogIds,
  reassignCustomFlowGroup,
  removeCustomFlowCatalogId,
  updateCustomFlowCatalogGroup,
} from './customFlowCatalogStorage';
import { StorageKeys } from './storageKeys';

describe('customFlowCatalogStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  });

  it('migrates legacy ids array to productivity group', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      ids: ['customFlow:a', 'customFlow:b'],
    });
    expect(listCustomFlowCatalogEntries()).toEqual([
      { id: 'customFlow:a', groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY },
      { id: 'customFlow:b', groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY },
    ]);
    expect(listCustomFlowCatalogIds()).toEqual(['customFlow:a', 'customFlow:b']);
  });

  it('appends and updates group for custom flow', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:x', groupKey: 'health' });
    updateCustomFlowCatalogGroup('customFlow:x', 'customGroup:abc');
    expect(listCustomFlowCatalogEntries()[0]).toEqual({
      id: 'customFlow:x',
      groupKey: 'customGroup:abc',
    });
  });

  it('reassigns flows when a group is deleted', () => {
    appendCustomFlowCatalogEntry({ id: 'customFlow:y', groupKey: 'customGroup:old' });
    reassignCustomFlowGroup('customGroup:old', DEFAULT_CUSTOM_FLOW_GROUP_KEY);
    expect(listCustomFlowCatalogEntries()[0]?.groupKey).toBe(DEFAULT_CUSTOM_FLOW_GROUP_KEY);
  });

  it('removes custom flow id', () => {
    appendCustomFlowCatalogId('customFlow:z');
    removeCustomFlowCatalogId('customFlow:z');
    expect(listCustomFlowCatalogEntries()).toHaveLength(0);
  });
});
