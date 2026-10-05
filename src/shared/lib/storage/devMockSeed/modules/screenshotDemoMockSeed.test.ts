import { getAppLocale, useAppLocaleStore } from '@shared/lib/i18n';

import {
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
} from '../../defaultPriorityCatalog';
import { ensureDefaultPriorityCatalog } from '../../ensureDefaultPriorityCatalog';
import { loadDayPlanDraft } from '../../dayPlanDraftStorage';
import { loadDayPlan } from '../../dayPlanStorage';
import { loadDayPlanTodos } from '../../dayPlanTodoStorage';
import { loadGoalDetailCategoryConfig } from '../../goalDetailSettingsStorage';
import { listCustomFlowCatalogIds } from '../../customFlowCatalogStorage';
import { localStorageClient } from '../../localStorageClient';
import { StorageKeys } from '../../storageKeys';

import { SCREENSHOT_EXTRA_ROUTINES } from './screenshotDemoCopy';
import { screenshotDemoMockSeed } from './screenshotDemoMockSeed';

describe('screenshotDemoMockSeed', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
    localStorageClient.removeItem(StorageKeys.dayPlan);
    localStorageClient.removeItem(StorageKeys.dayPlanTodos);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    ensureDefaultPriorityCatalog();
  });

  it('seeds bag, sections, spine, todos, books, notes, and detail configs', async () => {
    const result = await screenshotDemoMockSeed.seed();

    expect(result.screenshotRoutines).toBe(18);
    expect(result.screenshotTodos).toBe(8);
    expect(result.screenshotBooks).toBe(6);
    expect(result.screenshotNotes).toBe(2);

    const draft = loadDayPlanDraft();
    expect(draft?.planMode).toBe('priority');
    expect(draft?.priorityCategoryOrder).toEqual([
      'healthIntake',
      BUILTIN_STRETCHING_FLOW_ID,
      'reading',
      SCREENSHOT_EXTRA_ROUTINES[0]!.id,
      SCREENSHOT_EXTRA_ROUTINES[1]!.id,
      SCREENSHOT_EXTRA_ROUTINES[2]!.id,
      BUILTIN_ABSTAIN_FLOW_ID,
      BUILTIN_DAILY_EXERCISE_FLOW_ID,
      SCREENSHOT_EXTRA_ROUTINES[3]!.id,
      SCREENSHOT_EXTRA_ROUTINES[4]!.id,
      SCREENSHOT_EXTRA_ROUTINES[5]!.id,
      SCREENSHOT_EXTRA_ROUTINES[6]!.id,
      SCREENSHOT_EXTRA_ROUTINES[7]!.id,
      SCREENSHOT_EXTRA_ROUTINES[8]!.id,
      SCREENSHOT_EXTRA_ROUTINES[9]!.id,
      SCREENSHOT_EXTRA_ROUTINES[10]!.id,
      'fasting',
      SCREENSHOT_EXTRA_ROUTINES[11]!.id,
    ]);
    expect(draft?.priorityCategoryOrder).not.toContain('work');
    expect(draft?.prioritySectionsCategoryOrder).toEqual(draft?.priorityCategoryOrder);
    expect(draft?.prioritySectionsMealSlots?.reading?.length).toBeGreaterThan(0);
    expect(draft?.prioritySectionsMealSlots?.[BUILTIN_DAILY_EXERCISE_FLOW_ID]?.length).toBeGreaterThan(
      0,
    );
    expect(draft?.quickMemoDraft).toContain('·하루 메모');
    expect(draft?.isFocusStarted).toBe(true);
    expect(draft?.completedFocusCategoryKeys?.length).toBeGreaterThanOrEqual(14);

    for (const row of SCREENSHOT_EXTRA_ROUTINES) {
      expect(listCustomFlowCatalogIds()).toContain(row.id);
      const cfg = loadGoalDetailCategoryConfig(row.id) as { displayName?: string } | null;
      expect(cfg?.displayName).toBe(row.label.ko);
    }

    const plan = loadDayPlan<{ id: string; blockOrigin?: string }>();
    const spine = (plan?.blocks ?? []).filter((block) => block.blockOrigin === 'spineTimeline');
    expect(spine.length).toBe(18);

    const todos = loadDayPlanTodos();
    const todayKeys = Object.keys(todos?.todosByDate ?? {});
    expect(todayKeys.length).toBe(1);
    expect(todos?.todosByDate?.[todayKeys[0]!]?.length).toBe(8);

    const reading = loadGoalDetailCategoryConfig('reading') as {
      books?: {
        title: string;
        targetPage?: number;
        aladin?: { itemId?: number; coverUrl?: string; totalPages?: number } | null;
      }[];
      aladinBook?: { itemId?: number } | null;
    } | null;
    expect(reading?.books?.length).toBe(6);
    expect(reading?.aladinBook?.itemId).toBe(260084);
    expect(reading?.books?.map((book) => book.aladin?.itemId)).toEqual([
      260084, 379447436, 314240466, 269873776, 251847567, 300101,
    ]);
    expect(reading?.books?.[0]?.targetPage).toBe(112);
    expect(reading?.books?.[0]?.aladin?.totalPages).toBe(248);
    expect(reading?.books?.[0]?.aladin?.coverUrl).toContain('image.aladin.co.kr');
    expect(reading?.books?.[1]?.title).toBe('아주 작은 습관의 힘');

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

  it('seeds English copy when app locale is en', async () => {
    useAppLocaleStore.setState({ locale: 'en' });
    expect(getAppLocale()).toBe('en');

    await screenshotDemoMockSeed.seed();

    const draft = loadDayPlanDraft();
    expect(draft?.quickMemoDraft).toContain('·Daily memo');
    expect(draft?.quickMemoDraft).toContain('Morning — 30 pages read');

    const todos = loadDayPlanTodos();
    const todayKey = Object.keys(todos?.todosByDate ?? {})[0]!;
    expect(todos?.todosByDate?.[todayKey]?.[0]?.what).toBe('Prep morning meeting notes');

    const reading = loadGoalDetailCategoryConfig('reading') as {
      bookTitle?: string;
    } | null;
    expect(reading?.bookTitle).toBe('Demian');

    const extra = loadGoalDetailCategoryConfig(SCREENSHOT_EXTRA_ROUTINES[0]!.id) as {
      displayName?: string;
    } | null;
    expect(extra?.displayName).toBe('Journal');
  });

  it('uses mixed-length routine labels for layout screenshots', async () => {
    await screenshotDemoMockSeed.seed();

    const labels = SCREENSHOT_EXTRA_ROUTINES.map((row) => row.label.ko);
    const lengths = labels.map((label) => label.length);
    expect(Math.min(...lengths)).toBeLessThanOrEqual(3);
    expect(Math.max(...lengths)).toBeGreaterThanOrEqual(14);
    expect(new Set(lengths).size).toBeGreaterThanOrEqual(4);

    const fasting = loadGoalDetailCategoryConfig('fasting') as { displayName?: string } | null;
    expect(fasting?.displayName).toBe('체중 관리 · 16:8 간헐적 단식');
  });

  it('clears screenshot seed data including extra routines', async () => {
    await screenshotDemoMockSeed.seed();
    await screenshotDemoMockSeed.clear();

    const draft = loadDayPlanDraft();
    expect(draft?.priorityCategoryOrder ?? []).toEqual([]);
    expect(draft?.quickMemoDraft ?? '').toBe('');

    for (const row of SCREENSHOT_EXTRA_ROUTINES) {
      expect(listCustomFlowCatalogIds()).not.toContain(row.id);
      expect(loadGoalDetailCategoryConfig(row.id)).toBeNull();
    }

    const plan = loadDayPlan<{ id: string }>();
    expect(
      (plan?.blocks ?? []).some(
        (block) => typeof block.id === 'string' && block.id.startsWith('dpb-screenshot-spine-'),
      ),
    ).toBe(false);

    const todos = loadDayPlanTodos();
    for (const items of Object.values(todos?.todosByDate ?? {})) {
      expect((items ?? []).every((item) => !item.id.startsWith('todo-screenshot-'))).toBe(true);
    }
  });
});
