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

jest.mock('./dayPlanDraftStore', () => ({
  useDayPlanDraftStore: {
    getState: () => ({ bumpPriorityCatalogFixedRoutineEpoch: jest.fn() }),
  },
}));

const mockLoad = loadFixedFlowSetsState as jest.MockedFunction<typeof loadFixedFlowSetsState>;
const mockSave = saveFixedFlowSetsState as jest.MockedFunction<typeof saveFixedFlowSetsState>;

const baseState = createDefaultFixedFlowSetsState();

function resetStore() {
  useFixedFlowSetsStore.setState({
    activeSetIds: [],
    sets: [],
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
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addSet('주말');
    const state = useFixedFlowSetsStore.getState();
    expect(state.sets.some((s) => s.name === '주말')).toBe(true);
    expect(state.activeSetIds).toEqual([]);
    expect(mockSave).toHaveBeenCalled();
  });

  it('toggles multiple sets for today', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [
        { id: 'set_a', name: 'A', items: [] },
        { id: 'set_b', name: 'B', items: [] },
      ],
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
        { id: 'set_a', name: 'A', items: [] },
        { id: 'set_b', name: 'B', items: [] },
      ],
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_b']);
  });

  it('hydrates default state when storage is empty', () => {
    mockLoad.mockReturnValue({ activeSetIds: [], sets: [] });
    useFixedFlowSetsStore.getState().hydrate();
    expect(useFixedFlowSetsStore.getState().isHydrated).toBe(true);
    expect(useFixedFlowSetsStore.getState().sets.length).toBeGreaterThan(0);
  });
});
