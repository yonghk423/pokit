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

  it('includes goal-detail weekday auto apply keys', () => {
    saveGoalDetailCategoryConfig('planning', { applyWeekdays: [1, 2, 3, 4, 5] });
    const state = { activeSetIds: [], sets: [] };
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([
      'planning',
    ]);
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-04T09:00:00+09:00'))).toEqual([]);
  });

  it('matches custom weekday selection', () => {
    const set = {
      applyRule: 'weekday' as const,
      applyWeekdays: [1, 2],
    };
    expect(isFixedFlowSetMatchedToday(set, new Date('2026-07-06T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetMatchedToday(set, new Date('2026-07-08T09:00:00+09:00'))).toBe(false);
  });

  it('migrates weekday-only scheduled sets into goal detail and keeps daily, weekend, manual', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_daily', 'manual_a'],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 루틴',
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
          name: '주말 루틴',
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

    expect(state.sets.map((set) => set.id)).toEqual(['set_daily', 'set_weekend', 'manual_a']);
    expect(state.activeSetIds).toEqual(['manual_a']);
  });

  it('auto-includes daily preset keys on weekdays', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_daily',
          name: '데일리 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
    });
    expect(collectActiveFixedFlowCategoryKeys(state, new Date('2026-07-01T09:00:00+09:00'))).toEqual([
      'water',
    ]);
  });

  it('matches weekend apply rule for saturday and sunday', () => {
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-04T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-05T09:00:00+09:00'))).toBe(true);
    expect(isFixedFlowSetRuleMatchedToday('weekend', new Date('2026-07-06T09:00:00+09:00'))).toBe(false);
  });
});
