import {
  collectActiveFixedFlowCategoryKeys,
  getActiveFixedFlowSet,
  isFixedFlowSetMatchedToday,
  isFixedFlowSetRuleMatchedToday,
  normalizeFixedFlowSetsState,
} from './fixedFlowSetsStorage';
import { saveGoalDetailCategoryConfig } from './goalDetailSettingsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('fixedFlowSetsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.fixedFlowSets);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
  });

  it('normalizes sets and migrates legacy activeSetId to activeSetIds', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetId: 'set_a',
      sets: [
        {
          id: 'set_a',
          name: 'A',
          items: [
            { categoryKey: 'reading', enabled: true },
            { categoryKey: 'reading', enabled: false },
          ],
        },
      ],
    });
    expect(state.activeSetIds).toEqual(['set_a']);
    expect(state.sets.find((set) => set.id === 'set_a')?.items).toEqual([
      { categoryKey: 'reading', enabled: true },
    ]);
  });

  it('ignores invalid active set ids', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetId: 'missing',
      sets: [{ id: 'set_a', name: 'A', items: [] }],
    });
    expect(state.activeSetIds).toEqual([]);
  });

  it('keeps a next-day end later than its start clock time', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_a',
          name: 'A',
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 7 * 60,
              spineEndMinutes: 7 * 60 + 30,
              spineEndsNextCalendarDay: true,
            },
          ],
        },
      ],
    });

    expect(state.sets.find((set) => set.id === 'set_a')?.items[0]).toEqual({
      categoryKey: 'reading',
      enabled: true,
      spineStartMinutes: 7 * 60,
      spineEndMinutes: 7 * 60 + 30,
      spineEndsNextCalendarDay: true,
    });
  });

  it('merges category keys from multiple active manual sets', () => {
    const state = {
      activeSetIds: ['set_a', 'set_b'],
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual' as const, items: [{ categoryKey: 'water', enabled: true }] },
        {
          id: 'set_b',
          name: 'B',
          applyRule: 'manual' as const,
          items: [
            { categoryKey: 'reading', enabled: true },
            { categoryKey: 'water', enabled: true },
          ],
        },
      ],
    };
    expect(collectActiveFixedFlowCategoryKeys(state)).toEqual(['water', 'reading']);
  });

  it('returns first active set for legacy getter', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_b', 'set_a'],
      sets: [
        { id: 'set_a', name: 'A', items: [] },
        { id: 'set_b', name: 'B', items: [] },
      ],
    });
    expect(getActiveFixedFlowSet(state)?.id).toBe('set_a');
  });

  it('does not auto-include goal-detail weekday keys without active apply', () => {
    saveGoalDetailCategoryConfig('planning', { applyWeekdays: [1, 2, 3, 4, 5] });
    const state = { activeSetIds: [], sets: [] };
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([]);
  });

  it('matches custom weekday selection', () => {
    const set = {
      applyRule: 'weekday' as const,
      applyWeekdays: [1, 2],
    };
    expect(isFixedFlowSetMatchedToday(set, new Date('2026-07-06T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetMatchedToday(set, new Date('2026-07-08T09:00:00+09:00'))).toBe(false);
  });

  it('removes weekday-only scheduled sets and keeps daily, weekend, manual', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_daily', 'manual_a'],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
        {
          id: 'manual_a',
          name: '내 그룹',
          applyRule: 'manual',
          items: [{ categoryKey: 'reading', enabled: true }],
        },
        {
          id: 'set_weekend',
          name: '주말 고정 루틴',
          applyRule: 'weekend',
          items: [{ categoryKey: 'journal', enabled: true }],
        },
        {
          id: 'set_always',
          name: '요일별 루틴',
          applyRule: 'always',
          items: [{ categoryKey: 'planning', enabled: true }],
        },
      ],
    });

    expect(state.sets.map((set) => set.id)).toEqual([
      'set_daily',
      'set_weekend',
      'set_example_health',
      'set_example_focus',
      'manual_a',
    ]);
    expect(state.activeSetIds).toEqual(['set_daily', 'manual_a']);
  });

  it('renames legacy 기본 세트 to 예시 세트 and seeds example items when empty', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: [],
      sets: [
        {
          id: 'default',
          name: '기본 세트',
          applyRule: 'manual',
          items: [],
        },
      ],
    });

    const exampleSet = state.sets.find((set) => set.id === 'set_example_health');
    expect(exampleSet?.name).toBe('건강 루틴 예시');
    expect(exampleSet?.items.map((item) => item.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
      'customFlow:preset_daily_clean',
    ]);
    expect(state.sets.find((set) => set.id === 'set_example_focus')?.name).toBe('집중 루틴 예시');
  });

  it('always includes two builtin example custom flow sets', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'reading', enabled: true }],
        },
      ],
    });

    expect(state.sets.map((set) => set.id)).toEqual([
      'set_daily',
      'set_weekend',
      'set_example_health',
      'set_example_focus',
    ]);
    expect(state.sets.find((set) => set.id === 'set_example_focus')?.items.map((item) => item.categoryKey)).toEqual([
      'customFlow:preset_stretching',
      'customFlow:preset_abstain',
    ]);
  });

  it('removes legacy built-in preset sets (fasting, water, daily life, abstain)', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_water', 'set_daily'],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'reading', enabled: true }],
        },
        {
          id: 'set_water',
          name: '수분 섭취',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
        {
          id: 'set_fasting',
          name: '체중조절',
          applyRule: 'daily',
          items: [{ categoryKey: 'fasting', enabled: true }],
        },
      ],
    });

    expect(state.sets.map((set) => set.id)).toEqual([
      'set_daily',
      'set_weekend',
      'set_example_health',
      'set_example_focus',
    ]);
    expect(state.activeSetIds).toEqual(['set_daily']);
  });

  it('includes daily preset keys only when toggled on for today', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_daily'],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
    });
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([
      'water',
    ]);
  });

  it('does not include daily preset keys when not toggled on', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
    });
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([]);
  });

  it('matches weekend apply rule for saturday and sunday', () => {
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-04T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-05T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-06T09:00:00+09:00'))).toBe(false);
  });

  it('includes weekend preset keys only on weekend when toggled on', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_weekend'],
      sets: [
        {
          id: 'set_weekend',
          name: '주말 고정 루틴',
          applyRule: 'weekend',
          items: [
            { categoryKey: 'customFlow:preset_daily_exercise', enabled: true },
            { categoryKey: 'healthIntake', enabled: true },
          ],
        },
      ],
    });
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-06T09:00:00+09:00'))).toEqual([]);
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-04T09:00:00+09:00'))).toEqual([
      'customFlow:preset_daily_exercise',
      'healthIntake',
    ]);
  });

  it('collects preset keys by individually applied meal slots', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_daily'],
      activeMealSlotsBySetId: { set_daily: ['morning'] },
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [
            { categoryKey: 'water', enabled: true, mealSlot: 'morning' },
            { categoryKey: 'deepwork', enabled: true, mealSlot: 'lunch' },
          ],
        },
      ],
    });
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([
      'water',
    ]);
  });

  it('seeds legacy activeSetIds into the current layout mode only', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_a'],
      fixedRoutineApplyLayoutMode: 'spine',
      sets: [{ id: 'set_a', name: 'A', applyRule: 'manual', items: [] }],
    });
    expect(state.activeSetIdsByLayoutMode).toEqual({
      bag: [],
      sections: [],
      spine: ['set_a'],
    });
    expect(state.activeSetIds).toEqual(['set_a']);
  });

  it('keeps per-layout-mode activeSetIds independent when present', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_a'],
      fixedRoutineApplyLayoutMode: 'spine',
      fixedRoutinePerModeApplyMigrated: true,
      activeSetIdsByLayoutMode: {
        bag: [],
        sections: ['set_b'],
        spine: ['set_a'],
      },
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual', items: [] },
        { id: 'set_b', name: 'B', applyRule: 'manual', items: [] },
      ],
    });
    expect(state.activeSetIds).toEqual(['set_a']);
    expect(state.activeSetIdsByLayoutMode).toEqual({
      bag: [],
      sections: ['set_b'],
      spine: ['set_a'],
    });
  });

  it('splits identical per-mode apply into the current mode once', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_a'],
      fixedRoutineApplyLayoutMode: 'spine',
      activeSetIdsByLayoutMode: {
        bag: ['set_a'],
        sections: ['set_a'],
        spine: ['set_a'],
      },
      sets: [{ id: 'set_a', name: 'A', applyRule: 'manual', items: [] }],
    });
    expect(state.activeSetIdsByLayoutMode).toEqual({
      bag: [],
      sections: [],
      spine: ['set_a'],
    });
    expect(state.fixedRoutinePerModeApplyMigrated).toBe(true);
  });
});
