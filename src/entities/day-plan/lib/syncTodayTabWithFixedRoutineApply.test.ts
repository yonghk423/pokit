import {
  computeSyncTodayTabWithFixedRoutineApply,
  syncPriorityOrderWithAppliedFixedRoutines,
} from './syncTodayTabWithFixedRoutineApply';

describe('syncPriorityOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['water', 'reading', 'study']);

  it('removes inactive fixed-flow keys from order', () => {
    const order = ['water', 'reading', 'study', 'work'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['work']);
  });

  it('keeps routine-catalog-selected fixed-flow keys when not applied today', () => {
    const catalog = new Set(['water']);
    const order = ['water', 'reading', 'work'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed, catalog)).toEqual([
      'water',
      'work',
    ]);
  });

  it('prepends applied keys missing from order', () => {
    const order = ['work'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water', 'reading'], allFixed),
    ).toEqual(['work']);
  });

  it('keeps manual keys and applied fixed keys', () => {
    const order = ['work', 'water', 'reading'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['work', 'water']);
  });
});

describe('computeSyncTodayTabWithFixedRoutineApply', () => {
  const baseInput = {
    priorityCategoryOrder: ['water', 'reading', 'work'],
    priorityMealSlotOverrides: { water: 'morning' as const, reading: 'morning' as const },
    priorityMealSlotLayoutEnabled: true,
    todayAppliedCategoryKeys: [] as string[],
    activeSetIds: [] as string[],
    activeMealSlotsBySetId: {} as Record<string, 'morning'>,
    scheduledMealSlotLayoutEnabled: false,
    routineCatalogSelectionKeys: [] as string[],
    fixedFlowSets: [
      {
        id: 'preset-daily',
        name: '데일리',
        applyRule: 'daily' as const,
        items: [
          { categoryKey: 'water', enabled: true, mealSlot: 'morning' as const },
          { categoryKey: 'reading', enabled: true, mealSlot: 'morning' as const },
        ],
      },
    ],
  };

  it('clears unapplied fixed routine keys and meal slot overrides', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply(baseInput);
    expect(patch).toEqual({
      priorityCategoryOrder: ['work'],
      priorityMealSlotOverrides: {},
    });
  });

  it('strips legacy water from order when user only picked work', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['water', 'work'],
      priorityMealSlotOverrides: {},
      routineCatalogSelectionKeys: ['work'],
      fixedFlowSets: [],
    });
    expect(patch).toEqual({
      priorityCategoryOrder: ['work'],
    });
  });

  it('strips legacy water from order when only water remained', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['water'],
      priorityMealSlotOverrides: {},
      routineCatalogSelectionKeys: [],
      fixedFlowSets: [],
    });
    expect(patch).toEqual({
      priorityCategoryOrder: [],
    });
  });

  it('does not auto-fill meal slot overrides for applied fixed routines', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityMealSlotOverrides: {},
      todayAppliedCategoryKeys: ['healthIntake'],
      fixedFlowSets: [
        {
          id: 'preset-daily',
          name: '데일리',
          applyRule: 'daily' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlot: 'morning' as const },
            { categoryKey: 'reading', enabled: true, mealSlot: 'morning' as const },
          ],
        },
      ],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning'] },
    });
    expect(patch).toEqual({
      priorityCategoryOrder: ['work'],
    });
  });

  it('does not auto-enable layout tab when applied fixed routines have meal slots', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['healthIntake', 'work'],
      priorityMealSlotOverrides: {},
      priorityMealSlotLayoutEnabled: false,
      todayAppliedCategoryKeys: ['healthIntake'],
      fixedFlowSets: [
        {
          id: 'preset-daily',
          name: '데일리',
          applyRule: 'daily' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlot: 'morning' as const },
          ],
        },
      ],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning'] },
      scheduledMealSlotLayoutEnabled: false,
    });
    expect(patch).toBeNull();
  });

  it('keeps draft meal slot override over applied fixed routine default', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['healthIntake', 'work'],
      priorityMealSlotOverrides: { healthIntake: 'lunch' },
      priorityMealSlotLayoutEnabled: true,
      todayAppliedCategoryKeys: ['healthIntake'],
      fixedFlowSets: [
        {
          id: 'preset-daily',
          name: '데일리',
          applyRule: 'daily' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlot: 'morning' as const },
          ],
        },
      ],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning', 'lunch'] },
      scheduledMealSlotLayoutEnabled: true,
    });
    expect(patch).toBeNull();
  });
});
