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
import { getCategoryCompletions, useHistoryStore } from '@entities/history';

import { syncRoutineWindowCompletionsToHistory } from './syncRoutineWindowCompletionsToHistory';

describe('syncRoutineWindowCompletionsToHistory', () => {
  beforeEach(() => {
    useHistoryStore.setState({
      dailyStatsByDate: {},
      lastUpdatedAt: '',
      isHydrated: true,
    });
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      isHydrated: true,
      planMode: 'priority',
      priorityPlanDateKey: '2025-06-14',
      priorityPlanDateKeyEnd: '2025-06-14',
      priorityCategoryOrder: [],
      completedFocusCategoryKeys: [],
      routineHistoryPendingByDate: {
        '2025-06-14': ['bag:reading', 'bag:writing'],
      },
      routineHistoryPlannedKeysByDate: {
        '2025-06-14': ['bag:reading', 'bag:writing', 'bag:water'],
      },
    });
    useDayPlanStore.setState({
      ...useDayPlanStore.getState(),
      dateKey: '2025-06-14',
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
  });

  it('records pending routine completions when visiting history daily', () => {
    syncRoutineWindowCompletionsToHistory('2025-06-14');

    const row = useHistoryStore.getState().dailyStatsByDate['2025-06-14'];
    const completions = getCategoryCompletions(row ?? { categoryMinutes: {} });
    expect(completions['bag:reading']).toBe(1);
    expect(completions['bag:writing']).toBe(1);
    expect(row?.completedFlowCount).toBe(2);
    expect(useDayPlanDraftStore.getState().routineHistoryPendingByDate['2025-06-14']).toBeUndefined();
  });

  it('skips categories already present in history', () => {
    useHistoryStore.getState().recordFocusSession({
      dateKey: '2025-06-14',
      categoryKey: 'reading',
      completed: true,
      plannedCountForDay: 3,
    });

    syncRoutineWindowCompletionsToHistory('2025-06-14');

    const row = useHistoryStore.getState().dailyStatsByDate['2025-06-14'];
    const completions = getCategoryCompletions(row ?? { categoryMinutes: {} });
    expect(completions['bag:reading']).toBe(1);
    expect(completions['bag:writing']).toBe(1);
    expect(row?.completedFlowCount).toBe(2);
  });

  it('removes cancelled routine completions from history on resync', () => {
    syncRoutineWindowCompletionsToHistory('2025-06-14');

    useDayPlanDraftStore.setState({
      completedFocusCategoryKeys: ['reading'],
      routineHistoryPendingByDate: {},
    });

    syncRoutineWindowCompletionsToHistory('2025-06-14');

    const row = useHistoryStore.getState().dailyStatsByDate['2025-06-14'];
    const completions = getCategoryCompletions(row ?? { categoryMinutes: {} });
    expect(completions['bag:reading']).toBe(1);
    expect(completions['bag:writing']).toBeUndefined();
    expect(row?.completedFlowCount).toBe(1);
  });

  it('records independent bag, sections, and spine completions together', () => {
    useDayPlanDraftStore.setState({
      priorityCategoryOrder: ['reading'],
      prioritySectionsCategoryOrder: ['water'],
      prioritySpineLayoutEnabled: true,
      priorityMealSlotLayoutEnabled: false,
      completedFocusCategoryKeys: ['reading', 'water@morning'],
      routineHistoryPendingByDate: {
        '2025-06-14': ['bag:reading', 'sections:water', 'spine:exercise'],
      },
    });
    useDayPlanStore.setState({
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
          planDateKey: '2025-06-14',
        },
      ],
      completedBlockIds: ['spine-1'],
      skippedBlockIds: [],
    });

    syncRoutineWindowCompletionsToHistory('2025-06-14');

    const row = useHistoryStore.getState().dailyStatsByDate['2025-06-14'];
    const completions = getCategoryCompletions(row ?? { categoryMinutes: {} });
    expect(completions['bag:reading']).toBe(1);
    expect(completions['sections:water']).toBe(1);
    expect(completions['spine:exercise']).toBe(1);
    expect(row?.completedFlowCount).toBe(3);
  });

  it('keeps bag completion when resyncing on spine tab', () => {
    useDayPlanDraftStore.setState({
      priorityCategoryOrder: ['reading'],
      prioritySpineLayoutEnabled: true,
      priorityMealSlotLayoutEnabled: false,
      completedFocusCategoryKeys: ['reading'],
      routineHistoryPendingByDate: {
        '2025-06-14': ['bag:reading', 'spine:exercise'],
      },
    });
    useDayPlanStore.setState({
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
          planDateKey: '2025-06-14',
        },
      ],
      completedBlockIds: ['spine-1'],
      skippedBlockIds: [],
    });

    syncRoutineWindowCompletionsToHistory('2025-06-14');

    const row = useHistoryStore.getState().dailyStatsByDate['2025-06-14'];
    const completions = getCategoryCompletions(row ?? { categoryMinutes: {} });
    expect(completions['bag:reading']).toBe(1);
    expect(completions['spine:exercise']).toBe(1);
  });
});
