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
import { hideStandardCatalogKey } from './hiddenStandardCatalogStorage';
import { StorageKeys } from './storageKeys';

describe('customFlowCatalogStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
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

  it('listAllCustomFlowCatalogEntries hides deleted builtin presets', () => {
    appendCustomFlowCatalogEntry({
      id: 'customFlow:preset_pokit_week_tour',
      groupKey: 'customGroup:preset_tutorial',
    });
    hideStandardCatalogKey('customFlow:preset_pokit_week_tour');
    expect(listAllCustomFlowCatalogEntries().map((e) => e.id)).not.toContain(
      'customFlow:preset_pokit_week_tour',
    );
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

it('excludes saved development examples and config-only samples while keeping user-created mates', () => {
  localStorageClient.removeItem(StorageKeys.customFlowCatalog);
  localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  const sampleIds = [
    'customFlow:dev-template:checklist', 'customFlow:dev-template:memo',
    'customFlow:dev-template:measurement', 'customFlow:dev-template:healthIntake',
    'customFlow:dev-template:fasting', 'customFlow:dev-template:counter',
    'customFlow:dev-template:reminder', 'customFlow:dev-concept:checklist',
    'customFlow:dev-concept:counter',
  ];
  const userId = 'customFlow:user-created';
  localStorageClient.setJson(StorageKeys.customFlowCatalog, {
    items: [...sampleIds.slice(0, 7), userId].map(id => ({ id, groupKey: 'productivity' })),
  });
  for (const id of [...sampleIds, userId]) saveGoalDetailCategoryConfig(id, { displayName: '메이트', checklist: [] });
  expect(listCustomFlowCatalogEntries().map(entry => entry.id)).toEqual([userId]);
  expect(listAllCustomFlowCatalogEntries().map(entry => entry.id)).toEqual([userId]);
  // Existing plans can still resolve the sample's detail data: this is catalog visibility, not deletion.
  expect(localStorageClient.getJson<{ byCategory: Record<string, unknown> }>(StorageKeys.goalDetailSettings)?.byCategory[sampleIds[0]]).toBeDefined();
});
