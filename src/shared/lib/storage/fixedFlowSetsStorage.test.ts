import {
  collectActiveFixedFlowCategoryKeys,
  getActiveFixedFlowSet,
  normalizeFixedFlowSetsState,
} from './fixedFlowSetsStorage';

describe('fixedFlowSetsStorage', () => {
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
    expect(state.sets[0]?.items).toEqual([{ categoryKey: 'reading', enabled: true }]);
  });

  it('ignores invalid active set ids', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetId: 'missing',
      sets: [{ id: 'set_a', name: 'A', items: [] }],
    });
    expect(state.activeSetIds).toEqual([]);
  });

  it('merges category keys from multiple active sets', () => {
    const state = normalizeFixedFlowSetsState({
      activeSetIds: ['set_a', 'set_b'],
      sets: [
        { id: 'set_a', name: 'A', items: [{ categoryKey: 'water', enabled: true }] },
        {
          id: 'set_b',
          name: 'B',
          items: [
            { categoryKey: 'reading', enabled: true },
            { categoryKey: 'water', enabled: true },
          ],
        },
      ],
    });
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
});
