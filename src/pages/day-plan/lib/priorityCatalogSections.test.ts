import { dismissCatalogGroupWithItemReassign } from '@entities/day-plan';
import { hideStandardCatalogKey } from '@shared/lib/storage/hiddenStandardCatalogStorage';
import { updateStandardCatalogGroup } from '@shared/lib/storage/catalogItemGroupStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import {
  buildPriorityCatalogSections,
  defaultSystemGroupForCatalogKey,
  filterPickerItemsByQuery,
  flattenPriorityCatalogItems,
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
    updateStandardCatalogGroup('fasting', 'productivity');
    const result = buildPriorityCatalogSections({
      available: [
        { key: 'healthIntake', label: '건강 섭취', icon: 'pills.fill' },
        { key: 'fasting', label: '단식', icon: 'person.fill' },
      ],
      customFlowPickerItems: [],
      customFlowEntries: [],
      customGroups: [],
    });

    const health = result.groupSections.find((s) => s.groupKey === 'health');
    const productivity = result.groupSections.find((s) => s.groupKey === 'productivity');
    expect(health?.items.map((i) => i.key)).toEqual(['healthIntake']);
    expect(productivity?.items.map((i) => i.key)).toEqual(['fasting']);
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

  it('flattens group sections into a single deduped list', () => {
    localStorageClient.removeItem(StorageKeys.dismissedCatalogGroups);
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
    localStorageClient.removeItem(StorageKeys.standardCatalogGroupOverrides);

    const result = buildPriorityCatalogSections({
      available: [
        { key: 'healthIntake', label: '건강 섭취', icon: 'pills.fill' },
        { key: 'fasting', label: '단식', icon: 'person.fill' },
      ],
      customFlowPickerItems: [
        { key: 'customFlow:a', label: '나만의 플로우', icon: 'book.fill' },
      ],
      customFlowEntries: [{ id: 'customFlow:a', groupKey: 'health' }],
      customGroups: [{ key: 'customGroup:1', label: '나의 그룹' }],
    });

    const flatKeys = flattenPriorityCatalogItems(result.groupSections).map((i) => i.key);
    expect(flatKeys).toContain('healthIntake');
    expect(flatKeys).toContain('fasting');
    expect(flatKeys).toContain('customFlow:a');
    expect(new Set(flatKeys).size).toBe(flatKeys.length);
  });

  it('filters flat catalog items by label query', () => {
    const items = [
      { key: 'a', label: '청소하기', icon: 'sparkles' },
      { key: 'b', label: '스트레칭', icon: 'figure.walk' },
      { key: 'c', label: '체중 조절', icon: 'scalemass' },
    ];
    expect(filterPickerItemsByQuery(items, '청소').map((i) => i.key)).toEqual(['a']);
    expect(filterPickerItemsByQuery(items, '체중조절').map((i) => i.key)).toEqual(['c']);
    expect(filterPickerItemsByQuery(items, '  ').map((i) => i.key)).toEqual(['a', 'b', 'c']);
    expect(filterPickerItemsByQuery(items, '없는루틴')).toEqual([]);
  });
});
