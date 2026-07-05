import { listCustomCatalogGroups } from './customCatalogGroupStorage';
import { listCustomFlowCatalogEntries } from './customFlowCatalogStorage';
import { ensureDefaultPriorityCatalog } from './ensureDefaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('ensureDefaultPriorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
  });

  it('does not seed builtin custom groups or flows on empty storage', () => {
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toEqual([]);
    expect(listCustomFlowCatalogEntries()).toEqual([]);
  });

  it('removes legacy dev seed and builtin custom flows', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [
        { id: 'customFlow:seed00001', groupKey: 'health' },
        { id: 'customFlow:builtin_hobby_draw', groupKey: 'customGroup:builtin_hobby' },
        { id: 'customFlow:user01abcdef', groupKey: 'productivity' },
      ],
    });
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [
        { key: 'customGroup:builtin_hobby', label: '취미·여가' },
        { key: 'customGroup:user01', label: '나만의 묶음' },
      ],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        'customFlow:seed00001': { displayName: '옛 시드', checklist: [] },
        'customFlow:builtin_hobby_draw': { displayName: '드로잉 연습', checklist: [] },
        'customFlow:user01abcdef': { displayName: '내 루틴', checklist: [] },
      },
      committedCategoryKeys: [
        'customFlow:seed00001',
        'customFlow:builtin_hobby_draw',
        'customFlow:user01abcdef',
      ],
    });

    ensureDefaultPriorityCatalog();

    const ids = listCustomFlowCatalogEntries().map((e) => e.id);
    expect(ids).not.toContain('customFlow:seed00001');
    expect(ids).not.toContain('customFlow:builtin_hobby_draw');
    expect(ids).toContain('customFlow:user01abcdef');
    expect(listCustomCatalogGroups().map((g) => g.key)).toEqual(['customGroup:user01']);
    expect(loadGoalDetailCategoryConfig('customFlow:builtin_hobby_draw')).toBeNull();
  });

  it('removes retired standard catalog keys such as meditation', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, { items: [] });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: { meditation: { displayName: '명상', checklist: [] } },
      committedCategoryKeys: ['meditation'],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      planMode: 'priority',
      priorityCategoryOrder: ['water', 'meditation', 'reading'],
    });
    localStorageClient.setJson(StorageKeys.fixedFlowSets, {
      activeSetIds: [],
      sets: [
        {
          id: 'set_a',
          name: '테스트',
          applyRule: 'manual',
          items: [{ categoryKey: 'meditation', enabled: true }],
        },
      ],
    });

    ensureDefaultPriorityCatalog();

    expect(loadGoalDetailCategoryConfig('meditation')).toBeNull();
    expect(
      (localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder ?? []),
    ).toEqual(['healthIntake', 'reading']);
  });

  it('is idempotent and preserves user-added groups', () => {
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [{ key: 'customGroup:user01', label: '나만의 묶음' }],
    });

    ensureDefaultPriorityCatalog();
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toHaveLength(1);
    expect(listCustomFlowCatalogEntries()).toHaveLength(0);
  });
});
