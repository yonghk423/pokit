import { createDefaultFixedFlowSetsState } from '@shared/lib/storage/defaultFixedFlowSets';
import {
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from '@shared/lib/storage/fixedFlowSetsStorage';

import { useDayPlanDraftStore } from './dayPlanDraftStore';
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
    activeSetId: null,
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
      activeSetId: baseState.activeSetId,
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

  it('adds set and selects it', () => {
    useFixedFlowSetsStore.setState({
      ...baseState,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addSet('주말');
    const state = useFixedFlowSetsStore.getState();
    expect(state.sets.some((s) => s.name === '주말')).toBe(true);
    expect(state.activeSetId).toBeTruthy();
    expect(mockSave).toHaveBeenCalled();
  });

  it('manages categories in active set', () => {
    useFixedFlowSetsStore.setState({
      ...baseState,
      isHydrated: true,
    });
    const activeId = baseState.activeSetId!;
    useFixedFlowSetsStore.getState().addCategoryToSet(activeId, 'water');
    useFixedFlowSetsStore.getState().setCategoryEnabledInSet(activeId, 'water', false);
    const set = useFixedFlowSetsStore.getState().sets.find((s) => s.id === activeId);
    expect(set?.items.find((x) => x.categoryKey === 'water')?.enabled).toBe(false);
    useFixedFlowSetsStore.getState().removeCategoryFromSet(activeId, 'water');
    expect(
      useFixedFlowSetsStore.getState().sets.find((s) => s.id === activeId)?.items,
    ).not.toContainEqual(expect.objectContaining({ categoryKey: 'water' }));
  });

  it('removes set and falls back active id', () => {
    useFixedFlowSetsStore.setState({
      activeSetId: 'set_a',
      sets: [
        { id: 'set_a', name: 'A', items: [] },
        { id: 'set_b', name: 'B', items: [] },
      ],
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetId).toBe('set_b');
  });

  it('hydrates default state when storage is empty', () => {
    mockLoad.mockReturnValue({ activeSetId: null, sets: [] });
    useFixedFlowSetsStore.getState().hydrate();
    expect(useFixedFlowSetsStore.getState().isHydrated).toBe(true);
    expect(useFixedFlowSetsStore.getState().sets.length).toBeGreaterThan(0);
  });

  it('renames set and ignores blank name', () => {
    useFixedFlowSetsStore.setState({
      activeSetId: 'set_a',
      sets: [{ id: 'set_a', name: 'A', items: [] }],
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().renameSet('set_a', '   ');
    expect(useFixedFlowSetsStore.getState().sets[0]?.name).toBe('A');
    useFixedFlowSetsStore.getState().renameSet('set_a', '주중');
    expect(useFixedFlowSetsStore.getState().sets[0]?.name).toBe('주중');
  });

  it('selects set and ignores unknown id', () => {
    useFixedFlowSetsStore.setState({
      activeSetId: 'set_a',
      sets: [
        { id: 'set_a', name: 'A', items: [] },
        { id: 'set_b', name: 'B', items: [] },
      ],
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().selectSet('missing');
    expect(useFixedFlowSetsStore.getState().activeSetId).toBe('set_a');
    useFixedFlowSetsStore.getState().selectSet('set_b');
    expect(useFixedFlowSetsStore.getState().activeSetId).toBe('set_b');
  });

  it('reorders categories in a set', () => {
    const activeId = baseState.activeSetId!;
    useFixedFlowSetsStore.setState({
      ...baseState,
      isHydrated: true,
      sets: [
        {
          id: activeId,
          name: '기본',
          items: [
            { categoryKey: 'reading', enabled: false },
            { categoryKey: 'water', enabled: true },
          ],
        },
      ],
    });
    useFixedFlowSetsStore.getState().setSetOrder(activeId, ['water', 'reading', 'water']);
    const items = useFixedFlowSetsStore.getState().sets[0]?.items ?? [];
    expect(items.map((x) => x.categoryKey)).toEqual(['water', 'reading']);
    expect(items.find((x) => x.categoryKey === 'reading')?.enabled).toBe(false);
  });

  it('supports deprecated active-set helpers', () => {
    useFixedFlowSetsStore.setState({
      ...baseState,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addCategoryToActiveSet('water');
    useFixedFlowSetsStore.getState().setCategoryEnabled('water', false);
    const activeId = baseState.activeSetId!;
    const active = useFixedFlowSetsStore.getState().sets.find((s) => s.id === activeId);
    expect(active?.items.find((x) => x.categoryKey === 'water')?.enabled).toBe(false);
    useFixedFlowSetsStore.getState().setActiveSetOrder(['water']);
    useFixedFlowSetsStore.getState().removeCategoryFromActiveSet('water');
    const after = useFixedFlowSetsStore.getState().sets.find((s) => s.id === activeId);
    expect(after?.items.some((x) => x.categoryKey === 'water')).toBe(false);
  });

  it('auto-names new set when label omitted', () => {
    useFixedFlowSetsStore.setState({
      ...baseState,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addSet();
    expect(useFixedFlowSetsStore.getState().sets.some((s) => s.name.includes('세트'))).toBe(true);
  });
});
