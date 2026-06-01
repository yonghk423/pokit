import {
  getActiveFixedFlowSet,
  normalizeFixedFlowSetsState,
} from './fixedFlowSetsStorage';

describe('fixedFlowSetsStorage', () => {
  it('normalizes sets and picks valid active set', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetId: 'missing',
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
    expect(state.activeSetId).toBe('set_a');
    expect(state.sets[0]?.items).toEqual([{ categoryKey: 'reading', enabled: true }]);
  });

  it('returns null active set when id is missing', () => {
    const state = normalizeFixedFlowSetsState({ activeSetId: null, sets: [] });
    expect(getActiveFixedFlowSet(state)).toBeNull();
  });

  it('returns active set by id', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetId: 'set_b',
      sets: [{ id: 'set_b', name: 'B', items: [{ categoryKey: 'water', enabled: true }] }],
    });
    expect(getActiveFixedFlowSet(state)?.name).toBe('B');
  });
});
