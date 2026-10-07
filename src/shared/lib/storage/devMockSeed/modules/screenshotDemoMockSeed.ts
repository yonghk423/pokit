import { getAppLocale } from '@shared/lib/i18n/model/localeStore';
import {
  getBuiltinFlowDefaultLabel,
  getBuiltinFlowDefaultSummary,
  isBuiltinFlowDefaultDisplayName,
} from '@shared/lib/i18n/lib/builtinFlowLabels';

import {
  BUILTIN_ABSTAIN_FLOW_ID,
  BUILTIN_DAILY_CLEAN_FLOW_ID,
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  DEFAULT_BUILTIN_CUSTOM_FLOWS,
} from '../../defaultPriorityCatalog';
import {
  BUILTIN_PRESET_SCHEDULE_SET_IDS,
  createDefaultFixedFlowSetsState,
} from '../../defaultFixedFlowSets';
import { markDailyRhythmOnboardingCompleted } from '../../dailyRhythmOnboardingStorage';
import { loadDayPlanDraft, saveDayPlanDraft } from '../../dayPlanDraftStorage';
import { saveDayPlanLayoutModeVisibility } from '../../dayPlanLayoutModeVisibility';
import { loadDayPlan, saveDayPlan } from '../../dayPlanStorage';
import { loadDayPlanTodos, saveDayPlanTodos } from '../../dayPlanTodoStorage';
import type { DayMealSlot } from '../../dayMealSlotScheduleStorage';
import {
  loadFixedFlowSetsState,
  saveFixedFlowSetsState,
} from '../../fixedFlowSetsStorage';
import { WEEKDAY_PRESET_WEEKDAY, WEEKDAY_PRESET_WEEKEND } from '../../fixedFlowWeekdays';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '../../goalDetailSettingsStorage';
import {
  appendCustomFlowCatalogEntry,
  removeCustomFlowCatalogId,
} from '../../customFlowCatalogStorage';
import { localStorageClient } from '../../localStorageClient';
import {
  loadPostItFaceColorByGroup,
  savePostItFaceColorForGroup,
} from '../../postItFaceColorStorage';
import { saveMyRoutineCollapsedGroupIds } from '../../postItGroupCollapsedStorage';
import {
  appendRoutineCatalogSelectionKeys,
  loadRoutineCatalogSelectionKeys,
  saveRoutineCatalogSelectionKeys,
} from '../../priorityCatalogFixedRoutinesStorage';
import { StorageKeys } from '../../storageKeys';

import type { DevMockSeedModule } from '../types';
import {
  getScreenshotDemoCopy,
  getScreenshotSpineLabel,
  isScreenshotExtraFlowId,
  isScreenshotHealthIntakeSummary,
  isScreenshotQuickMemoMarker,
  SCREENSHOT_EXTRA_ROUTINES,
} from './screenshotDemoCopy';
import {
  SCREENSHOT_DEMO_READING_ALADIN_BOOKS,
  toReadingAladinPayload,
} from './screenshotDemoReadingAladinBooks';

const SCREENSHOT_READING_BOOK_IDS = [
  'rb-screenshot-demo-01',
  'rb-screenshot-demo-02',
  'rb-screenshot-demo-03',
  'rb-screenshot-demo-04',
  'rb-screenshot-demo-05',
  'rb-screenshot-demo-06',
] as const;

const SCREENSHOT_NOTE_PAGE_IDS = [
  'wsp-screenshot-demo-01',
  'wsp-screenshot-demo-02',
] as const;

const SCREENSHOT_TODO_ID_PREFIX = 'todo-screenshot-';
const SCREENSHOT_SPINE_ID_PREFIX = 'dpb-screenshot-spine-';

/** 데일리 고정 루틴 — 스크린샷용 다항목 (기본은 단식 1개) */
const SCREENSHOT_DAILY_CATEGORY_KEYS = [
  'healthIntake',
  'fasting',
  BUILTIN_STRETCHING_FLOW_ID,
  'reading',
  SCREENSHOT_EXTRA_ROUTINES[0]!.id, // 일기
  SCREENSHOT_EXTRA_ROUTINES[2]!.id, // 영어 단어 복습
] as const;

/** 주말 고정 루틴 — 스크린샷용 4항목 (기본은 러닝 1개) */
const SCREENSHOT_WEEKEND_CATEGORY_KEYS = [
  BUILTIN_DAILY_EXERCISE_FLOW_ID,
  BUILTIN_STRETCHING_FLOW_ID,
  BUILTIN_DAILY_CLEAN_FLOW_ID,
  'customFlow:preset_daily_shopping',
] as const;

const SCREENSHOT_MY_ROUTINE_FACE_KEYS = {
  daily: 'my-routine:set_daily',
  weekend: 'my-routine:set_weekend',
} as const;

function todayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 현재 카탈로그 + 스크린샷 전용 커스텀으로 담기를 가득 채움 */
function buildPriorityCategoryOrder(): string[] {
  return [
    'healthIntake',
    BUILTIN_STRETCHING_FLOW_ID,
    'reading',
    SCREENSHOT_EXTRA_ROUTINES[0]!.id, // 아침 일기
    SCREENSHOT_EXTRA_ROUTINES[1]!.id, // 딥 워크
    SCREENSHOT_EXTRA_ROUTINES[2]!.id, // 영어 공부
    BUILTIN_ABSTAIN_FLOW_ID,
    BUILTIN_DAILY_EXERCISE_FLOW_ID,
    SCREENSHOT_EXTRA_ROUTINES[3]!.id, // 점심 산책
    SCREENSHOT_EXTRA_ROUTINES[4]!.id, // 저녁 요리
    SCREENSHOT_EXTRA_ROUTINES[5]!.id, // 집 정리
    SCREENSHOT_EXTRA_ROUTINES[6]!.id, // 장보기
    SCREENSHOT_EXTRA_ROUTINES[7]!.id, // 음악 감상
    SCREENSHOT_EXTRA_ROUTINES[8]!.id, // 감사 일기
    SCREENSHOT_EXTRA_ROUTINES[9]!.id, // 가족 통화
    SCREENSHOT_EXTRA_ROUTINES[10]!.id, // 디지털 디톡스
    'fasting',
    SCREENSHOT_EXTRA_ROUTINES[11]!.id, // 수면 준비
  ];
}

const IMPORTANCE_CYCLE = ['pink', 'mint', 'yellow', 'lavender'] as const;

function buildImportanceByOrder(order: string[]): Record<string, (typeof IMPORTANCE_CYCLE)[number]> {
  const out: Record<string, (typeof IMPORTANCE_CYCLE)[number]> = {};
  order.forEach((key, index) => {
    out[key] = IMPORTANCE_CYCLE[index % IMPORTANCE_CYCLE.length]!;
  });
  return out;
}

function buildSectionsMealSlots(order: string[]): Record<string, DayMealSlot[]> {
  const slots: DayMealSlot[] = ['morning', 'lunch', 'dinner'];
  const out: Record<string, DayMealSlot[]> = {};
  order.forEach((key, index) => {
    const primary = slots[index % slots.length]!;
    out[key] = index % 5 === 0 ? [primary, slots[(index + 1) % slots.length]!] : [primary];
  });
  return out;
}

type SpineSeedBlock = {
  id: string;
  categoryKey: string;
  startMinutes: number;
  endMinutes: number;
  order: number;
};

