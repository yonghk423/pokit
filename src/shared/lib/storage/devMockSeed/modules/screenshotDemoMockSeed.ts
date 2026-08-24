import {
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_STRETCHING_FLOW_ID,
} from '../../defaultPriorityCatalog';
import { markDailyRhythmOnboardingCompleted } from '../../dailyRhythmOnboardingStorage';
import { loadDayPlanDraft, saveDayPlanDraft } from '../../dayPlanDraftStorage';
import { loadDayPlanTodos, saveDayPlanTodos } from '../../dayPlanTodoStorage';
import {
  appendGoalDetailCommittedCategoryKeys,
  loadGoalDetailCategoryConfig,
  removeGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '../../goalDetailSettingsStorage';

import type { DevMockSeedModule } from '../types';

const SCREENSHOT_READING_BOOK_IDS = [
  'rb-screenshot-demo-01',
  'rb-screenshot-demo-02',
  'rb-screenshot-demo-03',
] as const;

const SCREENSHOT_NOTE_PAGE_ID = 'wsp-screenshot-demo-01';
const SCREENSHOT_TODO_ID_PREFIX = 'todo-screenshot-';
const SCREENSHOT_QUICK_MEMO_MARKER = '스크린샷용';

function todayDateKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildPriorityCategoryOrder(): string[] {
  return [
    'reading',
    'work',
    'healthIntake',
    BUILTIN_DAILY_LIFE_FLOW_IDS[0]!,
    BUILTIN_DAILY_LIFE_FLOW_IDS[5]!,
    BUILTIN_STRETCHING_FLOW_ID,
    'fasting',
  ];
}

function seedDayPlanDraft(today: string): void {
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
    completedFocusCategoryKeys: [BUILTIN_DAILY_LIFE_FLOW_IDS[0]!],
    planCompletionDismissedKeys: [],
    priorityPlanDateKey: today,
    priorityPlanDateKeyEnd: today,
    priorityPlanExplicitMultiDay: false,
    priorityOvernightEndAuto: false,
    priorityStart: '07:00',
    priorityEnd: '23:00',
    priorityCategoryOrder: buildPriorityCategoryOrder(),
    priorityCategoryImportance: {
      reading: 'high',
      work: 'high',
      healthIntake: 'medium',
      [BUILTIN_DAILY_LIFE_FLOW_IDS[5]!]: 'medium',
      [BUILTIN_STRETCHING_FLOW_ID]: 'low',
    },
    quickMemoDraft: `${SCREENSHOT_QUICK_MEMO_MARKER} — 오전에 독서, 오후에 노트 정리`,
    priorityMealSlotLayoutEnabled: false,
    prioritySpineLayoutEnabled: false,
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
          what: '앱스토어 스크린샷 구도 잡기',
          who: '나',
          priority: 'high',
          startMinutes: 10 * 60,
          endMinutes: 11 * 60,
          inProgress: true,
          isDone: false,
          order: 0,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}02`,
          what: '데모 루틴 목록 점검',
          who: '나',
          priority: 'medium',
          startMinutes: 11 * 60 + 30,
          endMinutes: 12 * 60,
          inProgress: false,
          isDone: false,
          order: 1,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}03`,
          what: '릴리즈 노트 초안 다듬기',
          who: '나',
          priority: 'low',
          startMinutes: 14 * 60,
          endMinutes: 14 * 60 + 45,
          inProgress: false,
          isDone: true,
          order: 2,
        },
        {
          id: `${SCREENSHOT_TODO_ID_PREFIX}04`,
          what: '알림 미리보기 확인',
          who: '나',
          priority: 'medium',
          startMinutes: 16 * 60,
          endMinutes: 16 * 60 + 30,
          inProgress: false,
          isDone: false,
          order: 3,
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
        addedAtMs: now - 3 * 24 * 60 * 60 * 1000,
        memo: '자아를 찾아가는 이야기',
      },
      {
        id: SCREENSHOT_READING_BOOK_IDS[1],
        title: '아토믹 해빗',
        startPage: 1,
        targetPage: 392,
        status: 'want',
        addedAtMs: now - 2 * 24 * 60 * 60 * 1000,
        memo: '작은 습관부터',
      },
      {
        id: SCREENSHOT_READING_BOOK_IDS[2],
        title: '사피엔스',
        startPage: 1,
        targetPage: 636,
        status: 'done',
        addedAtMs: now - 10 * 24 * 60 * 60 * 1000,
        memo: '완독',
      },
    ],
    startPage: 1,
    targetPage: 248,
    selectedMetrics: ['pages_read', 'pages_left'],
    summary: '오늘 30쪽',
  });
  appendGoalDetailCommittedCategoryKeys(['reading']);
}

