import {
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_STRETCHING_FLOW_ID,
} from '../../defaultPriorityCatalog';
import { markDailyRhythmOnboardingCompleted } from '../../dailyRhythmOnboardingStorage';
import { loadDayPlanDraft, saveDayPlanDraft } from '../../dayPlanDraftStorage';
import { saveDayPlanLayoutModeVisibility } from '../../dayPlanLayoutModeVisibility';
import { loadDayPlan, saveDayPlan } from '../../dayPlanStorage';
import { loadDayPlanTodos, saveDayPlanTodos } from '../../dayPlanTodoStorage';
import type { DayMealSlot } from '../../dayMealSlotScheduleStorage';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '../../goalDetailSettingsStorage';
import { appendRoutineCatalogSelectionKeys } from '../../priorityCatalogFixedRoutinesStorage';

import type { DevMockSeedModule } from '../types';

const SCREENSHOT_READING_BOOK_IDS = [
  'rb-screenshot-demo-01',
  'rb-screenshot-demo-02',
  'rb-screenshot-demo-03',
  'rb-screenshot-demo-04',
] as const;

const SCREENSHOT_NOTE_PAGE_IDS = [
  'wsp-screenshot-demo-01',
  'wsp-screenshot-demo-02',
] as const;

const SCREENSHOT_TODO_ID_PREFIX = 'todo-screenshot-';
const SCREENSHOT_SPINE_ID_PREFIX = 'dpb-screenshot-spine-';
const SCREENSHOT_QUICK_MEMO_MARKER = '·하루 메모';

const SCREENSHOT_LABEL_KO: Record<string, string> = {
  reading: '독서',
  healthIntake: '건강을 위한 섭취',
  fasting: '체중조절',
  [BUILTIN_DAILY_LIFE_FLOW_IDS[0]!]: '이불정리',
  [BUILTIN_DAILY_LIFE_FLOW_IDS[1]!]: '청소하기',
  [BUILTIN_DAILY_LIFE_FLOW_IDS[5]!]: '운동하기',
  [BUILTIN_STRETCHING_FLOW_ID]: '스트레칭',
};

function todayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 현재 카탈로그 기준 담기 — `work`/`water`/`medicine` 제외 */
function buildPriorityCategoryOrder(): string[] {
  return [
    'reading',
    'healthIntake',
    BUILTIN_DAILY_LIFE_FLOW_IDS[0]!, // 이불정리
    BUILTIN_DAILY_LIFE_FLOW_IDS[5]!, // 운동하기
    BUILTIN_STRETCHING_FLOW_ID, // 스트레칭
    'fasting',
    BUILTIN_DAILY_LIFE_FLOW_IDS[1]!, // 청소하기
  ];
}

function buildSectionsMealSlots(): Record<string, DayMealSlot[]> {
  return {
    [BUILTIN_DAILY_LIFE_FLOW_IDS[0]!]: ['morning'],
    healthIntake: ['morning'],
    reading: ['morning', 'lunch'],
    [BUILTIN_DAILY_LIFE_FLOW_IDS[5]!]: ['lunch'],
    [BUILTIN_STRETCHING_FLOW_ID]: ['dinner'],
    fasting: ['dinner'],
    [BUILTIN_DAILY_LIFE_FLOW_IDS[1]!]: ['night'],
  };
}

type SpineSeedBlock = {
  id: string;
  categoryKey: string;
  startMinutes: number;
  endMinutes: number;
  order: number;
};

function buildSpineSeedBlocks(): SpineSeedBlock[] {
  return [
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}01`,
      categoryKey: BUILTIN_DAILY_LIFE_FLOW_IDS[0]!,
      startMinutes: 7 * 60,
      endMinutes: 7 * 60 + 20,
      order: 0,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}02`,
      categoryKey: 'healthIntake',
      startMinutes: 8 * 60,
      endMinutes: 8 * 60 + 25,
      order: 1,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}03`,
      categoryKey: 'reading',
      startMinutes: 9 * 60,
      endMinutes: 10 * 60,
      order: 2,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}04`,
      categoryKey: BUILTIN_DAILY_LIFE_FLOW_IDS[5]!,
      startMinutes: 12 * 60 + 30,
      endMinutes: 13 * 60 + 20,
      order: 3,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}05`,
      categoryKey: BUILTIN_STRETCHING_FLOW_ID,
      startMinutes: 18 * 60,
      endMinutes: 18 * 60 + 20,
      order: 4,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}06`,
      categoryKey: 'fasting',
      startMinutes: 20 * 60,
      endMinutes: 20 * 60 + 30,
      order: 5,
    },
    {
      id: `${SCREENSHOT_SPINE_ID_PREFIX}07`,
      categoryKey: BUILTIN_DAILY_LIFE_FLOW_IDS[1]!,
      startMinutes: 21 * 60,
      endMinutes: 21 * 60 + 30,
      order: 6,
    },
  ];
}