function buildSpineSeedBlocks(): SpineSeedBlock[] {
  const order = buildPriorityCategoryOrder();
  /** 07:00~22:30 사이를 촘촘히 — 약 18개 블록 */
  const starts = [
    7 * 60,
    7 * 60 + 40,
    8 * 60 + 20,
    9 * 60,
    10 * 60,
    11 * 60,
    11 * 60 + 40,
    12 * 60 + 30,
    13 * 60 + 20,
    14 * 60 + 10,
    15 * 60,
    16 * 60,
    17 * 60,
    18 * 60,
    18 * 60 + 50,
    19 * 60 + 40,
    20 * 60 + 30,
    21 * 60 + 20,
  ];
  const durations = [35, 35, 40, 55, 50, 35, 40, 45, 40, 45, 50, 50, 50, 40, 40, 40, 40, 40];
  return order.slice(0, starts.length).map((categoryKey, index) => {
    const startMinutes = starts[index]!;
    const endMinutes = startMinutes + durations[index]!;
    return {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}${String(index + 1).padStart(2, '0')}`,
      categoryKey,
      startMinutes,
      endMinutes,
      order: index,
    };
  });
}

function seedScreenshotExtraRoutines(): void {
  const locale = getAppLocale();
  for (const row of SCREENSHOT_EXTRA_ROUTINES) {
    appendCustomFlowCatalogEntry({ id: row.id, groupKey: row.groupKey });
    saveGoalDetailCategoryConfig(row.id, {
      templateKey: 'checklist',
      displayName: row.label[locale] ?? row.label.en,
      summary: row.summary[locale] ?? row.summary.en,
      icon: row.icon,
      accentColor: row.color,
      checklist: [
        {
          id: `${row.id}_item_01`,
          text: row.label[locale] ?? row.label.en,
          done: false,
        },
      ],
    });
  }
  appendGoalDetailCommittedCategoryKeys(SCREENSHOT_EXTRA_ROUTINES.map((row) => row.id));
}

function clearScreenshotExtraRoutines(): void {
  for (const row of SCREENSHOT_EXTRA_ROUTINES) {
    removeCustomFlowCatalogId(row.id);
    removeGoalDetailCategoryConfig(row.id);
  }
  const selection = loadRoutineCatalogSelectionKeys().filter((key) => !isScreenshotExtraFlowId(key));
  saveRoutineCatalogSelectionKeys(selection);
}

function seedDayPlanDraft(today: string): void {
  const order = buildPriorityCategoryOrder();
  /** 히스토리 동기화가 시드 완료를 지우지 않도록 오늘 담기 대부분을 완료로 둠 */
  const completedFocusCategoryKeys = order.filter(
    (key) => key !== 'fasting' && key !== SCREENSHOT_EXTRA_ROUTINES[11]!.id,
  );
  const prev = loadDayPlanDraft();
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
    dailyRolloverVersion: 1,
    planMode: 'priority',
    isFocusStarted: true,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys: [],
    priorityPlanDateKey: today,
    priorityPlanDateKeyEnd: today,
    priorityPlanExplicitMultiDay: false,
    priorityOvernightEndAuto: false,
    priorityStart: '07:00',
    priorityEnd: '23:00',
    priorityCategoryOrder: order,
    priorityCategoryImportance: {
      ...buildImportanceByOrder(order),
      // 나만의 루틴·담기 행 — 체중조절 핑크 하이라이트 (스크린샷)
      fasting: 'pink',
    },
    quickMemoDraft: (() => {
      const copy = getScreenshotDemoCopy(getAppLocale());
      return [copy.quickMemoMarker, ...copy.quickMemoLines].join('\n');
    })(),
    // 목록 모드 기본. 시간대·타임라인 데이터는 채워 두어 모드 전환 시 바로 보이게 함
    priorityMealSlotLayoutEnabled: false,
    prioritySpineLayoutEnabled: false,
    prioritySectionsLinkMode: 'independent',
    prioritySpineLinkMode: 'independent',
    priorityBagLinkMode: 'independent',
    prioritySectionsCategoryOrder: order,
    prioritySectionsMealSlots: buildSectionsMealSlots(order),
    routineHistoryPlannedKeysByDate: {
      ...(prev?.routineHistoryPlannedKeysByDate ?? {}),
      [today]: order,
    },
    routineHistoryPendingByDate: {
      ...(prev?.routineHistoryPendingByDate ?? {}),
      [today]: completedFocusCategoryKeys,
    },
  });
  appendRoutineCatalogSelectionKeys(order);
  saveDayPlanLayoutModeVisibility({ bag: true, sections: true, spine: true });
}

function seedSpineTimeline(today: string): void {
  const prev = loadDayPlan<{
    id: string;
    title: string;
    category: string;
    categoryKey?: string;
    startMinutes: number;
    endMinutes: number;
    order: number;
    blockOrigin?: string;
  }>();
  const kept = (prev?.blocks ?? []).filter(
    (block) => typeof block.id === 'string' && !block.id.startsWith(SCREENSHOT_SPINE_ID_PREFIX),
  );
  const locale = getAppLocale();
  const spineBlocks = buildSpineSeedBlocks().map((row) => {
    const label = getScreenshotSpineLabel(row.categoryKey, locale);
    return {
      id: row.id,
      title: label,
      category: label,
      categoryKey: row.categoryKey,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
      order: row.order,
      blockOrigin: 'spineTimeline' as const,
    };
  });
  const completedIds = spineBlocks
    .filter((block) => block.order <= Math.floor(spineBlocks.length * 0.55))
    .map((block) => block.id);

  saveDayPlan({
    dateKey: today,
    blocks: [...kept, ...spineBlocks],
    completedBlockIds: [
      ...((prev?.dateKey === today ? prev.completedBlockIds : []) ?? []).filter(
        (id) => !id.startsWith(SCREENSHOT_SPINE_ID_PREFIX),
      ),
      ...completedIds,
    ],
    skippedBlockIds:
      prev?.dateKey === today
        ? (prev.skippedBlockIds ?? []).filter((id) => !id.startsWith(SCREENSHOT_SPINE_ID_PREFIX))
        : [],
    quickMemos: prev?.dateKey === today ? (prev.quickMemos ?? []) : [],
  });
}

function seedTodos(today: string): void {
  const copy = getScreenshotDemoCopy(getAppLocale());
  const schedules = [
    {
      priority: 'high' as const,
      startMinutes: 9 * 60 + 30,
      endMinutes: 10 * 60 + 30,
      inProgress: true,
      isDone: false,
    },
    {
      priority: 'medium' as const,
      startMinutes: 12 * 60,
      endMinutes: 12 * 60 + 40,
      inProgress: false,
      isDone: false,
    },
    {
      priority: 'low' as const,
      startMinutes: 15 * 60,
      endMinutes: 15 * 60 + 20,
      inProgress: false,
      isDone: true,
    },
    {
      priority: 'high' as const,
      startMinutes: 16 * 60 + 30,
      endMinutes: 17 * 60,
      inProgress: false,
      isDone: false,
    },
    {
      priority: 'medium' as const,
      startMinutes: 18 * 60,
      endMinutes: 18 * 60 + 40,
      inProgress: false,
      isDone: false,
    },
    {
      priority: 'low' as const,
      startMinutes: 19 * 60 + 10,
      endMinutes: 19 * 60 + 30,
      inProgress: false,
      isDone: true,
    },
    {
      priority: 'high' as const,
      startMinutes: 20 * 60,
      endMinutes: 21 * 60,
      inProgress: false,
      isDone: false,
    },
    {
      priority: 'medium' as const,
      startMinutes: 21 * 60 + 10,
      endMinutes: 21 * 60 + 40,
      inProgress: false,
      isDone: false,
    },
  ];
  const prev = loadDayPlanTodos();
  saveDayPlanTodos({
    todosByDate: {
      ...(prev?.todosByDate ?? {}),
      [today]: copy.todos.map((todo, index) => {
        const schedule = schedules[index] ?? schedules[schedules.length - 1]!;
        return {
          id: `${SCREENSHOT_TODO_ID_PREFIX}${String(index + 1).padStart(2, '0')}`,
          what: todo.what,
          who: todo.who,
          priority: schedule.priority,
          startMinutes: schedule.startMinutes,
          endMinutes: schedule.endMinutes,
          inProgress: schedule.inProgress,
          isDone: schedule.isDone,
          order: index,
        };
      }),
    },
  });
}

function seedReadingLibrary(): void {
  const now = Date.now();
  const copy = getScreenshotDemoCopy(getAppLocale()).reading;
  const bookMeta = [
    {
      startPage: 1,
      targetPage: 112,
      status: 'reading' as const,
      addedAtMs: now - 5 * 24 * 60 * 60 * 1000,
    },
    {
      startPage: 1,
      targetPage: 1,
      status: 'want' as const,
      addedAtMs: now - 2 * 24 * 60 * 60 * 1000,
    },
    {
      startPage: 1,
      targetPage: SCREENSHOT_DEMO_READING_ALADIN_BOOKS[2]!.totalPages,
      status: 'done' as const,
      addedAtMs: now - 40 * 24 * 60 * 60 * 1000,
    },
    {
      startPage: 1,
      targetPage: 86,
      status: 'reading' as const,
      addedAtMs: now - 12 * 24 * 60 * 60 * 1000,
    },
    {
      startPage: 1,
      targetPage: 48,
      status: 'want' as const,
      addedAtMs: now - 1 * 24 * 60 * 60 * 1000,
    },
    {
      startPage: 1,
      targetPage: 120,
      status: 'reading' as const,
      addedAtMs: now - 8 * 24 * 60 * 60 * 1000,
    },
  ];
  const books = copy.books.map((book, index) => {
    const aladin = SCREENSHOT_DEMO_READING_ALADIN_BOOKS[index]!;
    const meta = bookMeta[index]!;
    return {
      id: SCREENSHOT_READING_BOOK_IDS[index]!,
      title: book.title,
      startPage: meta.startPage,
      targetPage: meta.targetPage,
      status: meta.status,
      addedAtMs: meta.addedAtMs,
      memo: book.memo,
      openLibrary: null,
      aladin: toReadingAladinPayload(aladin),
    };
  });
  const first = books[0]!;
  saveGoalDetailCategoryConfig('reading', {
    displayName: copy.displayName,
    bookTitle: copy.bookTitle,
    aladinBook: first.aladin,
    books,
    startPage: first.startPage,
    targetPage: first.targetPage,
    selectedMetrics: ['pages_read', 'pages_left'],
    summary: copy.summary,
  });
  appendGoalDetailCommittedCategoryKeys(['reading']);
}

function seedHealthIntakeDetail(): void {
  const copy = getScreenshotDemoCopy(getAppLocale()).healthIntake;
  saveGoalDetailCategoryConfig('healthIntake', {
    displayName: copy.displayName,
    summary: copy.summary,
    water: {
      displayName: copy.displayName,
      goalMl: 2000,
      drankMl: 1200,
      quickAddPresetsMl: [200, 250, 500],
      reminderPreset: '60',
      reminderCustomMin: 90,
      smartNotification: false,
      reminderTimes: ['09:00', '12:00', '15:00', '18:00'],
      summary: '',
    },
    medicine: {
      displayName: copy.displayName,
      doseLabel: copy.doseLabel,
      dosesPerDay: 2,
      takenCount: 1,
      morningOn: true,
      lunchOn: true,
      dinnerOn: false,
      morningTime: '08:00',
      lunchTime: '12:30',
      dinnerTime: '19:00',
      morningNotify: true,
      lunchNotify: true,
      dinnerNotify: false,
      summary: '',
    },
  });
  appendGoalDetailCommittedCategoryKeys(['healthIntake']);
}

function seedFastingDetail(): void {
  const today = todayDateKey();
  const copy = getScreenshotDemoCopy(getAppLocale()).fasting;
  saveGoalDetailCategoryConfig('fasting', {
    displayName: copy.displayName,
    summary: copy.summary,
    fastingMin: 16 * 60,
    elapsedMin: 10 * 60,
    currentWeightKg: 68.4,
    targetWeightKg: 65.2,
    weeklyLossTargetKg: 0.5,
    fastingEnabled: true,
    weightLogs: {
      [today]: 68.4,
    },
  });
  appendGoalDetailCommittedCategoryKeys(['fasting']);
}

function seedDayNotes(today: string): void {
  const copy = getScreenshotDemoCopy(getAppLocale()).notes;
  const blockIds = [
    ['wsb-shot-p1', 'wsb-shot-c1', 'wsb-shot-c2', 'wsb-shot-c3', 'wsb-shot-b1', 'wsb-shot-b2'],
    ['wsb-shot-p2', 'wsb-shot-n1', 'wsb-shot-n2'],
  ] as const;
  saveGoalDetailCategoryConfig('work', {
    displayName: copy.displayName,
    subject: copy.subject,
    planMin: 60,
    doneMin: 25,
    breakMin: 5,
    studyMode: 'free',
    tasks: copy.tasks.map((task, index) => ({
      id: `task-screenshot-0${index + 1}`,
      text: task.text,
      done: task.done,
    })),
    focusMemo: copy.focusMemo,
    summary: copy.summary,
    ddayEvents: [],
    timetableSlots: [],
    document: {
      pages: copy.pages.map((page, pageIndex) => ({
        id: SCREENSHOT_NOTE_PAGE_IDS[pageIndex]!,
        title: page.title,
        createdDateKey: today,
        blocks: page.blocks.map((block, blockIndex) => ({
          id: blockIds[pageIndex]![blockIndex]!,
          ...block,
        })),
      })),
      activePageId: SCREENSHOT_NOTE_PAGE_IDS[0],
    },
  });
  appendGoalDetailCommittedCategoryKeys(['work']);
}

function clearScreenshotTodos(): void {
  const prev = loadDayPlanTodos();
  if (!prev?.todosByDate) return;
  const next: typeof prev.todosByDate = {};
  for (const [dateKey, items] of Object.entries(prev.todosByDate)) {
    const kept = (items ?? []).filter((item) => !item.id.startsWith(SCREENSHOT_TODO_ID_PREFIX));
    if (kept.length > 0) next[dateKey] = kept;
  }
  saveDayPlanTodos({ todosByDate: next });
}

function clearDayPlanDraftDemo(): void {
  const prev = loadDayPlanDraft();
  if (!prev) return;
  const seededOrder = buildPriorityCategoryOrder();
  const looksLikeScreenshotSeed =
    isScreenshotQuickMemoMarker(prev.quickMemoDraft) ||
    (prev.priorityCategoryOrder.length === seededOrder.length &&
      seededOrder.every((key, index) => prev.priorityCategoryOrder[index] === key)) ||
    (prev.prioritySectionsCategoryOrder?.length === seededOrder.length &&
      seededOrder.every((key, index) => prev.prioritySectionsCategoryOrder?.[index] === key));
  if (!looksLikeScreenshotSeed) return;
  saveDayPlanDraft({
    ...prev,
    priorityCategoryOrder: [],
    prioritySectionsCategoryOrder: [],
    prioritySectionsMealSlots: {},
    completedFocusCategoryKeys: [],
    planCompletionDismissedKeys: [],
    quickMemoDraft: '',
    isFocusStarted: false,
    priorityCategoryImportance: {},
  });
}

function clearScreenshotSpineTimeline(): void {
  const prev = loadDayPlan<{ id: string }>();
  if (!prev?.blocks?.length) return;
  const hasScreenshot = prev.blocks.some(
    (block) => typeof block.id === 'string' && block.id.startsWith(SCREENSHOT_SPINE_ID_PREFIX),
  );
  if (!hasScreenshot) return;
  saveDayPlan({
    ...prev,
    blocks: prev.blocks.filter(
      (block) => !(typeof block.id === 'string' && block.id.startsWith(SCREENSHOT_SPINE_ID_PREFIX)),
    ),
    completedBlockIds: (prev.completedBlockIds ?? []).filter(
      (id) => !id.startsWith(SCREENSHOT_SPINE_ID_PREFIX),
    ),
    skippedBlockIds: (prev.skippedBlockIds ?? []).filter(
      (id) => !id.startsWith(SCREENSHOT_SPINE_ID_PREFIX),
    ),
  });
}

function clearScreenshotReadingLibrary(): void {
  const raw = loadGoalDetailCategoryConfig('reading');
  if (!raw || typeof raw !== 'object') return;
  const books = Array.isArray((raw as { books?: unknown }).books)
    ? ((raw as { books: { id?: string }[] }).books ?? [])
    : [];
  const screenshotIds = new Set<string>(SCREENSHOT_READING_BOOK_IDS);
  if (!books.some((book) => typeof book?.id === 'string' && screenshotIds.has(book.id))) {
    return;
  }
  const kept = books.filter((book) => !(typeof book?.id === 'string' && screenshotIds.has(book.id)));
  if (kept.length === 0) {
    removeGoalDetailCategoryConfig('reading');
    return;
  }
  saveGoalDetailCategoryConfig('reading', { ...raw, books: kept });
}

function clearScreenshotCategoryIfSeeded(categoryKey: string, marker: (raw: unknown) => boolean): void {
  const raw = loadGoalDetailCategoryConfig(categoryKey);
  if (!raw || !marker(raw)) return;
  removeGoalDetailCategoryConfig(categoryKey);
}

function clearScreenshotWorkNote(): void {
  const raw = loadGoalDetailCategoryConfig('work');
  if (!raw || typeof raw !== 'object') return;
  const document = (raw as { document?: { pages?: { id?: string }[]; activePageId?: string } })
    .document;
  const pages = Array.isArray(document?.pages) ? document.pages : [];
  const screenshotIds = new Set<string>(SCREENSHOT_NOTE_PAGE_IDS);
  if (!pages.some((page) => typeof page?.id === 'string' && screenshotIds.has(page.id))) return;
  const keptPages = pages.filter(
    (page) => !(typeof page?.id === 'string' && screenshotIds.has(page.id)),
  );
  if (keptPages.length === 0) {
    removeGoalDetailCategoryConfig('work');
    return;
  }
  const activePageId =
    keptPages.find((page) => page.id === document?.activePageId)?.id ?? keptPages[0]?.id ?? '';
  saveGoalDetailCategoryConfig('work', {
    ...raw,
    document: { pages: keptPages, activePageId },
  });
}

const TEMPLATE_DEMO_QUICK_MEMO_ID_PREFIX = 'qm-template-demo-';

/** 빠른 메모(초안 + 당일 quickMemos) — 담기 순서는 건드리지 않음 */
function seedQuickMemoSurfaces(today: string): number {
  const copy = getScreenshotDemoCopy(getAppLocale());
  const draft = loadDayPlanDraft();
  if (draft) {
    saveDayPlanDraft({
      ...draft,
      quickMemoDraft: [copy.quickMemoMarker, ...copy.quickMemoLines].join('\n'),
    });
  }

  const prev = loadDayPlan<{ id: string }>();
  const now = Date.now();
  const seeded = copy.quickMemoLines.map((text, index) => ({
    id: `${TEMPLATE_DEMO_QUICK_MEMO_ID_PREFIX}${String(index + 1).padStart(2, '0')}`,
    text,
    createdAt: now - index * 90_000,
    isDone: index === copy.quickMemoLines.length - 1,
  }));
  const kept =
    prev?.dateKey === today
      ? (prev.quickMemos ?? []).filter(
          (memo) => typeof memo.id === 'string' && !memo.id.startsWith(TEMPLATE_DEMO_QUICK_MEMO_ID_PREFIX),
        )
      : [];
  saveDayPlan({
    dateKey: today,
    blocks: prev?.dateKey === today ? (prev.blocks ?? []) : [],
    completedBlockIds: prev?.dateKey === today ? (prev.completedBlockIds ?? []) : [],
    skippedBlockIds: prev?.dateKey === today ? (prev.skippedBlockIds ?? []) : [],
    quickMemos: [...kept, ...seeded],
  });
  return seeded.length;
}

function clearQuickMemoSurfaces(): void {
  const draft = loadDayPlanDraft();
  if (draft && isScreenshotQuickMemoMarker(draft.quickMemoDraft)) {
    saveDayPlanDraft({ ...draft, quickMemoDraft: '' });
  }
  const prev = loadDayPlan<{ id: string }>();
  if (!prev?.quickMemos?.length) return;
  const next = prev.quickMemos.filter(
    (memo) => !(typeof memo.id === 'string' && memo.id.startsWith(TEMPLATE_DEMO_QUICK_MEMO_ID_PREFIX)),
  );
  if (next.length === prev.quickMemos.length) return;
  saveDayPlan({ ...prev, quickMemos: next });
}

/**
 * 위젯·탭 테스트용 표면 데이터만 — 알라딘 책방 / 상세 노트 / 빠른 메모.
 * 템플릿 체험 Dev Menu에서 루틴 7종과 함께 쓴다.
 */
export function seedScreenshotDemoSurfacesForWidgetTest(): {
  screenshotBooks: number;
  screenshotNotes: number;
  screenshotQuickMemos: number;
} {
  const today = todayDateKey();
  seedReadingLibrary();
  seedDayNotes(today);
  const quickMemoCount = seedQuickMemoSurfaces(today);
  appendRoutineCatalogSelectionKeys(['reading', 'work']);
  appendGoalDetailCommittedCategoryKeys(['reading', 'work']);

  const draft = loadDayPlanDraft();
  if (draft) {
    const withSurfaces = Array.from(
      new Set([...(draft.priorityCategoryOrder ?? []), 'reading', 'work']),
    );
    const withSections = Array.from(
      new Set([...(draft.prioritySectionsCategoryOrder ?? []), 'reading', 'work']),
    );
    saveDayPlanDraft({
      ...draft,
      priorityCategoryOrder: withSurfaces,
      prioritySectionsCategoryOrder: withSections,
      routineHistoryPlannedKeysByDate: {
        ...(draft.routineHistoryPlannedKeysByDate ?? {}),
        [today]: Array.from(
          new Set([...(draft.routineHistoryPlannedKeysByDate?.[today] ?? withSurfaces), 'reading', 'work']),
        ),
      },
    });
  }

  return {
    screenshotBooks: SCREENSHOT_READING_BOOK_IDS.length,
    screenshotNotes: SCREENSHOT_NOTE_PAGE_IDS.length,
    screenshotQuickMemos: quickMemoCount,
  };
}

export function clearScreenshotDemoSurfacesForWidgetTest(): void {
  clearScreenshotReadingLibrary();
  clearScreenshotWorkNote();
  clearQuickMemoSurfaces();
}

function seedLocalizedBuiltinRoutines(): void {
  const locale = getAppLocale();
  for (const flow of DEFAULT_BUILTIN_CUSTOM_FLOWS) {
    const flowId = flow.id;
    const localizedName = getBuiltinFlowDefaultLabel(flowId, locale);
    if (!localizedName) continue;

    const raw = loadGoalDetailCategoryConfig(flowId);
    if (!raw || typeof raw !== 'object') continue;
    const row = { ...(raw as Record<string, unknown>) };
    const currentName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
    // 사용자가 직접 지은 이름은 덮어쓰지 않음
    if (currentName.length > 0 && !isBuiltinFlowDefaultDisplayName(flowId, currentName)) {
      continue;
    }

    row.displayName = localizedName;
    const summary = getBuiltinFlowDefaultSummary(flowId, locale);
    if (summary) row.summary = summary;

    if (Array.isArray(row.checklist)) {
      row.checklist = row.checklist.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const entry = item as Record<string, unknown>;
        const text = typeof entry.text === 'string' ? entry.text.trim() : '';
        if (!text || isBuiltinFlowDefaultDisplayName(flowId, text)) {
          return { ...entry, text: localizedName };
        }
        return item;
      });
    }

    saveGoalDetailCategoryConfig(flowId, row);
  }
}

function restoreBuiltinRoutineLabelsToKo(): void {
  for (const flow of DEFAULT_BUILTIN_CUSTOM_FLOWS) {
    const raw = loadGoalDetailCategoryConfig(flow.id);
    if (!raw || typeof raw !== 'object') continue;
    const row = { ...(raw as Record<string, unknown>) };
    const currentName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
    if (!isBuiltinFlowDefaultDisplayName(flow.id, currentName)) continue;

    row.displayName = flow.displayName;
    if (typeof flow.summary === 'string') row.summary = flow.summary;
    if (Array.isArray(row.checklist) && flow.checklistLabels?.[0]) {
      const koLabel = flow.checklistLabels[0];
      row.checklist = row.checklist.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const entry = item as Record<string, unknown>;
        const text = typeof entry.text === 'string' ? entry.text.trim() : '';
        if (!text || isBuiltinFlowDefaultDisplayName(flow.id, text)) {
          return { ...entry, text: koLabel };
        }
        return item;
      });
    }
    saveGoalDetailCategoryConfig(flow.id, row);
  }
}

/**
 * 나만의 루틴 탭 스크린샷 — 데일리(다항목·평일·노란 형광펜) 펼침 + 주말 4항목 접힘.
 * 면색 팔레트 아코디언 펼침은 저장되지 않아 시드 불가.
 */
function seedScreenshotMyRoutines(): void {
  const prev = loadFixedFlowSetsState();
  const defaults = createDefaultFixedFlowSetsState();
  const defaultDaily = defaults.sets.find((set) => set.id === 'set_daily');
  const defaultWeekend = defaults.sets.find((set) => set.id === 'set_weekend');
  if (!defaultDaily || !defaultWeekend) return;

  const presetIds = new Set<string>(BUILTIN_PRESET_SCHEDULE_SET_IDS);
  const customSets = prev.sets.filter((set) => !presetIds.has(set.id));
  const dismissedBuiltinPresetSetIds = (prev.dismissedBuiltinPresetSetIds ?? []).filter(
    (id) => !presetIds.has(id),
  );

  saveFixedFlowSetsState({
    ...prev,
    dismissedBuiltinPresetSetIds,
    sets: [
      {
        ...defaultDaily,
        titleMarkColor: 'yellow',
        applyWeekdays: [...WEEKDAY_PRESET_WEEKDAY],
        items: SCREENSHOT_DAILY_CATEGORY_KEYS.map((categoryKey) => ({
          categoryKey,
          enabled: true,
        })),
      },
      {
        ...defaultWeekend,
        titleMarkColor: 'lavender',
        applyWeekdays: [...WEEKDAY_PRESET_WEEKEND],
        items: SCREENSHOT_WEEKEND_CATEGORY_KEYS.map((categoryKey) => ({
          categoryKey,
          enabled: true,
        })),
      },
      ...customSets,
    ],
  });

  // 데일리 펼침 · 주말 접힘 (헤더만 보이도록)
  saveMyRoutineCollapsedGroupIds(['set_weekend']);
  savePostItFaceColorForGroup(SCREENSHOT_MY_ROUTINE_FACE_KEYS.daily, 'cream');
  savePostItFaceColorForGroup(SCREENSHOT_MY_ROUTINE_FACE_KEYS.weekend, 'lavender');
}

function clearScreenshotMyRoutines(): void {
  const prev = loadFixedFlowSetsState();
  const defaults = createDefaultFixedFlowSetsState();
  const presetIds = new Set<string>(BUILTIN_PRESET_SCHEDULE_SET_IDS);
  const customSets = prev.sets.filter((set) => !presetIds.has(set.id));
  saveFixedFlowSetsState({
    ...prev,
    sets: [...defaults.sets, ...customSets],
  });
  saveMyRoutineCollapsedGroupIds([]);

  const faceMap = { ...loadPostItFaceColorByGroup() };
  delete faceMap[SCREENSHOT_MY_ROUTINE_FACE_KEYS.daily];
  delete faceMap[SCREENSHOT_MY_ROUTINE_FACE_KEYS.weekend];
  localStorageClient.setJson(StorageKeys.postItFaceColor, faceMap);
}

export const screenshotDemoMockSeed: DevMockSeedModule = {
  id: 'screenshot-demo',
  version: 12,
  async seed() {
    const today = todayDateKey();
    markDailyRhythmOnboardingCompleted();
    seedLocalizedBuiltinRoutines();
    seedScreenshotExtraRoutines();
    seedDayPlanDraft(today);
    seedSpineTimeline(today);
    seedTodos(today);
    seedReadingLibrary();
    seedHealthIntakeDetail();
    seedFastingDetail();
    seedDayNotes(today);
    seedScreenshotMyRoutines();
    return {
      screenshotRoutines: buildPriorityCategoryOrder().length,
      screenshotTodos: getScreenshotDemoCopy(getAppLocale()).todos.length,
      screenshotBooks: SCREENSHOT_READING_BOOK_IDS.length,
      screenshotNotes: SCREENSHOT_NOTE_PAGE_IDS.length,
    };
  },
  async clear() {
    clearDayPlanDraftDemo();
    clearScreenshotSpineTimeline();
    clearScreenshotTodos();
    clearScreenshotReadingLibrary();
    clearScreenshotWorkNote();
    clearScreenshotExtraRoutines();
    clearScreenshotMyRoutines();
    restoreBuiltinRoutineLabelsToKo();
    clearScreenshotCategoryIfSeeded(
      'healthIntake',
      (raw) =>
        Boolean(
          raw &&
            typeof raw === 'object' &&
            typeof (raw as { summary?: string }).summary === 'string' &&
            isScreenshotHealthIntakeSummary((raw as { summary: string }).summary),
        ),
    );
    clearScreenshotCategoryIfSeeded(
      'fasting',
      (raw) =>
        Boolean(
          raw &&
            typeof raw === 'object' &&
            typeof (raw as { summary?: string }).summary === 'string' &&
            (raw as { summary: string }).summary.includes('16:8'),
        ),
    );
  },
};
