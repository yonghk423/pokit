import { listCustomCatalogGroups } from './customCatalogGroupStorage';
import { listCustomFlowCatalogEntries } from './customFlowCatalogStorage';
import { DEFAULT_BUILTIN_CUSTOM_FLOWS, DEFAULT_BUILTIN_CUSTOM_GROUPS } from './defaultPriorityCatalog';
import { ensureDefaultPriorityCatalog } from './ensureDefaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('ensureDefaultPriorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  });

  it('seeds default groups and flows on empty storage', () => {
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups().map((g) => g.label)).toEqual(
      DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => g.label),
    );
    expect(listCustomFlowCatalogEntries()).toHaveLength(DEFAULT_BUILTIN_CUSTOM_FLOWS.length);
    expect(loadGoalDetailCategoryConfig('customFlow:builtin_hobby_draw')).toEqual({
      displayName: '드로잉 연습',
      checklist: [],
    });
  });

  it('removes legacy dev seed custom flows', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [
        { id: 'customFlow:seed00001', groupKey: 'health' },
        { id: 'customFlow:builtin_hobby_draw', groupKey: 'customGroup:builtin_hobby' },
      ],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        'customFlow:seed00001': { displayName: '옛 시드', checklist: [] },
        'customFlow:builtin_hobby_draw': { displayName: '드로잉 연습', checklist: [] },
      },
      committedCategoryKeys: ['customFlow:seed00001', 'customFlow:builtin_hobby_draw'],
    });

    ensureDefaultPriorityCatalog();

    const ids = listCustomFlowCatalogEntries().map((e) => e.id);
    expect(ids).not.toContain('customFlow:seed00001');
    expect(ids).toContain('customFlow:builtin_hobby_draw');
  });

  it('is idempotent and preserves user-added groups', () => {
    ensureDefaultPriorityCatalog();
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [
        ...DEFAULT_BUILTIN_CUSTOM_GROUPS.map((g) => ({ key: g.key, label: g.label })),
        { key: 'customGroup:user01', label: '나만의 묶음' },
      ],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toHaveLength(4);
    expect(listCustomFlowCatalogEntries()).toHaveLength(DEFAULT_BUILTIN_CUSTOM_FLOWS.length);
  });
});
