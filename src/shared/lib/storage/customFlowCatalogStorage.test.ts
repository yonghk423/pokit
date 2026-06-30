import { localStorageClient } from './localStorageClient';
import {
  appendCustomFlowCatalogEntry,
  appendCustomFlowCatalogId,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  listAllCustomFlowCatalogEntries,
  listCustomFlowCatalogEntries,
  listCustomFlowCatalogIds,
  reassignCustomFlowGroup,
  removeCustomFlowCatalogId,
  subscribeCustomFlowCatalog,
  updateCustomFlowCatalogGroup,
} from './customFlowCatalogStorage';
import { saveGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { StorageKeys } from './storageKeys';

describe('customFlowCatalogStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
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

  it('listAllCustomFlowCatalogEntries merges config-only customFlow keys', () => {
    saveGoalDetailCategoryConfig('customFlow:orphan', { displayName: '고아', checklist: [] });
    expect(listAllCustomFlowCatalogEntries()).toEqual([
      { id: 'customFlow:orphan', groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY },
    ]);
  });

  it('subscribeCustomFlowCatalog notifies on write', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCustomFlowCatalog(listener);
    appendCustomFlowCatalogEntry({ id: 'customFlow:notify', groupKey: 'health' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    appendCustomFlowCatalogEntry({ id: 'customFlow:notify2', groupKey: 'health' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
