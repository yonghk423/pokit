import { loadGoalDetailCategoryConfig, loadDayPlan } from '@shared/lib/storage';
import { listCustomFlowCatalogIds } from '@shared/lib/storage/customFlowCatalogStorage';
import { loadDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { useAppLocaleStore } from '@shared/lib/i18n';

import {
  clearDevTemplateDemoRoutines,
  DEV_TEMPLATE_DEMO_FLOW_PREFIX,
  listDevTemplateDemoCategoryKeys,
  seedDevTemplateDemoRoutines,
} from './devTemplateDemoRoutinesSeed';

describe('devTemplateDemoRoutinesSeed', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
    localStorageClient.removeItem(StorageKeys.dayPlanDraft);
    localStorageClient.removeItem(StorageKeys.dayPlan);
    localStorageClient.removeItem(StorageKeys.goalDetailSettings);
    localStorageClient.removeItem(StorageKeys.customFlowCatalog);
    localStorageClient.removeItem(StorageKeys.priorityCatalogFixedRoutines);
    localStorageClient.removeItem(StorageKeys.dailyRhythmOnboarding);
  });

  it('템플릿 7종 + 알라딘 책·빠른 메모·상세 노트를 넣고 clear로 제거한다', async () => {
    const result = await seedDevTemplateDemoRoutines();
    const keys = listDevTemplateDemoCategoryKeys();

    expect(result.templateDemoRoutines).toBe(7);
    expect(result.screenshotBooks).toBe(6);
    expect(result.screenshotNotes).toBe(2);
    expect(result.screenshotQuickMemos).toBe(3);
    expect(keys).toHaveLength(7);

    const draft = loadDayPlanDraft();
    expect(draft?.priorityCategoryOrder).toEqual(expect.arrayContaining(keys));
    expect(draft?.priorityCategoryOrder).toEqual(expect.arrayContaining(['reading', 'work']));
    expect(draft?.quickMemoDraft).toMatch(/하루 메모|Daily memo|一日メモ/);

    const faceMap = draft?.priorityCategoryFaceColor ?? {};
    const inkMap = draft?.priorityCategoryInkColor ?? {};
    const markMap = draft?.priorityCategoryImportance ?? {};
    const colorKeys = [...keys, 'reading', 'work'];
    for (const key of colorKeys) {
      expect(typeof faceMap[key]).toBe('string');
      expect((faceMap[key] ?? '').length).toBeGreaterThan(0);
      expect(typeof inkMap[key]).toBe('string');
      expect(typeof markMap[key]).toBe('string');
    }
    const uniqueFaces = new Set(colorKeys.map((key) => faceMap[key]));
    expect(uniqueFaces.size).toBeGreaterThanOrEqual(7);

    for (const key of keys) {
      expect(listCustomFlowCatalogIds()).toContain(key);
      const cfg = loadGoalDetailCategoryConfig(key) as { templateKey?: string; displayName?: string };
      expect(typeof cfg?.templateKey).toBe('string');
      expect((cfg?.displayName ?? '').length).toBeGreaterThan(0);
    }

    useAppLocaleStore.setState({ locale: 'en' });
    await clearDevTemplateDemoRoutines();
    await seedDevTemplateDemoRoutines();
    const memoKey = listDevTemplateDemoCategoryKeys().find((key) =>
      key.includes('memo'),
    );
    expect(memoKey).toBeTruthy();
    const memoCfg = loadGoalDetailCategoryConfig(memoKey!) as {
      lastEntry?: string;
      checklist?: Array<{ text?: string }>;
    };
    expect(memoCfg.lastEntry ?? '').toMatch(/charger|earbuds|Pack/i);
    expect(loadDayPlanDraft()?.quickMemoDraft).toContain('·Daily memo');
    expect(loadDayPlanDraft()?.quickMemoDraft).not.toContain('·하루 메모');

    const reading = loadGoalDetailCategoryConfig('reading') as {
      books?: Array<{ id?: string; aladin?: { itemId?: number; coverUrl?: string } }>;
    };
    expect(reading.books).toHaveLength(6);
    expect(reading.books?.every((book) => (book.aladin?.itemId ?? 0) > 0)).toBe(true);
    expect(reading.books?.every((book) => (book.aladin?.coverUrl ?? '').includes('aladin'))).toBe(
      true,
    );

    const work = loadGoalDetailCategoryConfig('work') as {
      document?: { pages?: Array<{ id?: string; blocks?: unknown[] }> };
    };
    expect(work.document?.pages).toHaveLength(2);
    expect((work.document?.pages?.[0]?.blocks ?? []).length).toBeGreaterThan(2);

    const plan = loadDayPlan();
    expect((plan?.quickMemos ?? []).length).toBeGreaterThanOrEqual(3);

    await clearDevTemplateDemoRoutines();
    expect(listCustomFlowCatalogIds().some((id) => id.startsWith(DEV_TEMPLATE_DEMO_FLOW_PREFIX))).toBe(
      false,
    );
    const cleared = loadDayPlanDraft();
    expect(
      (cleared?.priorityCategoryOrder ?? []).some((key) =>
        key.startsWith(DEV_TEMPLATE_DEMO_FLOW_PREFIX),
      ),
    ).toBe(false);
    expect(cleared?.quickMemoDraft ?? '').toBe('');
    for (const key of colorKeys) {
      expect(cleared?.priorityCategoryFaceColor?.[key]).toBeUndefined();
      expect(cleared?.priorityCategoryInkColor?.[key]).toBeUndefined();
      expect(cleared?.priorityCategoryImportance?.[key]).toBeUndefined();
    }
    expect(
      ((loadGoalDetailCategoryConfig('reading') as { books?: unknown[] } | null)?.books ?? []).length,
    ).toBe(0);
  });
});
