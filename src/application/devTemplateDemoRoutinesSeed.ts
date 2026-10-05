import {
  buildTemplateDemoConfig,
  listCustomFlowTemplateCatalogEntries,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import {
  appendCustomFlowCatalogEntry,
  appendGoalDetailCommittedCategoryKeys,
  appendRoutineCatalogSelectionKeys,
  getPostItFaceColorPreset,
  loadDayPlanDraft,
  loadRoutineCatalogSelectionKeys,
  markDailyRhythmOnboardingCompleted,
  removeCustomFlowCatalogId,
  removeGoalDetailCategoryConfig,
  saveDayPlanDraft,
  saveGoalDetailCategoryConfig,
  saveRoutineCatalogSelectionKeys,
  type PostItFaceColorId,
  type PostItInkColorId,
} from '@shared/lib/storage';
import type { DevMockSeedResult } from '@shared/lib/storage/devMockSeed';
import {
  clearScreenshotDemoSurfacesForWidgetTest,
  seedScreenshotDemoSurfacesForWidgetTest,
} from '@shared/lib/storage/devMockSeed/modules/screenshotDemoMockSeed';

/** Dev Menu 전용 — 생성 가능 템플릿 7종 체험 루틴 */
export const DEV_TEMPLATE_DEMO_FLOW_PREFIX = 'customFlow:dev-template:' as const;

const TEMPLATE_GROUP_KEY: Partial<Record<CustomFlowTemplateKey, string>> = {
  checklist: 'productivity',
  memo: 'productivity',
  measurement: 'health',
  healthIntake: 'health',
  fasting: 'health',
  counter: 'health',
  reminder: 'productivity',
};

const TEMPLATE_ACCENT: Partial<Record<CustomFlowTemplateKey, string>> = {
  checklist: '#356668',
  memo: '#5B6B8C',
  measurement: '#C45C26',
  healthIntake: '#7A4E8C',
  fasting: '#2F6F5E',
  counter: '#B85C38',
  reminder: '#3D6FA8',
};

/** 템플릿·표면 키별 포스트잇 면색 (위젯·오늘 탭에서 바로 구분되게) */
const DEMO_FACE_BY_TEMPLATE: Partial<Record<CustomFlowTemplateKey, PostItFaceColorId>> = {
  checklist: 'yellow',
  memo: 'mint',
  measurement: 'sky',
  healthIntake: 'lavender',
  fasting: 'navy',
  counter: 'coral',
  reminder: 'seafoam',
};

const DEMO_INK_BY_TEMPLATE: Partial<Record<CustomFlowTemplateKey, PostItInkColorId>> = {
  checklist: 'navy',
  memo: 'forest',
  measurement: 'burgundy',
  healthIntake: 'purple',
  fasting: 'white',
  counter: 'charcoal',
  reminder: 'teal',
};

const DEMO_MARK_BY_TEMPLATE: Partial<Record<CustomFlowTemplateKey, string>> = {
  checklist: 'mint',
  memo: 'pink',
  measurement: 'sky',
  healthIntake: 'lavender',
  fasting: 'amber',
  counter: 'coral',
  reminder: 'lime',
};

const DEMO_SURFACE_FACE: Record<string, PostItFaceColorId> = {
  reading: 'butter',
  work: 'rose',
};

const DEMO_SURFACE_INK: Record<string, PostItInkColorId> = {
  reading: 'navy',
  work: 'burgundy',
};

const DEMO_SURFACE_MARK: Record<string, string> = {
  reading: 'gold',
  work: 'violet',
};

export function devTemplateDemoCategoryKey(
  templateKey: CustomFlowTemplateKey,
): `${typeof DEV_TEMPLATE_DEMO_FLOW_PREFIX}${string}` {
  return `${DEV_TEMPLATE_DEMO_FLOW_PREFIX}${templateKey}`;
}

export function listDevTemplateDemoCategoryKeys(): string[] {
  return listCustomFlowTemplateCatalogEntries().map((entry) =>
    devTemplateDemoCategoryKey(entry.key),
  );
}

export function isDevTemplateDemoCategoryKey(categoryKey: string): boolean {
  return categoryKey.startsWith(DEV_TEMPLATE_DEMO_FLOW_PREFIX);
}

function todayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mergeUniqueOrder(existing: string[], append: string[]): string[] {
  const seen = new Set(existing);
  const out = [...existing];
  for (const key of append) {
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function stripDemoKeys(order: string[] | undefined): string[] {
  return (order ?? []).filter((key) => !isDevTemplateDemoCategoryKey(key));
}

function resolveDemoInk(face: PostItFaceColorId, preferred: PostItInkColorId): PostItInkColorId {
  const tone = getPostItFaceColorPreset(face).inkTone;
  return tone === 'light' ? 'white' : preferred;
}

function stripDemoColorMap(map: Record<string, string> | undefined): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(map ?? {})) {
    if (isDevTemplateDemoCategoryKey(key) || key === 'reading' || key === 'work') continue;
    next[key] = value;
  }
  return next;
}

/** 면색·잉크·중요도 형광펜 — 템플릿 7종 + 독서·노트 */
function applyDemoAppearanceColors(demoKeys: string[]): void {
  const catalog = listCustomFlowTemplateCatalogEntries();
  const face: Record<string, string> = {};
  const ink: Record<string, string> = {};
  const mark: Record<string, string> = {};

  for (const entry of catalog) {
    const categoryKey = devTemplateDemoCategoryKey(entry.key);
    if (!demoKeys.includes(categoryKey)) continue;
    const faceId = DEMO_FACE_BY_TEMPLATE[entry.key] ?? 'yellow';
    const inkId = resolveDemoInk(faceId, DEMO_INK_BY_TEMPLATE[entry.key] ?? 'navy');
    face[categoryKey] = faceId;
    ink[categoryKey] = inkId;
    mark[categoryKey] = DEMO_MARK_BY_TEMPLATE[entry.key] ?? 'mint';
  }

  for (const surfaceKey of ['reading', 'work'] as const) {
    const faceId = DEMO_SURFACE_FACE[surfaceKey]!;
    face[surfaceKey] = faceId;
    ink[surfaceKey] = resolveDemoInk(faceId, DEMO_SURFACE_INK[surfaceKey]!);
    mark[surfaceKey] = DEMO_SURFACE_MARK[surfaceKey]!;
  }

  const prev = loadDayPlanDraft();
  if (!prev) return;
  saveDayPlanDraft({
    ...prev,
    priorityCategoryFaceColor: {
      ...stripDemoColorMap(prev.priorityCategoryFaceColor),
      ...face,
    },
    priorityCategoryInkColor: {
      ...stripDemoColorMap(prev.priorityCategoryInkColor),
      ...ink,
    },
    priorityCategoryImportance: {
      ...stripDemoColorMap(prev.priorityCategoryImportance),
      ...mark,
    },
  });
}

function seedDraftOrder(demoKeys: string[]): void {
  const today = todayDateKey();
  const prev = loadDayPlanDraft();
  const bag = mergeUniqueOrder(stripDemoKeys(prev?.priorityCategoryOrder), demoKeys);
  const sections = mergeUniqueOrder(
    stripDemoKeys(prev?.prioritySectionsCategoryOrder),
    demoKeys,
  );

  saveDayPlanDraft({
    ...(prev ?? {
      planMode: 'priority',
      isFocusStarted: false,
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      priorityPlanDateKey: today,
      priorityPlanDateKeyEnd: today,
      priorityPlanExplicitMultiDay: false,
      priorityOvernightEndAuto: false,
      priorityStart: '07:00',
      priorityEnd: '23:00',
      priorityCategoryOrder: [],
      quickMemoDraft: '',
    }),
    planMode: prev?.planMode ?? 'priority',
    priorityPlanDateKey: prev?.priorityPlanDateKey ?? today,
    priorityPlanDateKeyEnd: prev?.priorityPlanDateKeyEnd ?? today,
    priorityCategoryOrder: bag,
    prioritySectionsCategoryOrder: sections,
    routineHistoryPlannedKeysByDate: {
      ...(prev?.routineHistoryPlannedKeysByDate ?? {}),
      [today]: mergeUniqueOrder(
        stripDemoKeys(prev?.routineHistoryPlannedKeysByDate?.[today]),
        demoKeys,
      ),
    },
  });
  appendRoutineCatalogSelectionKeys(demoKeys);
  markDailyRhythmOnboardingCompleted();
}

function clearDraftOrder(): void {
  const prev = loadDayPlanDraft();
  if (!prev) return;
  const today = todayDateKey();
  const planned = prev.routineHistoryPlannedKeysByDate ?? {};
  const nextPlanned: Record<string, string[]> = {};
  for (const [dateKey, keys] of Object.entries(planned)) {
    nextPlanned[dateKey] = stripDemoKeys(keys);
  }
  if (planned[today]) {
    nextPlanned[today] = stripDemoKeys(planned[today]);
  }
  saveDayPlanDraft({
    ...prev,
    priorityCategoryOrder: stripDemoKeys(prev.priorityCategoryOrder),
    prioritySectionsCategoryOrder: stripDemoKeys(prev.prioritySectionsCategoryOrder),
    completedFocusCategoryKeys: stripDemoKeys(prev.completedFocusCategoryKeys),
    planCompletionDismissedKeys: stripDemoKeys(prev.planCompletionDismissedKeys),
    priorityCategoryFaceColor: stripDemoColorMap(prev.priorityCategoryFaceColor),
    priorityCategoryInkColor: stripDemoColorMap(prev.priorityCategoryInkColor),
    priorityCategoryImportance: stripDemoColorMap(prev.priorityCategoryImportance),
    routineHistoryPlannedKeysByDate: nextPlanned,
    routineHistoryPendingByDate: Object.fromEntries(
      Object.entries(prev.routineHistoryPendingByDate ?? {}).map(([dateKey, keys]) => [
        dateKey,
        stripDemoKeys(keys),
      ]),
    ),
  });

  const selection = loadRoutineCatalogSelectionKeys().filter((key) => !isDevTemplateDemoCategoryKey(key));
  saveRoutineCatalogSelectionKeys(selection);
}

/**
 * 생성 가능 템플릿 7종 + 알라딘 책방·빠른 메모·상세 노트 목업.
 * 같은 키로 다시 실행하면 덮어쓴다.
 */
export async function seedDevTemplateDemoRoutines(): Promise<DevMockSeedResult> {
  const catalog = listCustomFlowTemplateCatalogEntries();
  const demoKeys = catalog.map((entry) => devTemplateDemoCategoryKey(entry.key));

  for (const entry of catalog) {
    const categoryKey = devTemplateDemoCategoryKey(entry.key);
    const demo = buildTemplateDemoConfig(entry.key);

    appendCustomFlowCatalogEntry({
      id: categoryKey,
      groupKey: TEMPLATE_GROUP_KEY[entry.key] ?? 'productivity',
    });

    saveGoalDetailCategoryConfig(categoryKey, {
      ...demo,
      displayName: entry.label,
      summary: entry.summary,
      icon: entry.icon,
      accentColor: TEMPLATE_ACCENT[entry.key] ?? '#356668',
      templateKey: entry.key,
    });
  }

  appendGoalDetailCommittedCategoryKeys(demoKeys);
  seedDraftOrder(demoKeys);

  // 책방 위젯·노트 위젯·빠른 메모(잠금화면/오늘 탭) 테스트용
  const surfaces = seedScreenshotDemoSurfacesForWidgetTest();
  applyDemoAppearanceColors(demoKeys);

  return {
    templateDemoRoutines: demoKeys.length,
    screenshotBooks: surfaces.screenshotBooks,
    screenshotNotes: surfaces.screenshotNotes,
    screenshotQuickMemos: surfaces.screenshotQuickMemos,
  };
}

export async function clearDevTemplateDemoRoutines(): Promise<void> {
  for (const categoryKey of listDevTemplateDemoCategoryKeys()) {
    removeCustomFlowCatalogId(categoryKey);
    removeGoalDetailCategoryConfig(categoryKey);
  }
  clearDraftOrder();
  clearScreenshotDemoSurfacesForWidgetTest();
}
