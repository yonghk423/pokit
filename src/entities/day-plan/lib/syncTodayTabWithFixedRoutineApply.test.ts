import {
  computeSyncTodayTabWithFixedRoutineApply,
  mergeOrderWithAppliedFixedRoutines,
  syncPriorityOrderWithAppliedFixedRoutines,
} from './syncTodayTabWithFixedRoutineApply';

describe('syncPriorityOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['water', 'reading', 'study']);

  it('removes inactive fixed-flow keys from order', () => {
    const order = ['water', 'reading', 'study', 'healthIntake'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['healthIntake']);
  });

  it('keeps routine-catalog-selected fixed-flow keys when not applied today', () => {
    const catalog = new Set(['water']);
    const order = ['water', 'reading', 'healthIntake'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed, catalog)).toEqual([
      'water',
      'healthIntake',
    ]);
  });

  it('keeps manual keys and applied fixed keys', () => {
    const order = ['healthIntake', 'water', 'reading'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['healthIntake', 'water']);
  });
});

describe('mergeOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['healthIntake', 'fasting', 'reading']);

  it('appends applied keys missing from order', () => {
    const order: string[] = [];
    expect(
      mergeOrderWithAppliedFixedRoutines(order, ['healthIntake', 'fasting'], allFixed),
    ).toEqual(['healthIntake', 'fasting']);
  });

  it('preserves manually repeated routine occurrences during fixed-routine sync', () => {
    const repeated = 'reading::instance:second';
    expect(
      mergeOrderWithAppliedFixedRoutines(
        ['reading', repeated],
        ['reading'],
        allFixed,
      ),
    ).toEqual(['reading', repeated]);
  });
});

