import { createDefaultFixedFlowSetsState, mergeBuiltInPresetSets } from './defaultFixedFlowSets';

describe('createDefaultFixedFlowSetsState', () => {
  it('creates daily and weekend preset sets only', () => {
    const state = createDefaultFixedFlowSetsState();
    expect(state.sets).toHaveLength(2);
    expect(state.sets.map((s) => s.name)).toEqual(['데일리 루틴', '주말 루틴']);
    expect(state.sets.map((s) => s.applyRule)).toEqual(['daily', 'weekend']);
    const daily = state.sets.find((s) => s.id === 'set_daily');
    expect(daily?.items.map((x) => x.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
      'customFlow:preset_daily_clean',
    ]);
    const weekend = state.sets.find((s) => s.id === 'set_weekend');
    expect(weekend?.items.map((x) => x.categoryKey)).toEqual(['reading']);
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
    expect(merged.map((set) => set.id)).toEqual(['set_daily', 'set_weekend']);
    expect(merged.find((set) => set.id === 'set_weekend')?.items[0]?.categoryKey).toBe('reading');
  });

  it('migrates legacy daily default items to the new preset', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [
          { categoryKey: 'healthIntake', enabled: true },
          { categoryKey: 'reading', enabled: true },
          { categoryKey: 'work', enabled: true },
        ],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_daily')?.items.map((item) => item.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
      'customFlow:preset_daily_clean',
    ]);
  });

  it('keeps customized daily items when legacy defaults were changed', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [
          { categoryKey: 'healthIntake', enabled: true },
          { categoryKey: 'reading', enabled: true },
        ],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_daily')?.items.map((item) => item.categoryKey)).toEqual([
      'healthIntake',
      'reading',
    ]);
  });
});
