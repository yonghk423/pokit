import { createDefaultFixedFlowSetsState } from '@shared/lib/storage/defaultFixedFlowSets';
import {
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from '@shared/lib/storage/fixedFlowSetsStorage';

import { useFixedFlowSetsStore } from './fixedFlowSetsStore';

jest.mock('@shared/lib/storage/fixedFlowSetsStorage', () => {
  const actual = jest.requireActual('@shared/lib/storage/fixedFlowSetsStorage');
  return {
    ...actual,
    loadFixedFlowSetsState: jest.fn(),
    saveFixedFlowSetsState: jest.fn(),
  };
});

const mockLoad = loadFixedFlowSetsState as jest.MockedFunction<typeof loadFixedFlowSetsState>;
const mockSave = saveFixedFlowSetsState as jest.MockedFunction<typeof saveFixedFlowSetsState>;

const baseState = createDefaultFixedFlowSetsState();

function resetStore() {
  useFixedFlowSetsStore.setState({
    activeSetIds: [],
    sets: [],
    scheduledMealSlotLayoutEnabled: false,
    todayAppliedCategoryKeys: [],
    todayAppliedRevision: 0,
    isHydrated: false,
  });
}

describe('fixedFlowSetsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockReturnValue(baseState);
    resetStore();
  });

  it('hydrates and sanitizes catalog keys', () => {
    mockLoad.mockReturnValue({
      activeSetIds: [],
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [
            { categoryKey: 'reading', enabled: true },
            { categoryKey: 'invalid_key_xyz', enabled: true },
          ],
        },
      ],
    });
    useFixedFlowSetsStore.getState().hydrate();
    expect(useFixedFlowSetsStore.getState().isHydrated).toBe(true);
    expect(useFixedFlowSetsStore.getState().sets[0]?.items.map((x) => x.categoryKey)).toEqual([
      'reading',
    ]);
    expect(mockSave).toHaveBeenCalled();
  });

  it('adds set without auto applying to today', () => {
    useFixedFlowSetsStore.setState({
      ...baseState,
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addSet('주말');
    const state = useFixedFlowSetsStore.getState();
    expect(state.sets.some((s) => s.name === '주말')).toBe(true);
    expect(state.activeSetIds).toEqual([]);
    expect(mockSave).toHaveBeenCalled();
  });

  it('updates todayAppliedCategoryKeys when toggling set for today', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [{ categoryKey: 'water', enabled: true }],
        },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().toggleSetForToday('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_a']);
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual(['water']);
    expect(useFixedFlowSetsStore.getState().todayAppliedRevision).toBeGreaterThan(0);
  });

  it('toggles multiple sets for today', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual', items: [] },
        { id: 'set_b', name: 'B', applyRule: 'manual', items: [] },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().toggleSetForToday('set_a');
    useFixedFlowSetsStore.getState().toggleSetForToday('set_b');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_a', 'set_b']);
    useFixedFlowSetsStore.getState().toggleSetForToday('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_b']);
  });

  it('removes set and drops it from active ids', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a', 'set_b'],
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual', items: [] },
        { id: 'set_b', name: 'B', applyRule: 'manual', items: [] },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_b']);
  });

  it('does not remove built-in preset sets', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: baseState.sets,
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_daily');
    expect(useFixedFlowSetsStore.getState().sets.some((s) => s.id === 'set_daily')).toBe(true);
  });

  it('stores mealSlot when adding to a custom set', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [{ id: 'set_a', name: 'A', applyRule: 'manual', items: [] }],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addCategoryToSet('set_a', 'water', 'night');
    expect(useFixedFlowSetsStore.getState().sets[0]?.items[0]).toEqual({
      categoryKey: 'water',
      enabled: true,
      mealSlot: 'night',
    });
  });
});
