import { createDefaultFixedFlowSetsState, createBuiltinExampleCustomFlowSets } from '@shared/lib/storage/defaultFixedFlowSets';
import {
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from '@shared/lib/storage/fixedFlowSetsStorage';
import {
  appendRoutineCatalogSelectionKeys,
  loadRoutineCatalogSelectionKeys,
  saveRoutineCatalogSelectionKeys,
} from '@shared/lib/storage/priorityCatalogFixedRoutinesStorage';

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
    activeMealSlotsBySetId: {},
    activeSetIdsByLayoutMode: { bag: [], sections: [], spine: [] },
    activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
    sets: [],
    scheduledMealSlotLayoutEnabled: false,
    dismissedExampleCustomFlowSetIds: [],
    fixedRoutineApplyLayoutMode: 'bag',
    todayAppliedCategoryKeys: [],
    todayAppliedRevision: 0,
    isHydrated: false,
  });
}

describe('fixedFlowSetsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoad.mockReturnValue(baseState);
    saveRoutineCatalogSelectionKeys([]);
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

  it('removes builtin example custom sets and remembers dismissal', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [
        ...baseState.sets,
        ...createBuiltinExampleCustomFlowSets(),
      ],
      dismissedExampleCustomFlowSetIds: [],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_example_health');
    expect(useFixedFlowSetsStore.getState().sets.some((s) => s.id === 'set_example_health')).toBe(false);
    expect(useFixedFlowSetsStore.getState().dismissedExampleCustomFlowSetIds).toEqual(['set_example_health']);
  });

  it('stores mealSlot when adding to a custom set', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [{ id: 'set_a', name: 'A', applyRule: 'manual', items: [] }],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().addCategoryToSet('set_a', 'reading', 'night');
    expect(useFixedFlowSetsStore.getState().sets[0]?.items[0]).toEqual({
      categoryKey: 'reading',
      enabled: true,
      mealSlot: 'night',
      mealSlots: ['night'],
    });
  });

  it('toggles multiple meal slots on one item', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [{ categoryKey: 'reading', enabled: true, mealSlots: ['dinner'] }],
        },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().toggleCategoryMealSlotInSet('set_a', 'reading', 'night');
    expect(useFixedFlowSetsStore.getState().sets[0]?.items[0]?.mealSlots).toEqual(['dinner', 'night']);
    useFixedFlowSetsStore.getState().toggleCategoryMealSlotInSet('set_a', 'reading', 'dinner');
    expect(useFixedFlowSetsStore.getState().sets[0]?.items[0]?.mealSlots).toEqual(['night']);
  });

  it('removes manual-selection protection when a fixed routine item is disabled', () => {
    appendRoutineCatalogSelectionKeys(['healthIntake']);
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a'],
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [{ categoryKey: 'healthIntake', enabled: true, mealSlots: ['morning'] }],
        },
      ],
      todayAppliedCategoryKeys: ['healthIntake'],
      todayAppliedRevision: 0,
      isHydrated: true,
    });

    useFixedFlowSetsStore
      .getState()
      .setCategoryEnabledInSet('set_a', 'healthIntake', false);

    expect(loadRoutineCatalogSelectionKeys()).not.toContain('healthIntake');
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).not.toContain(
      'healthIntake',
    );
  });

  it('clears catalog selection protection when unapplying a set', () => {
    appendRoutineCatalogSelectionKeys(['healthIntake', 'fasting']);
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a'],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: ['set_a'], sections: [], spine: [] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      fixedRoutineApplyLayoutMode: 'bag',
      sets: [
        {
          id: 'set_a',
          name: '건강 루틴 예시',
          applyRule: 'manual',
          items: [
            { categoryKey: 'healthIntake', enabled: true },
            { categoryKey: 'fasting', enabled: true },
          ],
        },
      ],
      todayAppliedCategoryKeys: ['healthIntake', 'fasting'],
      todayAppliedRevision: 0,
      isHydrated: true,
    });

    useFixedFlowSetsStore.getState().toggleSetForToday('set_a', 'bag');

    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual([]);
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual([]);
    expect(loadRoutineCatalogSelectionKeys()).not.toContain('healthIntake');
    expect(loadRoutineCatalogSelectionKeys()).not.toContain('fasting');
  });

  it('removes unapplied set items from today bag order even if catalog protected them', () => {
    const { useDayPlanDraftStore } = require('./dayPlanDraftStore') as typeof import('./dayPlanDraftStore');
    const { useDayPlanStore } = require('./dayPlanStore') as typeof import('./dayPlanStore');

    appendRoutineCatalogSelectionKeys(['healthIntake', 'fasting']);
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      isHydrated: true,
      priorityMealSlotLayoutEnabled: false,
      prioritySpineLayoutEnabled: false,
      priorityCategoryOrder: ['healthIntake', 'fasting'],
      prioritySectionsCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsMealSlots: {},
      priorityStart: '09:00',
      priorityEnd: '22:00',
    });
    useDayPlanStore.setState({
      ...useDayPlanStore.getState(),
      isHydrated: true,
      blocks: [],
    });
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a'],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: ['set_a'], sections: [], spine: [] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      fixedRoutineApplyLayoutMode: 'bag',
      sets: [
        {
          id: 'set_a',
          name: '건강 루틴 예시',
          applyRule: 'manual',
          items: [
            { categoryKey: 'healthIntake', enabled: true },
            { categoryKey: 'fasting', enabled: true },
          ],
        },
      ],
      todayAppliedCategoryKeys: ['healthIntake', 'fasting'],
      todayAppliedRevision: 0,
      isHydrated: true,
    });

    useFixedFlowSetsStore.getState().toggleSetForToday('set_a', 'bag');

    expect(useDayPlanDraftStore.getState().priorityCategoryOrder).toEqual([]);
  });

  it('keeps catalog selection for keys still applied by another set', () => {
    appendRoutineCatalogSelectionKeys(['healthIntake']);
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a', 'set_b'],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: ['set_a', 'set_b'], sections: [], spine: [] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      fixedRoutineApplyLayoutMode: 'bag',
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [{ categoryKey: 'healthIntake', enabled: true }],
        },
        {
          id: 'set_b',
          name: 'B',
          applyRule: 'manual',
          items: [{ categoryKey: 'healthIntake', enabled: true }],
        },
      ],
      todayAppliedCategoryKeys: ['healthIntake'],
      todayAppliedRevision: 0,
      isHydrated: true,
    });

    useFixedFlowSetsStore.getState().toggleSetForToday('set_a', 'bag');

    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_b']);
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual(['healthIntake']);
    expect(loadRoutineCatalogSelectionKeys()).toContain('healthIntake');
  });

  it('pins empty morning slot when adding to preset set', () => {
    useFixedFlowSetsStore.setState({
      sets: [
        {
          id: 'set_daily',
          name: '데일리 고정 루틴',
          applyRule: 'daily',
          items: [{ categoryKey: 'healthIntake', enabled: true, mealSlot: 'dawn' }],
        },
      ],
      activeSetIds: [],
      activeMealSlotsBySetId: {},
      scheduledMealSlotLayoutEnabled: false,
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().pinMealSlotInSet('set_daily', 'morning');
    const daily = useFixedFlowSetsStore.getState().sets.find((s) => s.id === 'set_daily');
    expect(daily?.pinnedMealSlots).toEqual(['morning']);
  });

  it('keeps fixed routine apply independent per layout mode', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: [],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: [], sections: [], spine: [] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      fixedRoutineApplyLayoutMode: 'bag',
      sets: [
        {
          id: 'set_a',
          name: 'A',
          applyRule: 'manual',
          items: [{ categoryKey: 'reading', enabled: true }],
        },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });

    useFixedFlowSetsStore.getState().toggleSetForToday('set_a', 'spine');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_a']);
    expect(useFixedFlowSetsStore.getState().fixedRoutineApplyLayoutMode).toBe('spine');
    expect(useFixedFlowSetsStore.getState().activeSetIdsByLayoutMode).toEqual({
      bag: [],
      sections: [],
      spine: ['set_a'],
    });
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual(['reading']);

    useFixedFlowSetsStore.getState().setFixedRoutineApplyLayoutMode('bag');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual([]);
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual([]);
    expect(useFixedFlowSetsStore.getState().activeSetIdsByLayoutMode.spine).toEqual(['set_a']);

    useFixedFlowSetsStore.getState().setFixedRoutineApplyLayoutMode('spine');
    expect(useFixedFlowSetsStore.getState().activeSetIds).toEqual(['set_a']);
    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual(['reading']);
  });

  it('removes set from every layout mode active list', () => {
    useFixedFlowSetsStore.setState({
      activeSetIds: ['set_a'],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: ['set_a'], sections: ['set_a'], spine: ['set_b'] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      fixedRoutineApplyLayoutMode: 'bag',
      sets: [
        { id: 'set_a', name: 'A', applyRule: 'manual', items: [] },
        { id: 'set_b', name: 'B', applyRule: 'manual', items: [] },
      ],
      todayAppliedCategoryKeys: [],
      todayAppliedRevision: 0,
      isHydrated: true,
    });
    useFixedFlowSetsStore.getState().removeSet('set_a');
    expect(useFixedFlowSetsStore.getState().activeSetIdsByLayoutMode).toEqual({
      bag: [],
      sections: [],
      spine: ['set_b'],
    });
    expect(useFixedFlowSetsStore.getState().sets.map((s) => s.id)).toEqual(['set_b']);
  });
});
