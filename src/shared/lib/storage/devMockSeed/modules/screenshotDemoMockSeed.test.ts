import { BUILTIN_DAILY_LIFE_FLOW_IDS, BUILTIN_STRETCHING_FLOW_ID } from '../../defaultPriorityCatalog';
import { loadDayPlanDraft } from '../../dayPlanDraftStorage';
import { loadDayPlan } from '../../dayPlanStorage';
import { loadDayPlanTodos } from '../../dayPlanTodoStorage';
import { loadGoalDetailCategoryConfig } from '../../goalDetailSettingsStorage';
import { localStorageClient } from '../../localStorageClient';
import { StorageKeys } from '../../storageKeys';

import { screenshotDemoMockSeed } from './screenshotDemoMockSeed';

describe('screenshotDemoMockSeed', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
    localStorageClient.removeItem(StorageKeys.dayPlan);
    localStorageClient.removeItem(StorageKeys.dayPlanTodos);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
  });

  it('seeds bag, sections, spine, todos, books, notes, and detail configs', async () => {
    const result = await screenshotDemoMockSeed.seed();

    expect(result.screenshotRoutines).toBe(7);
    expect(result.screenshotTodos).toBe(5);
    expect(result.screenshotBooks).toBe(4);
    expect(result.screenshotNotes).toBe(2);

    const draft = loadDayPlanDraft();
    expect(draft?.planMode).toBe('priority');
    expect(draft?.priorityCategoryOrder).toEqual([
      'reading',
      'healthIntake',
      BUILTIN_DAILY_LIFE_FLOW_IDS[0],
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_STRETCHING_FLOW_ID,
      'fasting',
      BUILTIN_DAILY_LIFE_FLOW_IDS[1],
    ]);
    expect(draft?.priorityCategoryOrder).not.toContain('work');
    expect(draft?.prioritySectionsCategoryOrder).toEqual(draft?.priorityCategoryOrder);
    expect(draft?.prioritySectionsMealSlots?.reading).toEqual(
      expect.arrayContaining(['morning', 'lunch']),
    );
    expect(draft?.prioritySectionsMealSlots?.[BUILTIN_DAILY_LIFE_FLOW_IDS[5]!]).toEqual(['lunch']);
    expect(draft?.quickMemoDraft).toContain('·하루 메모');
    expect(draft?.isFocusStarted).toBe(true);
    expect(draft?.completedFocusCategoryKeys?.length).toBeGreaterThanOrEqual(5);

    const plan = loadDayPlan<{ id: string; blockOrigin?: string }>();
    const spine = (plan?.blocks ?? []).filter((block) => block.blockOrigin === 'spineTimeline');
    expect(spine.length).toBe(7);

    const todos = loadDayPlanTodos();
    const todayKeys = Object.keys(todos?.todosByDate ?? {});
    expect(todayKeys.length).toBe(1);
    expect(todos?.todosByDate?.[todayKeys[0]!]?.length).toBe(5);

    const reading = loadGoalDetailCategoryConfig('reading') as {
      books?: { title: string }[];
    } | null;
    expect(reading?.books?.length).toBe(4);

    const health = loadGoalDetailCategoryConfig('healthIntake') as {
      water?: { drankMl?: number };
    } | null;
    expect(health?.water?.drankMl).toBe(1200);

    const fasting = loadGoalDetailCategoryConfig('fasting') as {
      fastingEnabled?: boolean;
    } | null;
    expect(fasting?.fastingEnabled).toBe(true);

    const work = loadGoalDetailCategoryConfig('work') as {
      document?: { pages?: unknown[] };
    } | null;
    expect(work?.document?.pages?.length).toBe(2);
  });

  it('clear removes screenshot UI storage', async () => {
    await screenshotDemoMockSeed.seed();
    await screenshotDemoMockSeed.clear();

    const draft = loadDayPlanDraft();
    expect(draft?.priorityCategoryOrder).toEqual([]);
    expect(draft?.prioritySectionsCategoryOrder).toEqual([]);
    expect(draft?.quickMemoDraft).toBe('');

    const plan = loadDayPlan<{ id: string }>();
    expect((plan?.blocks ?? []).some((block) => block.id.startsWith('dpb-screenshot-spine-'))).toBe(
      false,
    );

    const todos = loadDayPlanTodos();
    expect(Object.keys(todos?.todosByDate ?? {})).toEqual([]);

    expect(loadGoalDetailCategoryConfig('reading')).toBeNull();
    expect(loadGoalDetailCategoryConfig('work')).toBeNull();
    expect(loadGoalDetailCategoryConfig('healthIntake')).toBeNull();
    expect(loadGoalDetailCategoryConfig('fasting')).toBeNull();
  });
});
