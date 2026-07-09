import {
  computeSyncTodayTabWithFixedRoutineApply,
  mergeOrderWithAppliedFixedRoutines,
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

  it('keeps manual keys and applied fixed keys', () => {
    const order = ['work', 'water', 'reading'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['work', 'water']);
  });
});

describe('mergeOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['healthIntake', 'fasting', 'reading']);

  it('appends applied keys missing from order', () => {
    const order = ['work'];
    expect(
      mergeOrderWithAppliedFixedRoutines(order, ['healthIntake', 'fasting'], allFixed),
    ).toEqual(['work', 'healthIntake', 'fasting']);
  });
});

describe('computeSyncTodayTabWithFixedRoutineApply', () => {
  const baseInput = {
    priorityCategoryOrder: ['water', 'reading', 'work'],
    priorityMealSlotOverrides: { water: 'morning' as const, reading: 'morning' as const },
    prioritySectionsCategoryOrder: [] as string[],
    prioritySectionsMealSlots: {} as Record<string, 'morning'>,
    priorityStart: '09:00',
    priorityEnd: '22:00',
    planBlocks: [] as import('../model/types').DayPlanBlock[],
    priorityMealSlotLayoutEnabled: true,
    todayAppliedCategoryKeys: [] as string[],
    activeSetIds: [] as string[],
    activeMealSlotsBySetId: {} as Record<string, 'morning'>,
    scheduledMealSlotLayoutEnabled: false,
    fixedRoutineApplyLayoutMode: 'bag' as const,
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

  it('clears unapplied fixed routine keys and meal slot overrides in bag mode', () => {
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

  it('adds applied fixed routines to sections order with meal slots', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: ['work'],
      prioritySectionsCategoryOrder: [],
      prioritySectionsMealSlots: {},
      priorityMealSlotOverrides: {},
      todayAppliedCategoryKeys: ['healthIntake', 'fasting'],
      fixedFlowSets: [
        {
          id: 'set_example_health',
          name: '건강',
          applyRule: 'manual' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlot: 'dawn' as const },
            { categoryKey: 'fasting', enabled: true, mealSlot: 'morning' as const },
          ],
        },
      ],
      activeSetIds: ['set_example_health'],
      activeMealSlotsBySetId: {},
    });
    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['healthIntake', 'fasting'],
      prioritySectionsMealSlots: {
        healthIntake: ['dawn'],
        fasting: ['morning'],
      },
    });
  });

  it('does not auto-fill meal slot overrides for applied fixed routines in sections mode', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
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
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: {
        healthIntake: ['morning'],
      },
    });
  });

  it('does not auto-enable layout tab when applied fixed routines have meal slots', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: ['healthIntake', 'work'],
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: { healthIntake: ['morning'] },
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

  it('keeps draft meal slot override over applied fixed routine default in sections mode', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: ['healthIntake', 'work'],
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: { healthIntake: ['lunch'] },
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
    expect(patch).toEqual({
      prioritySectionsMealSlots: {
        healthIntake: ['morning'],
      },
    });
  });

  it('adds applied fixed routines to spine timeline blocks in spine mode', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      priorityCategoryOrder: ['work'],
      todayAppliedCategoryKeys: ['healthIntake', 'fasting'],
      fixedFlowSets: [
        {
          id: 'set_example_health',
          name: '건강',
          applyRule: 'manual' as const,
          items: [
            {
              categoryKey: 'healthIntake',
              enabled: true,
              spineStartMinutes: 9 * 60,
              spineEndMinutes: 9 * 60 + 30,
            },
            {
              categoryKey: 'fasting',
              enabled: true,
              spineStartMinutes: 10 * 60,
              spineEndMinutes: 10 * 60 + 30,
            },
          ],
        },
      ],
      activeSetIds: ['set_example_health'],
    });
    expect(patch?.planBlocks).toHaveLength(2);
    expect(patch?.planBlocks?.map((block) => block.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
    ]);
    expect(patch?.priorityCategoryOrder).toBeUndefined();
  });
});
