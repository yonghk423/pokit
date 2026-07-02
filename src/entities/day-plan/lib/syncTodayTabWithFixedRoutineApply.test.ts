import {
  computeSyncTodayTabWithFixedRoutineApply,
  syncPriorityOrderWithAppliedFixedRoutines,
} from './syncTodayTabWithFixedRoutineApply';

describe('syncPriorityOrderWithAppliedFixedRoutines', () => {
  const allFixed = new Set(['water', 'reading', 'study']);

  it('removes inactive fixed-flow keys from order', () => {
    const order = ['water', 'reading', 'study', 'custom'];
    expect(syncPriorityOrderWithAppliedFixedRoutines(order, [], allFixed)).toEqual(['custom']);
  });

  it('prepends applied keys missing from order', () => {
    const order = ['custom'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water', 'reading'], allFixed),
    ).toEqual(['water', 'reading', 'custom']);
  });

  it('keeps manual keys and applied fixed keys', () => {
    const order = ['custom', 'water', 'reading'];
    expect(
      syncPriorityOrderWithAppliedFixedRoutines(order, ['water'], allFixed),
    ).toEqual(['custom', 'water']);
  });
});

describe('computeSyncTodayTabWithFixedRoutineApply', () => {
  const baseInput = {
    priorityCategoryOrder: ['water', 'reading', 'custom'],
    priorityMealSlotOverrides: { water: 'morning' as const, reading: 'morning' as const },
    priorityMealSlotLayoutEnabled: true,
    priorityBagDismissedDateKey: '2026-07-02',
    priorityBagDismissedKeys: [] as string[],
    todayAppliedCategoryKeys: [] as string[],
    activeSetIds: [] as string[],
    activeMealSlotsBySetId: {} as Record<string, 'morning'>,
    scheduledMealSlotLayoutEnabled: false,
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
      priorityCategoryOrder: ['custom'],
      priorityMealSlotOverrides: {},
    });
  });

  it('merges meal slot overrides for applied fixed routines without explicit draft override', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityMealSlotOverrides: {},
      todayAppliedCategoryKeys: ['water'],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning'] },
    });
    expect(patch).toEqual({
      priorityCategoryOrder: ['water', 'custom'],
      priorityMealSlotOverrides: { water: 'morning' },
    });
  });

  it('does not auto-enable layout tab when applied fixed routines have meal slots', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['water', 'custom'],
      priorityMealSlotOverrides: {},
      priorityMealSlotLayoutEnabled: false,
      todayAppliedCategoryKeys: ['water'],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning'] },
      scheduledMealSlotLayoutEnabled: false,
    });
    expect(patch).toEqual({
      priorityMealSlotOverrides: { water: 'morning' },
    });
  });

  it('keeps draft meal slot override over applied fixed routine default', () => {
    const patch = computeSyncTodayTabWithFixedRoutineApply({
      ...baseInput,
      priorityCategoryOrder: ['water', 'custom'],
      priorityMealSlotOverrides: { water: 'lunch' },
      priorityMealSlotLayoutEnabled: true,
      todayAppliedCategoryKeys: ['water'],
      activeSetIds: ['preset-daily'],
      activeMealSlotsBySetId: { 'preset-daily': ['morning', 'lunch'] },
      scheduledMealSlotLayoutEnabled: true,
    });
    expect(patch).toBeNull();
  });
});
