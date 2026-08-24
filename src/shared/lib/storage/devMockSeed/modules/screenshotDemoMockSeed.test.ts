import { loadDayPlanDraft } from '../../dayPlanDraftStorage';
import { loadDayPlanTodos } from '../../dayPlanTodoStorage';
import { loadGoalDetailCategoryConfig } from '../../goalDetailSettingsStorage';
import { localStorageClient } from '../../localStorageClient';
import { StorageKeys } from '../../storageKeys';

import { screenshotDemoMockSeed } from './screenshotDemoMockSeed';

describe('screenshotDemoMockSeed', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
    localStorageClient.removeItem(StorageKeys.dayPlanTodos);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
  });

  it('seeds today routines, todos, books, and note document', async () => {
    const result = await screenshotDemoMockSeed.seed();

    expect(result.screenshotRoutines).toBeGreaterThan(0);
    expect(result.screenshotTodos).toBe(4);
    expect(result.screenshotBooks).toBe(3);
    expect(result.screenshotNotes).toBe(1);

    const draft = loadDayPlanDraft();
    expect(draft?.planMode).toBe('priority');
    expect(draft?.priorityCategoryOrder?.length).toBeGreaterThan(0);
    expect(draft?.priorityCategoryOrder).toEqual(
      expect.arrayContaining(['reading', 'work', 'healthIntake', 'fasting']),
    );

    const todos = loadDayPlanTodos();
    const todayKeys = Object.keys(todos?.todosByDate ?? {});
    expect(todayKeys.length).toBe(1);
    expect(todos?.todosByDate?.[todayKeys[0]!]?.length).toBe(4);

    const reading = loadGoalDetailCategoryConfig('reading') as {
      books?: { title: string }[];
    } | null;
    expect(reading?.books?.length).toBe(3);

    const work = loadGoalDetailCategoryConfig('work') as {
      document?: { pages?: unknown[] };
    } | null;
    expect(work?.document?.pages?.length).toBe(1);
  });

  it('clear removes screenshot UI storage', async () => {
    await screenshotDemoMockSeed.seed();
    await screenshotDemoMockSeed.clear();

    const draft = loadDayPlanDraft();
    expect(draft?.priorityCategoryOrder).toEqual([]);
    expect(draft?.quickMemoDraft).toBe('');

    const todos = loadDayPlanTodos();
    expect(Object.keys(todos?.todosByDate ?? {})).toEqual([]);

    expect(loadGoalDetailCategoryConfig('reading')).toBeNull();
    expect(loadGoalDetailCategoryConfig('work')).toBeNull();
  });
});