function seedDayPlanDraft(today: string): void {
  const order = buildPriorityCategoryOrder();
  /** 히스토리 동기화가 시드 완료를 지우지 않도록 오늘 담기 대부분을 완료로 둠 */
  const completedFocusCategoryKeys = order.filter(
    (key) => key !== BUILTIN_DAILY_LIFE_FLOW_IDS[1], // 청소하기만 미완료로 남겨 진행 중 느낌
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
      reading: 'high',
      healthIntake: 'high',
      [BUILTIN_DAILY_LIFE_FLOW_IDS[5]!]: 'medium',
      [BUILTIN_STRETCHING_FLOW_ID]: 'low',
      fasting: 'medium',
    },
    quickMemoDraft: [
      `${SCREENSHOT_QUICK_MEMO_MARKER}`,
      '오전 — 독서 30쪽, 물 500ml',
      '오후 — 운동·스트레칭, 노트에 아이디어 정리',
      '저녁 — 체중 기록하고 내일 루틴 확인',
    ].join('\n'),
    // 목록 모드 기본. 시간대·타임라인 데이터는 채워 두어 모드 전환 시 바로 보이게 함
    priorityMealSlotLayoutEnabled: false,
    prioritySpineLayoutEnabled: false,
    prioritySectionsLinkMode: 'independent',
    prioritySpineLinkMode: 'independent',
    priorityBagLinkMode: 'independent',
    prioritySectionsCategoryOrder: order,
    prioritySectionsMealSlots: buildSectionsMealSlots(),
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
  const spineBlocks = buildSpineSeedBlocks().map((row) => {
    const label = SCREENSHOT_LABEL_KO[row.categoryKey] ?? '루틴';
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
    .filter((block) => block.order <= 2)
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
  const prev = loadDayPlanTodos();
  saveDayPlanTodos({
    todosByDate: {
      ...(prev?.todosByDate ?? {}),
      [today]: [
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}01`,
          what: '오전 미팅 자료 정리',
          who: '나',
          priority: 'high',
          startMinutes: 9 * 60 + 30,
          endMinutes: 10 * 60 + 30,
          inProgress: true,
          isDone: false,
          order: 0,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}02`,
          what: '장보기 · 저녁 재료',
          who: '나',
          priority: 'medium',
          startMinutes: 12 * 60,
          endMinutes: 12 * 60 + 40,
          inProgress: false,
          isDone: false,
          order: 1,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}03`,
          what: '친구에게 회신 보내기',
          who: '나',
          priority: 'low',
          startMinutes: 15 * 60,
          endMinutes: 15 * 60 + 20,
          inProgress: false,
          isDone: true,
          order: 2,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}04`,
          what: '주간 리뷰 초안 쓰기',
          who: '나',
          priority: 'high',
          startMinutes: 20 * 60,
          endMinutes: 21 * 60,
          inProgress: false,
          isDone: false,
          order: 3,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}05`,
          what: '세탁물 개기',
          who: '나',
          priority: 'medium',
          startMinutes: 21 * 60 + 10,
          endMinutes: 21 * 60 + 40,
          inProgress: false,
          isDone: false,
          order: 4,
        },
      ],
    },
  });
}

function seedReadingLibrary(): void {
  const now = Date.now();
  saveGoalDetailCategoryConfig('reading', {
    displayName: '독서',
    bookTitle: '데미안',
    aladinBook: null,
    books: [
      {
        id: SCREENSHOT_READING_BOOK_IDS[0],
        title: '데미안',
        startPage: 1,
        targetPage: 248,
        status: 'reading',
        addedAtMs: now - 5 * 24 * 60 * 60 * 1000,
        memo: '오늘 112쪽까지',
      },
      {
        id: SCREENSHOT_READING_BOOK_IDS[1],
        title: '아토믹 해빗',
        startPage: 1,
        targetPage: 392,
        status: 'want',
        addedAtMs: now - 2 * 24 * 60 * 60 * 1000,
        memo: '다음에 읽을 책',
      },
      {
        id: SCREENSHOT_READING_BOOK_IDS[2],
        title: '사피엔스',
        startPage: 1,
        targetPage: 636,
        status: 'done',
        addedAtMs: now - 40 * 24 * 60 * 60 * 1000,
        memo: '완독',
      },
      {
        id: SCREENSHOT_READING_BOOK_IDS[3],
        title: '미드나잇 라이브러리',
        startPage: 1,
        targetPage: 304,
        status: 'reading',
        addedAtMs: now - 12 * 24 * 60 * 60 * 1000,
        memo: '출퇴근용',
      },
    ],
    startPage: 1,
    targetPage: 248,
    selectedMetrics: ['pages_read', 'pages_left'],
    summary: '오늘 30쪽 · 112/248',
  });
  appendGoalDetailCommittedCategoryKeys(['reading']);
}

function seedHealthIntakeDetail(): void {
  saveGoalDetailCategoryConfig('healthIntake', {
    displayName: '건강을 위한 섭취',
    summary: '물 1.2L · 약 아침 완료',
    water: {
      displayName: '건강을 위한 섭취',
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
      displayName: '건강을 위한 섭취',
      doseLabel: '종합비타민',
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
  saveGoalDetailCategoryConfig('fasting', {
    displayName: '체중조절',
    summary: '16:8 단식 · 목표까지 -3.2kg',
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
  saveGoalDetailCategoryConfig('work', {
    displayName: '노트',
    subject: '일상 노트',
    planMin: 60,
    doneMin: 25,
    breakMin: 5,
    studyMode: 'free',
    tasks: [
      { id: 'task-screenshot-01', text: '아이디어 3개 적기', done: true },
      { id: 'task-screenshot-02', text: '내일 루틴 점검', done: false },
    ],
    focusMemo: '짧게라도 매일 기록하기',
    summary: '오늘 메모',
    ddayEvents: [],
    timetableSlots: [],
    document: {
      pages: [
        {
          id: SCREENSHOT_NOTE_PAGE_IDS[0],
          title: '오늘',
          createdDateKey: today,
          blocks: [
            {
              id: 'wsb-shot-p1',
              kind: 'paragraph',
              text: '아침에 산뜻하게 시작했고, 오후에 운동까지 끝냈다. 저녁엔 노트만 정리하면 충분하다.',
            },
            {
              id: 'wsb-shot-c1',
              kind: 'checklist',
              text: '물 2L 목표 채우기',
              checked: false,
            },
            {
              id: 'wsb-shot-c2',
              kind: 'checklist',
              text: '독서 30쪽',
              checked: true,
            },
            {
              id: 'wsb-shot-c3',
              kind: 'checklist',
              text: '스트레칭 10분',
              checked: false,
            },
            {
              id: 'wsb-shot-b1',
              kind: 'bullet',
              text: '집중이 잘 되는 시간: 오전 9–11시',
            },
            {
              id: 'wsb-shot-b2',
              kind: 'bullet',
              text: '내일은 장보기 전에 루틴부터',
            },
          ],
        },
        {
          id: SCREENSHOT_NOTE_PAGE_IDS[1],
          title: '아이디어',
          createdDateKey: today,
          blocks: [
            {
              id: 'wsb-shot-p2',
              kind: 'paragraph',
              text: '완벽보다 꾸준함이 우선. 작은 완료를 쌓자.',
            },
            {
              id: 'wsb-shot-n1',
              kind: 'numbered',
              text: '주말 루틴을 가볍게 다시 짜기',
            },
            {
              id: 'wsb-shot-n2',
              kind: 'numbered',
              text: '독서 리스트에 에세이 추가',
            },
          ],
        },
      ],
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
    prev.quickMemoDraft.includes(SCREENSHOT_QUICK_MEMO_MARKER) ||
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

/**
 * 스크린샷용 — 현재 제품 UI(담기·시간대·타임라인·빠른메모·투두·서재·노트·건강섭취·체중조절) 기준 목업.
 * 히스토리/호라이즌은 `runScreenshotDemoSeedWithStoreSync`가 이어서 채운다.
 */
export const screenshotDemoMockSeed: DevMockSeedModule = {
  id: 'screenshot-demo',
  version: 5,
  async seed() {
    const today = todayDateKey();
    markDailyRhythmOnboardingCompleted();
    seedDayPlanDraft(today);
    seedSpineTimeline(today);
    seedTodos(today);
    seedReadingLibrary();
    seedHealthIntakeDetail();
    seedFastingDetail();
    seedDayNotes(today);
    return {
      screenshotRoutines: buildPriorityCategoryOrder().length,
      screenshotTodos: 5,
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
    clearScreenshotCategoryIfSeeded(
      'healthIntake',
      (raw) =>
        Boolean(
          raw &&
            typeof raw === 'object' &&
            typeof (raw as { summary?: string }).summary === 'string' &&
            (raw as { summary: string }).summary.includes('물 1.2L'),
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
