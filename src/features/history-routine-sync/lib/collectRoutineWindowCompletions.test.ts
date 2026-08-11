jest.mock('@shared/lib/storage', () => {
  const actual = jest.requireActual<typeof import('@shared/lib/storage')>('@shared/lib/storage');
  return {
    ...actual,
    loadHistoryDailyStats: jest.fn(() => []),
    loadHistoryMeta: jest.fn(() => null),
    saveHistoryDailyStats: jest.fn(),
    saveHistoryMeta: jest.fn(),
    loadDayPlanDraft: jest.fn(() => null),
    saveDayPlanDraft: jest.fn(),
    syncWidgetTimelineFromStorage: jest.fn(),
  };
});

jest.mock('@entities/day-plan/lib/localDateKey', () => ({
  getLocalDateKey: () => '2025-06-14',
  addDaysToLocalDateKey: jest.requireActual('@entities/day-plan/lib/localDateKey').addDaysToLocalDateKey,
}));

import { useDayPlanDraftStore, useDayPlanStore } from '@entities/day-plan';

import { collectRoutineWindowCompletions } from './collectRoutineWindowCompletions';

describe('collectRoutineWindowCompletions', () => {
  beforeEach(() => {
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-06-14',
      priorityPlanDateKeyEnd: '2025-06-14',
      priorityCategoryOrder: ['reading'],
      prioritySectionsCategoryOrder: ['water'],
      prioritySpineLayoutEnabled: true,
      priorityMealSlotLayoutEnabled: false,
      completedFocusCategoryKeys: ['reading', 'water@morning'],
      routineHistoryPendingByDate: {
        '2025-06-14': ['bag:reading', 'sections:water', 'spine:exercise'],
      },
      routineHistoryPlannedKeysByDate: {},
    });
    useDayPlanStore.setState({
      ...useDayPlanStore.getState(),
      dateKey: '2025-06-14',
      blocks: [
        {
          id: 'spine-1',
          title: '운동',
          category: '운동',
          categoryKey: 'exercise',
          startMinutes: 480,
          endMinutes: 540,
          order: 0,
          blockOrigin: 'spineTimeline',
        },
      ],
      completedBlockIds: ['spine-1'],
      skippedBlockIds: [],
    });
  });

  it('collects unique category keys regardless of layout mode', () => {
    const { categoryKeys } = collectRoutineWindowCompletions('2025-06-14');
    expect(categoryKeys.sort()).toEqual(['exercise', 'reading', 'water']);
  });

  it('does not inflate the history denominator for repeated occurrences', () => {
    useDayPlanDraftStore.setState({
      priorityCategoryOrder: [
        'reading',
        'reading::instance:second',
      ],
      prioritySectionsCategoryOrder: [],
      completedFocusCategoryKeys: ['reading::instance:second'],
      routineHistoryPendingByDate: {},
      routineHistoryPlannedKeysByDate: {},
    });
    useDayPlanStore.setState({
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });

    expect(collectRoutineWindowCompletions('2025-06-14')).toEqual({
      categoryKeys: ['reading'],
      plannedCountForDay: 1,
    });
  });
});
