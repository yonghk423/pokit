import { listCustomCatalogGroups } from './customCatalogGroupStorage';
import { listAllCustomFlowCatalogEntries, listCustomFlowCatalogEntries } from './customFlowCatalogStorage';
import {
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_DAILY_CLEAN_FLOW_ID,
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_DAILY_RECYCLE_FLOW_ID,
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_DAILY_LIFE_GROUP_KEY,
  BUILTIN_GOOD_POSTURE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  BUILTIN_FOCUS_FLOW_ID,
  BUILTIN_HEALTH_GROUP_KEY,
  BUILTIN_INTERMITTENT_FASTING_FLOW_ID,
  BUILTIN_POKIT_WEEK_TOUR_FLOW_ID,
  LEGACY_DAILY_LIFE_BUNDLED_FLOW_ID,
} from './defaultPriorityCatalog';
import { loadStandardCatalogGroupOverrides, resolveCatalogItemGroupKey } from './catalogItemGroupStorage';
import { ensureDefaultPriorityCatalog } from './ensureDefaultPriorityCatalog';
import { loadGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';
import { resolveCategoryCatalogIcon } from '@entities/day-plan';

import type { OtherDetailDataConfig } from '@entities/day-plan/lib/goalCategorySessionConfig';

function loadChecklistConfig(key: string): OtherDetailDataConfig {
  const raw = loadGoalDetailCategoryConfig(key);
  expect(raw).toEqual(expect.objectContaining({
    displayName: expect.any(String),
    checklist: expect.any(Array),
  }));
  return raw as OtherDetailDataConfig;
}

describe('ensureDefaultPriorityCatalog', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.customCatalogGroups);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
  });

  it('does not seed the retired quick tour', () => {
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toEqual([]);
    expect(listCustomFlowCatalogEntries()).toEqual([]);
    expect(loadGoalDetailCategoryConfig(BUILTIN_POKIT_WEEK_TOUR_FLOW_ID)).toBeNull();

    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_EXERCISE_FLOW_ID)).toBeNull();
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_bed')).toBeNull();
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_laundry')).toBeNull();
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_wash')).toBeNull();
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_shopping')).toBeNull();
    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_CLEAN_FLOW_ID)).toBeNull();
    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_RECYCLE_FLOW_ID)).toBeNull();

    expect(loadGoalDetailCategoryConfig(BUILTIN_INTERMITTENT_FASTING_FLOW_ID)).toBeNull();

    expect(loadGoalDetailCategoryConfig(BUILTIN_ABSTAIN_FLOW_ID)).toBeNull();
    expect(loadGoalDetailCategoryConfig(BUILTIN_STRETCHING_FLOW_ID)).toBeNull();

    expect(loadGoalDetailCategoryConfig(BUILTIN_FOCUS_FLOW_ID)).toBeNull();

    const overrides = loadStandardCatalogGroupOverrides();
    expect(overrides.water).toBeUndefined();
    expect(overrides.fasting).toBeUndefined();
    expect(resolveCatalogItemGroupKey('healthIntake')).toBe('health');
    expect(resolveCatalogItemGroupKey('fasting')).toBe('health');
    expect(resolveCategoryCatalogIcon('fasting')).toBe('routine:weight');
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

  it('purges retired focus flow from catalog and storage', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: BUILTIN_FOCUS_FLOW_ID, groupKey: 'productivity' }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [BUILTIN_FOCUS_FLOW_ID]: {
          templateKey: 'checklist',
          displayName: '집중하기',
        },
      },
      committedCategoryKeys: [BUILTIN_FOCUS_FLOW_ID],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      priorityCategoryOrder: [BUILTIN_FOCUS_FLOW_ID, 'water'],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_FOCUS_FLOW_ID)).toBe(false);
    expect(loadGoalDetailCategoryConfig(BUILTIN_FOCUS_FLOW_ID)).toBeNull();
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

  it('purges retired focus flow from catalog and storage', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: BUILTIN_FOCUS_FLOW_ID, groupKey: 'productivity' }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [BUILTIN_FOCUS_FLOW_ID]: {
          templateKey: 'checklist',
          displayName: '집중하기',
        },
      },
      committedCategoryKeys: [BUILTIN_FOCUS_FLOW_ID],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      priorityCategoryOrder: [BUILTIN_FOCUS_FLOW_ID, 'water'],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_FOCUS_FLOW_ID)).toBe(false);
    expect(loadGoalDetailCategoryConfig(BUILTIN_FOCUS_FLOW_ID)).toBeNull();
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder ?? [],
    ).toEqual(['healthIntake']);
  });

  it('migrates legacy bundled daily life flow into current daily life flows', () => {
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
    expect(BUILTIN_DAILY_LIFE_FLOW_IDS.every((id) => !ids.includes(id))).toBe(true);
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
    expect(BUILTIN_DAILY_LIFE_FLOW_IDS.every((id) => !ids.includes(id))).toBe(true);
    expect(ids).not.toContain(BUILTIN_ABSTAIN_FLOW_ID);
    expect(ids).not.toContain(BUILTIN_STRETCHING_FLOW_ID);
    expect(ids).not.toContain(BUILTIN_FOCUS_FLOW_ID);
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
        [BUILTIN_DAILY_EXERCISE_FLOW_ID]: {
          templateKey: 'habit',
          displayName: '운동하기',
          summary: '가벼운 스트레칭부터 유산소까지, 오늘 몸을 움직여요.',
          icon: 'figure.run',
          accentColor: '#ef4444',
          doneToday: true,
          streakDays: 4,
          recentDoneDateKeys: ['2026-07-08'],
        },
      },
      committedCategoryKeys: [BUILTIN_DAILY_EXERCISE_FLOW_ID],
    });

    ensureDefaultPriorityCatalog();

    const exerciseCfg = loadChecklistConfig(BUILTIN_DAILY_EXERCISE_FLOW_ID);
    expect(exerciseCfg?.displayName).toBe('주말 러닝');
    expect((exerciseCfg as { templateKey?: string })?.templateKey).toBe('checklist');
    expect(exerciseCfg?.checklist).toEqual([
      { id: `${BUILTIN_DAILY_EXERCISE_FLOW_ID}_item_0`, text: '주말 러닝', done: true },
    ]);
    expect((exerciseCfg as { doneToday?: boolean }).doneToday).toBeUndefined();
  });

  it('purges retired daily life defaults from catalog and storage', () => {
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [
        { id: 'customFlow:preset_daily_bed', groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY },
        { id: 'customFlow:preset_daily_wash', groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY },
        { id: BUILTIN_DAILY_CLEAN_FLOW_ID, groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY },
        { id: BUILTIN_DAILY_RECYCLE_FLOW_ID, groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY },
      ],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        'customFlow:preset_daily_bed': { displayName: '이불정리', checklist: [] },
        'customFlow:preset_daily_wash': { displayName: '세수하기', checklist: [] },
        [BUILTIN_DAILY_CLEAN_FLOW_ID]: { displayName: '청소하기', checklist: [] },
        [BUILTIN_DAILY_RECYCLE_FLOW_ID]: { displayName: '분리수거', checklist: [] },
      },
      committedCategoryKeys: [
        'customFlow:preset_daily_bed',
        'customFlow:preset_daily_wash',
        BUILTIN_DAILY_CLEAN_FLOW_ID,
        BUILTIN_DAILY_RECYCLE_FLOW_ID,
      ],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      priorityCategoryOrder: ['customFlow:preset_daily_bed', 'water'],
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === 'customFlow:preset_daily_bed')).toBe(false);
    expect(listCustomFlowCatalogEntries().some((e) => e.id === 'customFlow:preset_daily_wash')).toBe(false);
    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_DAILY_CLEAN_FLOW_ID)).toBe(false);
    expect(listCustomFlowCatalogEntries().some((e) => e.id === BUILTIN_DAILY_RECYCLE_FLOW_ID)).toBe(false);
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_bed')).toBeNull();
    expect(loadGoalDetailCategoryConfig('customFlow:preset_daily_wash')).toBeNull();
    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_CLEAN_FLOW_ID)).toBeNull();
    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_RECYCLE_FLOW_ID)).toBeNull();
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder ?? [],
    ).toEqual(['healthIntake']);
  });

  it('retires old defaults without erasing saved details or reintroducing them through config recovery', () => {
    const checklist = [{ id: 'kept-item', text: '사용자가 수정한 운동', done: true }];
    localStorageClient.setJson(StorageKeys.customFlowCatalog, { items: [
      { id: BUILTIN_DAILY_EXERCISE_FLOW_ID, groupKey: BUILTIN_DAILY_LIFE_GROUP_KEY },
      { id: 'customFlow:user-kept', groupKey: 'health' },
    ] });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, { byCategory: {
      [BUILTIN_DAILY_EXERCISE_FLOW_ID]: { displayName: '나의 운동', templateKey: 'checklist', checklist },
    }, committedCategoryKeys: [BUILTIN_DAILY_EXERCISE_FLOW_ID] });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, { planMode: 'priority', priorityCategoryOrder: [BUILTIN_DAILY_EXERCISE_FLOW_ID] });
    ensureDefaultPriorityCatalog();
    ensureDefaultPriorityCatalog();
    expect(listAllCustomFlowCatalogEntries().map(entry => entry.id)).toEqual(['customFlow:user-kept']);
    expect(loadGoalDetailCategoryConfig(BUILTIN_DAILY_EXERCISE_FLOW_ID)).toEqual(expect.objectContaining({ displayName: '나의 운동', checklist }));
    expect(localStorageClient.getJson<{ priorityCategoryOrder: string[] }>(StorageKeys.dayPlanDraft)?.priorityCategoryOrder).toEqual([BUILTIN_DAILY_EXERCISE_FLOW_ID]);
  });

  it('restores essential defaults hidden by older versions while keeping optional items hidden', () => {
    localStorageClient.setJson(StorageKeys.hiddenStandardCatalogKeys, { hidden: ['healthIntake', 'reading', 'fasting', BUILTIN_POKIT_WEEK_TOUR_FLOW_ID] });
    ensureDefaultPriorityCatalog();
    expect(localStorageClient.getJson<{ hidden: string[] }>(StorageKeys.hiddenStandardCatalogKeys)?.hidden).toEqual([BUILTIN_POKIT_WEEK_TOUR_FLOW_ID]);
    localStorageClient.removeItem(StorageKeys.hiddenStandardCatalogKeys);
  });

  it('is idempotent and preserves user-added groups', () => {
    localStorageClient.setJson(StorageKeys.customCatalogGroups, {
      groups: [{ key: 'customGroup:user01', label: '나만의 묶음' }],
    });

    ensureDefaultPriorityCatalog();
    ensureDefaultPriorityCatalog();

    expect(listCustomCatalogGroups()).toEqual([{ key: 'customGroup:user01', label: '나만의 묶음' }]);
    expect(listCustomFlowCatalogEntries()).toHaveLength(0);
  });

  it('purges existing time-reminder template routines from catalog and today list', () => {
    const reminderId = 'customFlow:user-reminder';
    localStorageClient.setJson(StorageKeys.customFlowCatalog, {
      items: [{ id: reminderId, groupKey: 'custom' }],
    });
    localStorageClient.setJson(StorageKeys.goalDetailSettings, {
      byCategory: {
        [reminderId]: {
          templateKey: 'reminder',
          displayName: '약 알림',
          reminderItems: [{ time: '09:00', label: '아침' }],
          completedTimes: [],
        },
      },
      committedCategoryKeys: [reminderId],
    });
    localStorageClient.setJson(StorageKeys.dayPlanDraft, {
      planMode: 'priority',
      priorityCategoryOrder: [reminderId, 'reading'],
      prioritySectionsCategoryOrder: [reminderId],
    });
    localStorageClient.setJson(StorageKeys.fixedFlowSets, {
      activeSetIds: [],
      sets: [
        {
          id: 'set_reminder_test',
          name: '테스트',
          applyRule: 'manual',
          items: [
            { categoryKey: reminderId, enabled: true },
            { categoryKey: 'reading', enabled: true },
          ],
        },
      ],
    });
    localStorageClient.setJson(StorageKeys.settings, {
      categoryReminderRules: { [reminderId]: { enabled: true, times: ['09:00'] } },
    });

    ensureDefaultPriorityCatalog();

    expect(listCustomFlowCatalogEntries().some((e) => e.id === reminderId)).toBe(false);
    expect(loadGoalDetailCategoryConfig(reminderId)).toBeNull();
    expect(
      localStorageClient.getJson<{ priorityCategoryOrder?: string[] }>(StorageKeys.dayPlanDraft)
        ?.priorityCategoryOrder,
    ).toEqual(['reading']);
    expect(
      localStorageClient.getJson<{
        sets?: Array<{ id: string; items: Array<{ categoryKey: string }> }>;
      }>(StorageKeys.fixedFlowSets)?.sets?.find((set) => set.id === 'set_reminder_test')?.items.map(
        (item) => item.categoryKey,
      ),
    ).toEqual(['reading']);
    expect(
      localStorageClient.getJson<{ categoryReminderRules?: Record<string, unknown> }>(
        StorageKeys.settings,
      )?.categoryReminderRules,
    ).toEqual({});
  });
});
