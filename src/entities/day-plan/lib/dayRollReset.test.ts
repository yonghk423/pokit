jest.mock('../lib/widgetDayPlanSync', () => ({
  syncDayPlanToWidget: jest.fn(),
  syncWidgetTimelineFromStorage: jest.fn(),
}));

import { savePriorityDayRollMode, saveRoutineCatalogSelectionKeys } from '@shared/lib/storage';

import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { useDayPlanStore } from '../model/dayPlanStore';
import { useFixedFlowSetsStore } from '../model/fixedFlowSetsStore';

describe('day roll reset', () => {
  beforeEach(() => {
    savePriorityDayRollMode('reset');
    saveRoutineCatalogSelectionKeys([]);
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      isHydrated: true,
      planMode: 'priority',
      priorityStart: '06:30',
      priorityEnd: '00:00',
      priorityPlanDateKey: '2026-09-18',
      priorityPlanDateKeyEnd: '2026-09-19',
      priorityPlanExplicitMultiDay: true,
      priorityOvernightEndAuto: true,
      priorityMealSlotLayoutEnabled: false,
      prioritySpineLayoutEnabled: false,
      priorityCategoryOrder: ['healthIntake', 'fasting'],
      prioritySectionsCategoryOrder: ['healthIntake'],
      prioritySectionsMealSlots: { healthIntake: ['morning'] },
      priorityMealSlotOverrides: { healthIntake: 'morning' },
      completedFocusCategoryKeys: ['healthIntake'],
      planCompletionDismissedKeys: ['healthIntake'],
      isFocusStarted: true,
      quickMemoDraft: '어제 빠른메모',
      priorityEndedTodayKeys: ['healthIntake'],
      priorityEndedTodayDateKey: '2026-09-18',
      priorityBagResetForEndedKey: '',
    });
    useDayPlanStore.setState({
      isHydrated: true,
      dateKey: '2026-09-18',
      blocks: [
        {
          id: 'b1',
          title: '독서',
          category: '독서',
          categoryKey: 'healthIntake',
          startMinutes: 9 * 60,
          endMinutes: 10 * 60,
          order: 0,
        },
      ],
      completedBlockIds: ['b1'],
      skippedBlockIds: [],
      liveActivityChecklistFocusBlockId: 'b1',
      quickMemos: [{ id: 'm1', text: '어제', createdAt: 1, isDone: false }],
    });
    useFixedFlowSetsStore.setState({
      isHydrated: true,
      activeSetIds: ['set_weekend'],
      activeMealSlotsBySetId: {},
      activeSetIdsByLayoutMode: { bag: ['set_weekend'], sections: [], spine: [] },
      activeMealSlotsBySetIdByLayoutMode: { bag: {}, sections: {}, spine: {} },
      sets: [
        {
          id: 'set_weekend',
          name: '주말',
          applyRule: 'weekend',
          applyWeekdays: [0, 6],
          items: [{ categoryKey: 'fasting', enabled: true }],
        },
      ],
      scheduledMealSlotLayoutEnabled: false,
      dismissedExampleCustomFlowSetIds: [],
      dismissedBuiltinPresetSetIds: [],
      fixedRoutineApplyLayoutMode: 'bag',
      todayAppliedCategoryKeys: ['fasting'],
      todayAppliedRevision: 1,
    });
  });

  it('resets today tab except dates and weekday-matched applied fixed routines', () => {
    useDayPlanDraftStore
      .getState()
      .rollPriorityPlanForwardIfEnded({ nowKey: '2026-09-19', nowMin: 8 * 60 });

    const draft = useDayPlanDraftStore.getState();
    expect(draft.priorityPlanDateKey).toBe('2026-09-19');
    expect(draft.priorityPlanDateKeyEnd).toBe('2026-09-20');
    expect(draft.priorityCategoryOrder).toEqual(['fasting']);
    expect(draft.prioritySectionsCategoryOrder).toEqual([]);
    expect(draft.prioritySectionsMealSlots).toEqual({});
    expect(draft.priorityMealSlotOverrides).toEqual({});
    expect(draft.quickMemoDraft).toBe('');
    expect(draft.completedFocusCategoryKeys).toEqual([]);
    expect(draft.planCompletionDismissedKeys).toEqual([]);
    expect(draft.isFocusStarted).toBe(false);
    expect(draft.priorityEndedTodayKeys).toEqual([]);

    const plan = useDayPlanStore.getState();
    expect(plan.dateKey).toBe('2026-09-19');
    expect(plan.blocks).toEqual([]);
    expect(plan.completedBlockIds).toEqual([]);
    expect(plan.quickMemos).toEqual([]);
    expect(plan.liveActivityChecklistFocusBlockId).toBeNull();

    expect(useFixedFlowSetsStore.getState().todayAppliedCategoryKeys).toEqual(['fasting']);
  });
});
