import { createDefaultFixedFlowSetsState } from './defaultFixedFlowSets';

describe('createDefaultFixedFlowSetsState', () => {
  it('creates daily and weekend preset sets', () => {
    const state = createDefaultFixedFlowSetsState();
    expect(state.sets).toHaveLength(2);
    expect(state.sets.map((s) => s.name)).toEqual(['데일리 루틴', '주말 루틴']);
    expect(state.sets.map((s) => s.applyRule)).toEqual(['daily', 'weekend']);
    const daily = state.sets.find((s) => s.id === 'set_daily');
    expect(daily?.items.map((x) => x.categoryKey)).toEqual([
      'healthIntake',
      'reading',
      'work',
    ]);
    const weekend = state.sets.find((s) => s.id === 'set_weekend');
    expect(weekend?.items.map((x) => x.categoryKey)).toEqual([
      'fasting',
      'reading',
    ]);
    expect(state.activeSetIds).toEqual([]);
  });
});