function seedWorkNote(today: string): void {
  saveGoalDetailCategoryConfig('work', {
    displayName: '노트',
    subject: 'POKIT 제품 노트',
    planMin: 90,
    doneMin: 35,
    breakMin: 5,
    studyMode: 'free',
    tasks: [
      { id: 'task-screenshot-01', text: '스크린샷용 카피 정리', done: true },
      { id: 'task-screenshot-02', text: '데모 데이터 시드 확인', done: false },
    ],
    focusMemo: '집중해서 제품 문구를 다듬기',
    summary: '노트 초안 작성',
    ddayEvents: [],
    timetableSlots: [],
    document: {
      pages: [
        {
          id: SCREENSHOT_NOTE_PAGE_ID,
          title: '오늘 메모',
          createdDateKey: today,
          blocks: [
            {
              id: 'wsb-screenshot-h1',
              kind: 'heading',
              text: 'POKIT 스크린샷 메모',
              subtitle: '',
              headingLevel: 1,
              accentIndex: 0,
            },
            {
              id: 'wsb-screenshot-p1',
              kind: 'paragraph',
              text: '오늘 일정이 채워진 화면을 찍기 위한 데모 노트입니다.',
            },
            {
              id: 'wsb-screenshot-c1',
              kind: 'checklist',
              text: '루틴·도서·투두·히스토리 시드 확인',
              checked: true,
            },
            {
              id: 'wsb-screenshot-c2',
              kind: 'checklist',
              text: '잠금화면·홈 화면 구도 잡기',
              checked: false,
            },
            {
              id: 'wsb-screenshot-b1',
              kind: 'bullet',
              text: '미완료 일정 알림이 제시간에 울리도록 개선',
            },
            {
              id: 'wsb-screenshot-b2',
              kind: 'bullet',
              text: '모드별 미완료 개수를 알림에 표시',
            },
          ],
        },
      ],
      activePageId: SCREENSHOT_NOTE_PAGE_ID,
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
      seededOrder.every((key, index) => prev.priorityCategoryOrder[index] === key));
  if (!looksLikeScreenshotSeed) return;
  saveDayPlanDraft({
    ...prev,
    priorityCategoryOrder: [],
    completedFocusCategoryKeys: [],
    planCompletionDismissedKeys: [],
    quickMemoDraft: '',
    isFocusStarted: false,
    priorityCategoryImportance: {},
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

function clearScreenshotWorkNote(): void {
  const raw = loadGoalDetailCategoryConfig('work');
  if (!raw || typeof raw !== 'object') return;
  const document = (raw as { document?: { pages?: { id?: string }[]; activePageId?: string } })
    .document;
  const pages = Array.isArray(document?.pages) ? document.pages : [];
  if (!pages.some((page) => page?.id === SCREENSHOT_NOTE_PAGE_ID)) return;
  const keptPages = pages.filter((page) => page?.id !== SCREENSHOT_NOTE_PAGE_ID);
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
 * 스크린샷용 오늘 일정·투두·도서·노트 목업.
 * 히스토리/호라이즌은 기존 seed 모듈이 담당한다.
 */
export const screenshotDemoMockSeed: DevMockSeedModule = {
  id: 'screenshot-demo',
  version: 1,
  async seed() {
    const today = todayDateKey();
    markDailyRhythmOnboardingCompleted();
    seedDayPlanDraft(today);
    seedTodos(today);
    seedReadingLibrary();
    seedWorkNote(today);
    return {
      screenshotRoutines: buildPriorityCategoryOrder().length,
      screenshotTodos: 4,
      screenshotBooks: SCREENSHOT_READING_BOOK_IDS.length,
      screenshotNotes: 1,
    };
  },
  async clear() {
    clearDayPlanDraftDemo();
    clearScreenshotTodos();
    clearScreenshotReadingLibrary();
    clearScreenshotWorkNote();
  },
};
