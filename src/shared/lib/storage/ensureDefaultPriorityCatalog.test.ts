import { listCustomCatalogGroups } from './customCatalogGroupStorage';
import { listCustomFlowCatalogEntries } from './customFlowCatalogStorage';
import {
  ABSTAIN_CHECKLIST_LABELS,
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_ABSTAIN_GROUP_KEY,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_DAILY_LIFE_GROUP_KEY,
  BUILTIN_GOOD_POSTURE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  BUILTIN_FOCUS_FLOW_ID,
  BUILTIN_HEALTH_GROUP_KEY,
  BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  BUILTIN_TUTORIAL_GROUP_KEY,
  LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
} from './defaultPriorityCatalog';
import { loadStandardCatalogGroupOverrides, resolveCatalogItemGroupKey } from './catalogItemGroupStorage';
import { ensureDefaultPriorityCatalog } from './ensureDefaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import { resolveCategoryCatalogIcon } from '@entities/day-plan';

describe('ensureDefaultPriorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
  });

  it('seeds seven daily life checklist flows and abstain flow on empty storage', () => {
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toEqual([
      { key: BUILTIN_TUTORIAL_GROUP_KEY, label: '포킷 사용해보기' },
      { key: BUILTIN_DAILY_LIFE_GROUP_KEY, label: '일상 루틴' },
      { key: BUILTIN_ABSTAIN_GROUP_KEY, label: '금지 루틴' },
    ]);
    expect(listCustomFlowCatalogEntries().map((e) => e.id)).toEqual([
      BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
      ...BUILTIN_DAILY_LIFE_FLOW_IDS,
      BUILTIN_ABSTAIN_FLOW_ID,
      BUILTIN_STRETCHING_FLOW_ID,
      BUILTIN_FOCUS_FLOW_ID,
    ]);

    const tourCfg = loadGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID);
    expect(tourCfg?.displayName).toBe('포킷 빠르게 둘러보기');
    expect((tourCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(tourCfg?.checklist).toHaveLength(7);
    expect(tourCfg?.checklist?.map((item) => item.text)).toEqual([
      '루틴 탭 둘러보기',
      '나만의 루틴 만들기',
      '히스토리 확인하기',
      '투두 리스트 써보기',
      '책방 열어보기',
      '잠금화면 메모 써보기',
      '노트 적어보기',
    ]);

    const bedCfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_LIFE_FLOW_IDS[0]);
    expect(bedCfg?.displayName).toBe('이불정리');
    expect((bedCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(bedCfg?.checklist?.map((item) => item.text)).toEqual(['이불정리']);

    const washCfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_LIFE_FLOW_IDS[3]);
    expect((washCfg as { icon?: string })?.icon).toBe('hands.sparkles.fill');

    const exerciseCfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_LIFE_FLOW_IDS[5]);
    expect(exerciseCfg?.displayName).toBe('운동하기');
    expect((exerciseCfg as { templateKey?: string })?.templateKey).toBe('checklist');

    const shoppingCfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_LIFE_FLOW_IDS[6]);
    expect(shoppingCfg?.displayName).toBe('쇼핑하기');
    expect((shoppingCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect((shoppingCfg as { icon?: string })?.icon).toBe('cart.fill');

    expect(loadGoalDetailCategoryConfig(BUILTIN_INTERMITTENT_FASTING_FLOW_ID)).toBeNull();

    const abstainCfg = loadGoalDetailCategoryConfig(BUILTIN_ABSTAIN_FLOW_ID);
    expect(abstainCfg?.displayName).toBe('금지');
    expect((abstainCfg as { templateKey?: string })?.templateKey).toBe('abstain');
    expect(abstainCfg?.checklist?.map((item) => item.text)).toEqual([...ABSTAIN_CHECKLIST_LABELS]);

    const stretchingCfg = loadGoalDetailCategoryConfig(BUILTIN_STRETCHING_FLOW_ID);
    expect(stretchingCfg?.displayName).toBe('스트레칭');
    expect((stretchingCfg as { icon?: string })?.icon).toBe('figure.flexibility');
    expect((stretchingCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(stretchingCfg?.checklist?.map((item) => item.text)).toEqual(['스트레칭']);

    const focusCfg = loadGoalDetailCategoryConfig(BUILTIN_FOCUS_FLOW_ID);
    expect(focusCfg?.displayName).toBe('집중하기');
    expect((focusCfg as { icon?: string })?.icon).toBe('brain.head.profile');
    expect((focusCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(focusCfg?.checklist?.map((item) => item.text)).toEqual(['집중하기']);
    expect(resolveCatalogItemGroupKey(BUILTIN_FOCUS_FLOW_ID)).toBe('productivity');

    const overrides = loadStandardCatalogGroupOverrides();
    expect(overrides.water).toBeUndefined();
    expect(overrides.fasting).toBeUndefined();
    expect(resolveCatalogItemGroupKey('healthIntake')).toBe('health');
    expect(resolveCatalogItemGroupKey('fasting')).toBe('health');
    expect(resolveCategoryCatalogIcon('fasting')).toBe('person.fill');
  });

  it('purges legacy good posture flow from catalog and storage', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: BUILTIN_GOOD_POSTURE_FLOW_ID, groupKey: 'health' }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [BUILTIN_GOOD_POSTURE_FLOW_ID]: {
          templateKey: 'reminder',
          displayName: '자세 바르게하기',
        },
      },
      committedCategoryKeys: [BUILTIN_GOOD_POSTURE_FLOW_ID],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      priorityCategoryOrder: [BUILTIN_GOOD_POSTURE_FLOW_ID, 'water'],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_GOOD_POSTURE_FLOW_ID)).toBe(
      false,
    );
    expect(loadGoalDetailCategoryConfig(BUILTIN_GOOD_POSTURE_FLOW_ID)).toBeNull();
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder ?? [],
    ).toEqual(['healthIntake']);
  });

  it('purges legacy intermittent fasting flow from catalog and storage', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: BUILTIN_INTERMITTENT_FASTING_FLOW_ID, groupKey: 'health' }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [BUILTIN_INTERMITTENT_FASTING_FLOW_ID]: {
          templateKey: 'intermittentFasting',
          displayName: '간헐적 단식',
        },
      },
      committedCategoryKeys: [BUILTIN_INTERMITTENT_FASTING_FLOW_ID],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      priorityCategoryOrder: [BUILTIN_INTERMITTENT_FASTING_FLOW_ID, 'water'],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_INTERMITTENT_FASTING_FLOW_ID)).toBe(
      false,
    );
    expect(loadGoalDetailCategoryConfig(BUILTIN_INTERMITTENT_FASTING_FLOW_ID)).toBeNull();
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder ?? [],
    ).toEqual(['healthIntake']);
  });

  it('migrates legacy bundled daily life flow into five separate flows', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID, groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID]: {
          displayName: '일상 생활 루틴',
          checklist: [{ id: 'x', text: '이불 정리', done: false }],
        },
      },
      committedCategoryKeys: [LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      planMode: 'priority',
      priorityCategoryOrder: ['reading', LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID],
    });

    ensureDefaultPriorityCatalog();

    const ids = listCustomFlowCatalogEntries().map((e) => e.id);
    expect(ids).not.toContain(LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID);
    expect(BUILTIN_DAILY_LIFE_FLOW_IDS.every((id) => ids.includes(id))).toBe(true);
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder,
    ).toEqual(['reading', ...BUILTIN_DAILY_LIFE_FLOW_IDS]);
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
    expect(BUILTIN_DAILY_LIFE_FLOW_IDS.every((id) => ids.includes(id))).toBe(true);
    expect(ids).toContain(BUILTIN_ABSTAIN_FLOW_ID);
    expect(ids).toContain(BUILTIN_STRETCHING_FLOW_ID);
    expect(ids).toContain(BUILTIN_FOCUS_FLOW_ID);
    expect(listCustomCatalogGroups().map((g) => g.key)).toEqual([
      BUILTIN_TUTORIAL_GROUP_KEY,
      BUILTIN_DAILY_LIFE_GROUP_KEY,
      BUILTIN_ABSTAIN_GROUP_KEY,
      'customGroup:user01',
    ]);
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

  it('unifies legacy preset_health group into system health group', () => {
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [
        { key: BUILTIN_HEALTH_GROUP_KEY, label: '건강 루틴' },
        { key: BUILTIN_DAILY_LIFE_GROUP_KEY, label: '일상 루틴' },
      ],
    });
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: BUILTIN_INTERMITTENT_FASTING_FLOW_ID, groupKey: BUILTIN_HEALTH_GROUP_KEY }],
    });
    localStorageClient.setJson(StorageKeys.standardCatalogGroupOverrides, {
      overrides: { water: BUILTIN_HEALTH_GROUP_KEY, fasting: BUILTIN_HEALTH_GROUP_KEY },
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups().map((g) => g.key)).not.toContain(BUILTIN_HEALTH_GROUP_KEY);
    expect(resolveCatalogItemGroupKey('water')).toBe('health');
    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_INTERMITTENT_FASTING_FLOW_ID)).toBe(
      false,
    );
  });

  it('migrates legacy habit preset flows to checklist template', () => {
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [BUILTIN_DAILY_LIFE_FLOW_IDS[3]]: {
          templateKey: 'habit',
          displayName: '세수하기',
          summary: '하루를 시작·마무리할 때 깨끗이 씻어요.',
          icon: 'hands.sparkles.fill',
          accentColor: '#14b8a6',
          doneToday: true,
          streakDays: 4,
          recentDoneDateKeys: ['2026-07-08'],
        },
      },
      committedCategoryKeys: [BUILTIN_DAILY_LIFE_FLOW_IDS[3]],
    });

    ensureDefaultPriorityCatalog();

    const washCfg = loadGoalDetailCategoryConfig(BUILTIN_DAILY_LIFE_FLOW_IDS[3]);
    expect((washCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(washCfg?.checklist).toEqual([
      { id: `${BUILTIN_DAILY_LIFE_FLOW_IDS[3]}_item_0`, text: '세수하기', done: true },
    ]);
    expect((washCfg as { doneToday?: boolean }).doneToday).toBeUndefined();
  });

  it('is idempotent and preserves user-added groups', () => {
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [{ key: 'customGroup:user01', label: '나만의 묶음' }],
    });

    ensureDefaultPriorityCatalog();
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toHaveLength(4);
    expect(listCustomFlowCatalogEntries()).toHaveLength(11);
  });
});
