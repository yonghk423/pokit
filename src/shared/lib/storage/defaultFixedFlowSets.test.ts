import { createDefaultFixedFlowSetsState } from './defaultFixedFlowSets';

describe('createDefaultFixedFlowSetsState', () => {
  it('creates three default sets', () => {
    const state = createDefaultFixedFlowSetsState();
    expect(state.sets).toHaveLength(3);
    expect(state.sets.map((s) => s.name)).toEqual(['데일리', '주말', '출근 준비']);
    const weekend = state.sets.find((s) => s.id === 'set_weekend');
    expect(weekend?.items.map((x) => x.categoryKey)).toEqual([
      'reading',
      'study',
      'planning',
      'stretching',
    ]);
    expect(state.activeSetId).toBe('set_daily');
  });

  it('enables all items in each set', () => {
    const state = createDefaultFixedFlowSetsState();
    for (const set of state.sets) {
      expect(set.items.length).toBeGreaterThan(0);
      expect(set.items.every((x) => x.enabled)).toBe(true);
    }
  });
});