describe('computeSyncTodayTabWithFixedRoutineApply', () => {
  const baseInput = {
    priorityCategoryOrder: ['water', 'reading', 'healthIntake'],
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
      priorityCategoryOrder: ['healthIntake'],
      priorityMealSlotOverrides: {},
    });
  });

  it('strips legacy water from order when user only picked healthIntake', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['water', 'healthIntake'],
      priorityMealSlotOverrides: {},
      routineCatalogSelectionKeys: ['healthIntake'],
      fixedFlowSets: [],
    });
    expect(patch).toEqual({
      priorityCategoryOrder: ['healthIntake'],
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

  it('removes fixed routine sections with stale meal slots until apply is clicked', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'healthIntake'],
      prioritySectionsMealSlots: { reading: ['morning'] },
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: [],
    });
    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: {},
    });
  });

  it('clears unapplied fixed routine keys from sections order when they have no meal slot', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'healthIntake'],
      prioritySectionsMealSlots: {},
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: [],
    });
    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['healthIntake'],
    });
  });

  it('keeps manually added fixed routine keys in sections mode when catalog selection protects them', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'healthIntake'],
      prioritySectionsMealSlots: { reading: ['morning'] },
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: ['reading'],
    });
    expect(patch).toBeNull();
  });

  it('removes a disabled item from sections even when a stale catalog selection exists', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'healthIntake'],
      prioritySectionsMealSlots: { reading: ['morning'] },
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_daily',
          name: '데일리 루틴',
          applyRule: 'daily' as const,
          items: [{ categoryKey: 'reading', enabled: false, mealSlot: 'morning' as const }],
        },
      ],
      activeSetIds: ['set_daily'],
    });

    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: {},
    });
  });

  it('adds applied fixed routines to sections order with meal slots', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: ['healthIntake'],
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
      priorityCategoryOrder: ['healthIntake'],
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

  it('updates today section meal slots when an applied routine changes its slot', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      prioritySectionsCategoryOrder: ['fasting', 'healthIntake'],
      prioritySectionsMealSlots: {
        fasting: ['dinner'],
        healthIntake: ['night'],
      },
      priorityMealSlotOverrides: {},
      todayAppliedCategoryKeys: ['fasting', 'healthIntake'],
      fixedFlowSets: [
        {
          id: 'set_example_health',
          name: '건강 루틴 예시',
          applyRule: 'manual' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlots: ['night'] },
            { categoryKey: 'fasting', enabled: true, mealSlots: ['night'] },
          ],
        },
      ],
      activeSetIds: ['set_example_health'],
      activeMealSlotsBySetId: {},
    });
    expect(patch).toEqual({
      prioritySectionsMealSlots: {
        fasting: ['night'],
        healthIntake: ['night'],
      },
    });
  });

  it('keeps manual catalog meal slots when the routine is not applied today', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      prioritySectionsCategoryOrder: ['fasting', 'healthIntake'],
      prioritySectionsMealSlots: {
        fasting: ['dinner'],
        healthIntake: ['night'],
      },
      priorityMealSlotOverrides: {},
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: ['fasting'],
      fixedFlowSets: [
        {
          id: 'set_example_health',
          name: '건강 루틴 예시',
          applyRule: 'manual' as const,
          items: [
            { categoryKey: 'healthIntake', enabled: true, mealSlots: ['night'] },
            { categoryKey: 'fasting', enabled: true, mealSlots: ['night'] },
          ],
        },
      ],
      activeSetIds: [],
      activeMealSlotsBySetId: {},
    });
    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['fasting'],
      prioritySectionsMealSlots: {
        fasting: ['dinner'],
      },
    });
  });

  it('adds applied fixed routines to spine timeline blocks in spine mode', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      priorityCategoryOrder: ['healthIntake'],
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
    expect(patch?.planBlocks?.map((block) => block.title)).toEqual([
      '건강을 위한 섭취',
      '체중조절',
    ]);
    expect(patch?.planBlocks?.map((block) => block.category)).toEqual([
      '건강을 위한 섭취',
      '체중조절',
    ]);
    expect(patch?.priorityCategoryOrder).toBeUndefined();
  });

  it('rewrites raw categoryKey titles on existing spine blocks', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      planBlocks: [
        {
          id: 'b1',
          title: 'reading',
          category: 'reading',
          categoryKey: 'reading',
          startMinutes: 14 * 60 + 35,
          endMinutes: 15 * 60 + 5,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      todayAppliedCategoryKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_weekend',
          name: '주말 루틴',
          applyRule: 'weekend' as const,
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 14 * 60 + 35,
              spineEndMinutes: 15 * 60 + 5,
            },
          ],
        },
      ],
      activeSetIds: ['set_weekend'],
    });
    expect(patch?.planBlocks?.map((block) => block.title)).toEqual(['독서']);
    expect(patch?.planBlocks?.map((block) => block.category)).toEqual(['독서']);
  });

  it('restores the exact stored routine slot after today-plan window clamping', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      priorityStart: '07:00',
      priorityEnd: '07:30',
      planBlocks: [
        {
          id: 'reading-block',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 7 * 60,
          endMinutes: 7 * 60 + 30,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      todayAppliedCategoryKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_reading',
          name: '독서 루틴',
          applyRule: 'manual' as const,
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 13 * 60,
              spineEndMinutes: 13 * 60 + 30,
            },
          ],
        },
      ],
      activeSetIds: ['set_reading'],
    });

    expect(patch?.planBlocks).toEqual([
      expect.objectContaining({
        id: 'reading-block',
        startMinutes: 13 * 60,
        endMinutes: 13 * 60 + 30,
      }),
    ]);
  });

  it('preserves a schedule edited directly in today timeline', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      planBlocks: [
        {
          id: 'reading-block',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 22 * 60 + 5,
          endMinutes: 0,
          endsNextCalendarDay: true,
          hasManualScheduleOverride: true,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      todayAppliedCategoryKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_reading',
          name: '독서 루틴',
          applyRule: 'manual' as const,
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 7 * 60 + 5,
              spineEndMinutes: 7 * 60 + 35,
            },
          ],
        },
      ],
      activeSetIds: ['set_reading'],
    });

    expect(patch).toBeNull();
  });

  it('preserves repeated spine blocks that share the same categoryKey', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      planBlocks: [
        {
          id: 'b1',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 15 * 60 + 40,
          endMinutes: 16 * 60 + 10,
          order: 0,
          blockOrigin: 'spineTimeline',
          endsNextCalendarDay: true,
        },
        {
          id: 'b2',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 17 * 60,
          endMinutes: 17 * 60 + 30,
          order: 1,
          blockOrigin: 'spineTimeline',
        },
      ],
      todayAppliedCategoryKeys: ['reading'],
      routineCatalogSelectionKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_reading',
          name: '독서',
          applyRule: 'manual',
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 13 * 60,
              spineEndMinutes: 13 * 60 + 30,
            },
          ],
        },
      ],
      activeSetIds: ['set_reading'],
    });
    const spine = (patch?.planBlocks ?? []).filter((b) => b.blockOrigin === 'spineTimeline');
    expect(spine).toHaveLength(2);
    expect(spine).toEqual([
      expect.objectContaining({
        id: 'b1',
        startMinutes: 13 * 60,
        endMinutes: 13 * 60 + 30,
      }),
      expect.objectContaining({
        id: 'b2',
        startMinutes: 17 * 60,
        endMinutes: 17 * 60 + 30,
      }),
    ]);
  });

  it('updates an existing block when only its next-day flag changes', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      planBlocks: [
        {
          id: 'reading-block',
          title: '독서',
          category: '독서',
          categoryKey: 'reading',
          startMinutes: 23 * 60,
          endMinutes: 1 * 60,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      todayAppliedCategoryKeys: ['reading'],
      fixedFlowSets: [
        {
          id: 'set_night',
          name: '밤 루틴',
          applyRule: 'manual' as const,
          items: [
            {
              categoryKey: 'reading',
              enabled: true,
              spineStartMinutes: 23 * 60,
              spineEndMinutes: 1 * 60,
              spineEndsNextCalendarDay: true,
            },
          ],
        },
      ],
      activeSetIds: ['set_night'],
    });

    expect(patch?.planBlocks).toEqual([
      expect.objectContaining({
        id: 'reading-block',
        endsNextCalendarDay: true,
      }),
    ]);
  });
});
