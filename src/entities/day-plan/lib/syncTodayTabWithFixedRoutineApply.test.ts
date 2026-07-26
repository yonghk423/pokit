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

  it('keeps sections items that already have meal slots even when not applied today', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'work'],
      prioritySectionsMealSlots: { reading: ['morning'] },
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: [],
    });
    // 오늘 탭 시간대에 직접 둔 항목은 상세설정 복귀 sync에서도 유지
    expect(patch).toBeNull();
  });

  it('clears unapplied fixed routine keys from sections order when they have no meal slot', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'work'],
      prioritySectionsMealSlots: {},
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: [],
    });
    expect(patch).toEqual({
      prioritySectionsCategoryOrder: ['work'],
    });
  });

  it('keeps manually added fixed routine keys in sections mode when catalog selection protects them', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'sections',
      priorityCategoryOrder: [],
      priorityMealSlotOverrides: {},
      prioritySectionsCategoryOrder: ['reading', 'work'],
      prioritySectionsMealSlots: { reading: ['morning'] },
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: ['reading'],
    });
    expect(patch).toBeNull();
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
    // 오늘 탭에 이미 둔 시간대(lunch)를 sync가 덮어쓰지 않는다.
    expect(patch).toBeNull();
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

  it('dedupes spine blocks that share the same categoryKey', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      fixedRoutineApplyLayoutMode: 'spine',
      planBlocks: [
        {
          id: 'b1',
          title: '금지',
          category: '금지',
          categoryKey: 'custom_forbid',
          startMinutes: 15 * 60 + 40,
          endMinutes: 16 * 60 + 10,
          order: 0,
          blockOrigin: 'spineTimeline',
          endsNextCalendarDay: true,
        },
        {
          id: 'b2',
          title: '금지',
          category: '금지',
          categoryKey: 'custom_forbid',
          startMinutes: 15 * 60 + 40,
          endMinutes: 16 * 60 + 10,
          order: 1,
          blockOrigin: 'spineTimeline',
          endsNextCalendarDay: true,
        },
      ],
      todayAppliedCategoryKeys: [],
      routineCatalogSelectionKeys: ['custom_forbid'],
      fixedFlowSets: [],
      activeSetIds: [],
    });
    const spine = (patch?.planBlocks ?? []).filter((b) => b.blockOrigin === 'spineTimeline');
    expect(spine).toHaveLength(1);
    const ids = spine.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
