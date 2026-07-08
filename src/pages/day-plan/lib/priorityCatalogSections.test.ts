import { dismissCatalogGroupWithItemReassign } from '@entities/day-plan';
import { hideStandardCatalogKey } from '@shared/lib/storage/hiddenStandardCatalogStorage';
import { updateStandardCatalogGroup } from '@shared/lib/storage/catalogItemGroupStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import {
  buildPriorityCatalogSections,
  defaultSystemGroupForCatalogKey,
} from './priorityCatalogSections';

describe('priorityCatalogSections', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.standardCatalogGroupOverrides);
    localStorageClient.removeItem(StorageKeys.dismissedCatalogGroups);
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
  });

  it('maps standard keys to system groups', () => {
    expect(defaultSystemGroupForCatalogKey('water')).toBe('health');
    expect(defaultSystemGroupForCatalogKey('reading')).toBe('productivity');
  });

  it('builds health and productivity sections with custom flows', () => {
    const result = buildPriorityCatalogSections({
      available: [
        { key: 'water', label: '수분', icon: 'drop.fill' },
        { key: 'reading', label: '독서', icon: 'book.closed.fill' },
      ],
      customFlowPickerItems: [
        { key: 'customFlow:a', label: '나만의 플로우', icon: 'book.fill' },
      ],
      customFlowEntries: [{ id: 'customFlow:a', groupKey: 'health' }],
      customGroups: [{ key: 'customGroup:1', label: '나의 그룹' }],
    });

    expect(result.groupSections.map((s) => s.groupKey)).toEqual([
      'health',
      'productivity',
      'customGroup:1',
    ]);
    const health = result.groupSections.find((s) => s.groupKey === 'health');
    expect(health?.items.map((i) => i.key)).toEqual(['water', 'customFlow:a']);
    const custom = result.groupSections.find((s) => s.groupKey === 'customGroup:1');
    expect(custom?.isCustomGroup).toBe(true);
    expect(custom?.items).toHaveLength(0);
  });

  it('places standard items in overridden groups', () => {
    updateStandardCatalogGroup('reading', 'health');
    const result = buildPriorityCatalogSections({
      available: [
        { key: 'water', label: '수분', icon: 'drop.fill' },
        { key: 'reading', label: '독서', icon: 'book.closed.fill' },
      ],
      customFlowPickerItems: [],
      customFlowEntries: [],
      customGroups: [],
    });

    const health = result.groupSections.find((s) => s.groupKey === 'health');
    const productivity = result.groupSections.find((s) => s.groupKey === 'productivity');
    expect(health?.items.map((i) => i.key)).toEqual(['water', 'reading']);
    expect(productivity?.items).toEqual([]);
  });

  it('hides dismissed system groups and hidden standard items', () => {
    dismissCatalogGroupWithItemReassign('health');
    hideStandardCatalogKey('reading');
    const result = buildPriorityCatalogSections({
      available: [
        { key: 'water', label: '수분', icon: 'drop.fill' },
        { key: 'reading', label: '독서', icon: 'book.closed.fill' },
      ],
      customFlowPickerItems: [],
      customFlowEntries: [],
      customGroups: [],
    });

    expect(result.groupSections.map((s) => s.groupKey)).toEqual(['productivity']);
    expect(result.groupSections[0]?.items.map((i) => i.key)).toEqual([]);
  });
});
