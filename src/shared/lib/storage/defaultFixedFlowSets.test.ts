import { BUILTIN_DAILY_LIFE_FLOW_IDS } from './defaultPriorityCatalog';
import { createDefaultFixedFlowSetsState, mergeBuiltInPresetSets } from './defaultFixedFlowSets';

describe('createDefaultFixedFlowSetsState', () => {
  it('creates daily, weekend, fasting, water, daily life, and abstain preset sets', () => {
    const state = createDefaultFixedFlowSetsState();
    expect(state.sets).toHaveLength(6);
    expect(state.sets.map((s) => s.name)).toEqual([
      '데일리 루틴',
      '주말 루틴',
      '체중조절',
      '수분 섭취',
      '일상 루틴',
      '금지 루틴',
    ]);
    expect(state.sets.map((s) => s.applyRule)).toEqual([
      'daily',
      'weekend',
      'daily',
      'daily',
      'daily',
      'daily',
    ]);
    const daily = state.sets.find((s) => s.id === 'set_daily');
    expect(daily?.items.map((x) => x.categoryKey)).toEqual([
      'healthIntake',
      'reading',
      'work',
    ]);
    const weekend = state.sets.find((s) => s.id === 'set_weekend');
    expect(weekend?.items.map((x) => x.categoryKey)).toEqual(['reading']);
    const fasting = state.sets.find((s) => s.id === 'set_fasting');
    expect(fasting?.items.map((x) => x.categoryKey)).toEqual(['fasting']);
    const water = state.sets.find((s) => s.id === 'set_water');
    expect(water?.items.map((x) => x.categoryKey)).toEqual(['water']);
    const dailyLife = state.sets.find((s) => s.id === 'set_daily_life');
    expect(dailyLife?.items.map((x) => x.categoryKey)).toEqual([...BUILTIN_DAILY_LIFE_FLOW_IDS]);
    const abstain = state.sets.find((s) => s.id === 'set_abstain');
    expect(abstain?.items.map((x) => x.categoryKey)).toEqual(['customFlow:preset_abstain']);
    expect(state.activeSetIds).toEqual([]);
  });

  it('merges missing built-in preset sets into stored state', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [{ categoryKey: 'reading', enabled: true }],
      },
    ]);
    expect(merged.map((set) => set.id)).toEqual([
      'set_daily',
      'set_weekend',
      'set_fasting',
      'set_water',
      'set_daily_life',
      'set_abstain',
    ]);
    expect(merged.find((set) => set.id === 'set_fasting')?.items[0]?.categoryKey).toBe('fasting');
    expect(merged.find((set) => set.id === 'set_water')?.items[0]?.categoryKey).toBe('water');
  });
});
