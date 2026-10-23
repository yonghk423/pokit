import {
  addDaysToLocalDateKey,
  buildTemplateDemoConfig,
  CUSTOM_FLOW_TEMPLATE_ICONS,
  getLocalDateKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { useDayPlanDraftStore } from '@entities/day-plan/model/dayPlanDraftStore';
import { useGoalDetailSettingsStore } from '@entities/day-plan/model/goalDetailSettingsStore';
import { useRoutineStartTimesStore } from '@entities/day-plan/model/routineStartTimesStore';
import { useScheduledRoutinePlanStore } from '@entities/day-plan/model/scheduledRoutinePlanStore';
import { useHistoryStore } from '@entities/history';
import { getAppLocale, type AppLocale } from '@shared/lib/i18n';
import {
  appendCustomFlowCatalogEntry,
  appendGoalDetailCommittedCategoryKeys,
  appendRoutineCatalogSelectionKeys,
  flushLocalStorageClientWrites,
  loadDayPlanDraft,
  isPostItFaceColorId,
  loadGoalDetailCategoryConfig,
  loadHistoryDailyStats,
  loadRoutineCatalogSelectionKeys,
  loadRoutineStartTimes,
  loadScheduledRoutinePlan,
  loadDailyRhythmOnboardingCompleted,
  localStorageClient,
  markDailyRhythmOnboardingCompleted,
  removeCustomFlowCatalogId,
  removeGoalDetailCategoryConfig,
  saveDayPlanDraft,
  saveGoalDetailCategoryConfig,
  saveHistoryDailyStats,
  saveHistoryMeta,
  saveRoutineCatalogSelectionKeys,
  saveRoutineStartTimes,
  saveScheduledRoutinePlan,
  setScheduledCategoryKeysForDate,
  type HistoryDailyStatRow,
  type PersistedDayPlanDraft,
  type PostItFaceColorId,
} from '@shared/lib/storage';
import { DEFAULT_COMIC_CHARACTER_ID } from '@pages/day-plan/lib/comicCharacters';
import {
  loadComicDiaryLibrary,
  saveComicDiaryLibrary,
  type ComicDiary,
} from '@pages/day-plan/lib/comicDiaryStorage';
import type { ComicDayScene } from '@pages/day-plan/lib/comicDayStorage';
import type { ComicSceneId } from '@pages/day-plan/lib/comicSceneImages';

/** 개발 메뉴가 만든 커스텀 루틴. 기본 카테고리(책읽기·영양·체중·노트)와 구분한다. */
export const DEV_CONCEPT_FLOW_PREFIX = 'customFlow:dev-concept:' as const;
export const DEV_CONCEPT_DIARY_ID = 'dev-concept-diary';
const MARKER_KEY = 'pokit:dev-concept-mock';
const HISTORY_DAYS = 28;

const BUILTIN_KEYS = ['reading', 'healthIntake', 'fasting', 'work'] as const;
type BuiltinKey = (typeof BUILTIN_KEYS)[number];

type CustomSpec = {
  key: 'checklist' | 'counter';
  groupKey: 'health' | 'productivity';
  face: PostItFaceColorId;
  accent: string;
  startMinutes: number;
  endMinutes: number;
};

const CUSTOM_SPECS: readonly CustomSpec[] = [
  { key: 'checklist', groupKey: 'productivity', face: 'yellow', accent: '#356668', startMinutes: 9 * 60, endMinutes: 9 * 60 + 20 },
  { key: 'counter', groupKey: 'health', face: 'coral', accent: '#B85C38', startMinutes: 19 * 60, endMinutes: 19 * 60 + 30 },
];

const BUILTIN_FACE: Record<BuiltinKey, PostItFaceColorId> = {
  reading: 'butter',
  healthIntake: 'lavender',
  fasting: 'seafoam',
  work: 'sky',
};

const BUILTIN_TIME: Record<BuiltinKey, { startMinutes: number; endMinutes: number }> = {
  reading: { startMinutes: 21 * 60, endMinutes: 21 * 60 + 40 },
  healthIntake: { startMinutes: 8 * 60, endMinutes: 8 * 60 + 15 },
  fasting: { startMinutes: 7 * 60 + 30, endMinutes: 7 * 60 + 40 },
  work: { startMinutes: 14 * 60, endMinutes: 15 * 60 },
};

type Copy = {
  checklistName: string;
  counterName: string;
  checklistSummary: string;
  counterSummary: string;
  intakeSummary: string;
  weightSummary: string;
  noteSummary: string;
  quickMemo: string;
  noteTitle: string;
  noteBody: string;
  booksReading: string[];
  bookWant: string;
  bookDone: string;
  diaryTitle: string;
  diaryFallback: (number: number) => string;
  scenes: Array<Pick<ComicDayScene, 'title' | 'image' | 'time' | 'memo' | 'todos'>>;
};

const COPY: Record<AppLocale, Copy> = {
  ko: {
    checklistName: '오늘 할 일',
    counterName: '푸쉬업',
    checklistSummary: '물 한 잔, 스트레칭, 환기. 아침 것만 끝냈어요.',
    counterSummary: '저녁에 푸쉬업 세트를 채워요.',
    intakeSummary: '아침 영양제는 챙겼고, 점심이 남았어요.',
    weightSummary: '이번 주 체중을 천천히 내리고 있어요.',
    noteSummary: '오늘 떠오른 것만 짧게 적어두었어요.',
    quickMemo: '장보기: 계란, 우유\n충전기 챙기기',
    noteTitle: '오늘 메모',
    noteBody: '오전에 한 덩어리만 끝내고, 저녁에는 책을 읽기로 했다.',
    booksReading: ['어린 왕자', '데미안', '코스모스', '사피엔스', '미드나잇 라이브러리'],
    bookWant: '총, 균, 쇠',
    bookDone: '아몬드',
    diaryTitle: '오늘의 하루',
    diaryFallback: (number) => `만화 일기 ${number}`,
    scenes: [
      { title: '기상', image: 'wake', time: '07:10', memo: '알람 끄고 바로 일어났다.', todos: [] },
      { title: '아침', image: '27-breakfast', time: '08:00', memo: '토스트랑 커피.', todos: [{ id: 'todo-breakfast', text: '물 한 잔', completed: true }] },
      { title: '집중', image: 'focus', time: '10:00', memo: '오전에 한 덩어리만 끝냈다.', todos: [{ id: 'todo-focus', text: '초안 마치기', completed: false }] },
      { title: '산책', image: 'walk', time: '15:30', memo: '공원 한 바퀴.', todos: [] },
      { title: '책읽기', image: 'read', time: '20:10', memo: '30쪽.', todos: [] },
      { title: '잠들기 전', image: '53-diary-in-bed', time: '22:40', memo: '내일 할 일만 적고 덮었다.', todos: [] },
    ],
  },
  en: {
    checklistName: 'Today’s list',
    counterName: 'Push-ups',
    checklistSummary: 'Water, a stretch, and fresh air. Morning is done.',
    counterSummary: 'Finish a push-up set in the evening.',
    intakeSummary: 'Morning nutrition is done. Lunch is still open.',
    weightSummary: 'Bringing weight down slowly this week.',
    noteSummary: 'A short note of what came up today.',
    quickMemo: 'Groceries: eggs, milk\nPack the charger',
    noteTitle: 'Today’s note',
    noteBody: 'Finish one block in the morning, then read in the evening.',
    booksReading: ['The Little Prince', 'Demian', 'Cosmos', 'Sapiens', 'The Midnight Library'],
    bookWant: 'Guns, Germs, and Steel',
    bookDone: 'Almond',
    diaryTitle: 'Today',
    diaryFallback: (number) => `Comic diary ${number}`,
    scenes: [
      { title: 'Wake', image: 'wake', time: '07:10', memo: 'Got up with the alarm.', todos: [] },
      { title: 'Breakfast', image: '27-breakfast', time: '08:00', memo: 'Toast and coffee.', todos: [{ id: 'todo-breakfast', text: 'A glass of water', completed: true }] },
      { title: 'Focus', image: 'focus', time: '10:00', memo: 'Finished one block before noon.', todos: [{ id: 'todo-focus', text: 'Finish the draft', completed: false }] },
      { title: 'Walk', image: 'walk', time: '15:30', memo: 'One loop in the park.', todos: [] },
      { title: 'Reading', image: 'read', time: '20:10', memo: 'Thirty pages.', todos: [] },
      { title: 'Lights out', image: '53-diary-in-bed', time: '22:40', memo: 'Wrote tomorrow’s list and closed it.', todos: [] },
    ],
  },
  ja: {
    checklistName: '今日のやること',
    counterName: '腕立て',
    checklistSummary: '水、ストレッチ、換気。朝の分は終わり。',
    counterSummary: '夜に腕立てのセットを埋める。',
    intakeSummary: '朝の栄養は済ませた。昼が残っている。',
    weightSummary: '今週は体重をゆっくり落としている。',
    noteSummary: '今日思いついたことだけ短く残した。',
    quickMemo: '買い物: 卵、牛乳\n充電器を入れる',
    noteTitle: '今日のメモ',
    noteBody: '午前に一つ終わらせて、夜は本を読む。',
    booksReading: ['星の王子さま', 'デミアン', 'コスモス', 'サピエンス全史', 'ミッドナイト・ライブラリ'],
    bookWant: '銃・病原菌・鉄',
    bookDone: 'アーモンド',
    diaryTitle: '今日の一日',
    diaryFallback: (number) => `漫画日記 ${number}`,
    scenes: [
      { title: '起床', image: 'wake', time: '07:10', memo: 'アラームで起きた。', todos: [] },
      { title: '朝ごはん', image: '27-breakfast', time: '08:00', memo: 'トーストとコーヒー。', todos: [{ id: 'todo-breakfast', text: '水を一杯', completed: true }] },
      { title: '集中', image: 'focus', time: '10:00', memo: '午前に一つ終わらせた。', todos: [{ id: 'todo-focus', text: '下書きを終える', completed: false }] },
      { title: '散歩', image: 'walk', time: '15:30', memo: '公園を一周。', todos: [] },
      { title: '読書', image: 'read', time: '20:10', memo: '30ページ。', todos: [] },
      { title: '就寝前', image: '53-diary-in-bed', time: '22:40', memo: '明日の予定だけ書いて閉じた。', todos: [] },
    ],
  },
};

type StartSpan = { startMinutes: number; endMinutes: number };

type ConceptMarker = {
  routineKeys: string[];
  builtinSnapshots: Partial<Record<BuiltinKey, unknown | null>>;
  orderAdded: string[];
  catalogAdded: string[];
  previousFaces: Record<string, PostItFaceColorId | null>;
  previousStartTimes: Record<string, StartSpan | null>;
  previousQuickMemo: string;
  historyDateKeys: string[];
  scheduledDateKeys: string[];
  comicDiaryId: string;
};

export type ConceptMockSeedResult = {
  routines: number;
  scenes: number;
  historyDays: number;
  scheduledDates: number;
  locale: AppLocale;
  readingTitles: number;
};

export function conceptCategoryKey(templateKey: CustomFlowTemplateKey): string {
  return `${DEV_CONCEPT_FLOW_PREFIX}${templateKey}`;
}

export function isConceptCategoryKey(key: string): boolean {
  return key.startsWith(DEV_CONCEPT_FLOW_PREFIX);
}

export function listConceptCategoryKeys(): string[] {
  return CUSTOM_SPECS.map((spec) => conceptCategoryKey(spec.key));
}

const MIXED_CYCLE = [0.7, 1, 0.4, 0, 0.85, 0.55, 0.15];

/** 오늘이 0. 들쭉날쭉한 한 달. */
export function rateForConceptDay(daysAgo: number): number {
  return MIXED_CYCLE[daysAgo % MIXED_CYCLE.length] ?? 0;
}

export function buildConceptHistoryRows(keys: readonly string[], today: string): HistoryDailyStatRow[] {
  const rows: HistoryDailyStatRow[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const rate = rateForConceptDay(daysAgo);
    const count = Math.round(rate * keys.length);
    const start = daysAgo % Math.max(keys.length, 1);
    const done = Array.from({ length: count }, (_, index) => keys[(start + index) % keys.length]).filter(
      (key): key is string => Boolean(key),
    );
    const categoryCompletions: Record<string, number> = {};
    for (const key of done) categoryCompletions[key] = 1;
    rows.push({
      dateKey: addDaysToLocalDateKey(today, -daysAgo),
      focusMinutes: 0,
      completedFlowCount: done.length,
      sessionCount: done.length,
      completionRate: keys.length === 0 ? 0 : done.length / keys.length,
      categoryMinutes: {},
      categoryCompletions,
    });
  }
  return rows;
}

function copyFor(locale: AppLocale): Copy {
  return COPY[locale] ?? COPY.en;
}

function readMarker(): ConceptMarker | null {
  const raw = localStorageClient.getJson<ConceptMarker>(MARKER_KEY);
  if (!raw || !Array.isArray(raw.routineKeys)) return null;
  return {
    routineKeys: raw.routineKeys.filter((key) => typeof key === 'string'),
    builtinSnapshots: raw.builtinSnapshots ?? {},
    orderAdded: Array.isArray(raw.orderAdded) ? raw.orderAdded.filter((key) => typeof key === 'string') : [],
    catalogAdded: Array.isArray(raw.catalogAdded) ? raw.catalogAdded.filter((key) => typeof key === 'string') : [],
    previousFaces: raw.previousFaces ?? {},
    previousStartTimes: raw.previousStartTimes ?? {},
    previousQuickMemo: typeof raw.previousQuickMemo === 'string' ? raw.previousQuickMemo : '',
    historyDateKeys: Array.isArray(raw.historyDateKeys) ? raw.historyDateKeys.filter((key) => typeof key === 'string') : [],
    scheduledDateKeys: Array.isArray(raw.scheduledDateKeys)
      ? raw.scheduledDateKeys.filter((key) => typeof key === 'string')
      : [],
    comicDiaryId: typeof raw.comicDiaryId === 'string' ? raw.comicDiaryId : DEV_CONCEPT_DIARY_ID,
  };
}

function writeMarker(marker: ConceptMarker): void {
  localStorageClient.setJson(MARKER_KEY, marker);
}

function emptyDraft(today: string): PersistedDayPlanDraft {
  return {
    dailyRolloverVersion: 1,
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
  };
}

function book(
  id: string,
  title: string,
  status: 'reading' | 'want' | 'done',
  addedAtMs: number,
  pageLogs?: Record<string, { startPage: number; targetPage: number }>,
) {
  return {
    id,
    title,
    startPage: 1,
    targetPage: status === 'done' ? 200 : 40,
    status,
    addedAtMs,
    memo: '',
    pageLogs: pageLogs ?? {},
    aladin: null,
    openLibrary: null,
  };
}

function seedBuiltinConfigs(locale: AppLocale, today: string): void {
  const copy = copyFor(locale);
  const now = Date.now();
  const readingBooks = [
    ...copy.booksReading.map((title, index) =>
      book(
        `dev-renew-reading-${index + 1}`,
        title,
        'reading',
        now - index * 1000,
        index === 0 ? { [today]: { startPage: 12, targetPage: 30 } } : undefined,
      ),
    ),
    book('dev-renew-want', copy.bookWant, 'want', now - 20_000),
    book('dev-renew-done', copy.bookDone, 'done', now - 30_000),
  ];
  saveGoalDetailCategoryConfig('reading', {
    displayName: '',
    summary: '',
    books: readingBooks,
    bookTitle: copy.booksReading[0] ?? '',
    startPage: 1,
    targetPage: 40,
  });
  saveGoalDetailCategoryConfig('healthIntake', {
    templateKey: 'healthIntake',
    displayName: '',
    summary: copy.intakeSummary,
    medicine: {
      doseLabel: locale === 'ja' ? 'ビタミン' : locale === 'en' ? 'Multivitamin' : '종합비타민',
      morningOn: true,
      lunchOn: true,
      dinnerOn: true,
      morningTime: '08:00',
      lunchTime: '12:30',
      dinnerTime: '19:00',
      takenCount: 1,
    },
  });
  saveGoalDetailCategoryConfig('fasting', {
    templateKey: 'fasting',
    displayName: '',
    summary: copy.weightSummary,
    currentWeightKg: 70.4,
    targetWeightKg: 65,
    weeklyLossTargetKg: 0.5,
    fastingEnabled: false,
    weightLogs: {
      [addDaysToLocalDateKey(today, -2)]: 71.1,
      [addDaysToLocalDateKey(today, -1)]: 70.8,
      [today]: 70.4,
    },
  });
  saveGoalDetailCategoryConfig('work', {
    displayName: '',
    summary: copy.noteSummary,
    document: {
      activePageId: 'dev-renew-note-1',
      pages: [
        {
          id: 'dev-renew-note-1',
          title: copy.noteTitle,
          createdDateKey: today,
          blocks: [{ id: 'dev-renew-note-block-1', kind: 'paragraph', text: copy.noteBody }],
        },
      ],
    },
  });
}

function seedCustomRoutines(locale: AppLocale): string[] {
  const copy = copyFor(locale);
  const names: Record<CustomSpec['key'], string> = {
    checklist: copy.checklistName,
    counter: copy.counterName,
  };
  const summaries: Record<CustomSpec['key'], string> = {
    checklist: copy.checklistSummary,
    counter: copy.counterSummary,
  };
  const written: string[] = [];
  for (const spec of CUSTOM_SPECS) {
    const categoryKey = conceptCategoryKey(spec.key);
    saveGoalDetailCategoryConfig(categoryKey, {
      ...buildTemplateDemoConfig(spec.key),
      displayName: names[spec.key],
      summary: summaries[spec.key],
      icon: CUSTOM_FLOW_TEMPLATE_ICONS[spec.key],
      accentColor: spec.accent,
    });
    appendCustomFlowCatalogEntry({ id: categoryKey, groupKey: spec.groupKey });
    written.push(categoryKey);
  }
  return written;
}

function snapshotBuiltins(): Partial<Record<BuiltinKey, unknown | null>> {
  const snapshots: Partial<Record<BuiltinKey, unknown | null>> = {};
  for (const key of BUILTIN_KEYS) snapshots[key] = loadGoalDetailCategoryConfig(key);
  return snapshots;
}

function seedTodayDraft(
  today: string,
  keys: string[],
  previousFaces: Record<string, PostItFaceColorId | null>,
): { previousQuickMemo: string } {
  const prev = loadDayPlanDraft() ?? emptyDraft(today);
  const prevOrder = prev.priorityCategoryOrder ?? [];
  const keptOrder = prevOrder.filter((key) => !keys.includes(key) && !isConceptCategoryKey(key));
  const todayDone = buildConceptHistoryRows(keys, today).find((row) => row.dateKey === today);
  const doneKeys = Object.keys(todayDone?.categoryCompletions ?? {});
  const keptDone = (prev.completedFocusCategoryKeys ?? []).filter((key) => !keys.includes(key) && !isConceptCategoryKey(key));
  const face = { ...(prev.priorityCategoryFaceColor ?? {}) };
  for (const key of keys) {
    const previous = face[key];
    previousFaces[key] = isPostItFaceColorId(previous) ? previous : null;
  }
  for (const key of BUILTIN_KEYS) {
    if (keys.includes(key)) face[key] = BUILTIN_FACE[key];
  }
  for (const spec of CUSTOM_SPECS) {
    const categoryKey = conceptCategoryKey(spec.key);
    if (keys.includes(categoryKey)) face[categoryKey] = spec.face;
  }
  for (const key of Object.keys(face)) {
    if (isConceptCategoryKey(key) && !keys.includes(key)) delete face[key];
  }
  saveDayPlanDraft({
    ...prev,
    dailyRolloverVersion: 1,
    planMode: 'priority',
    priorityPlanDateKey: today,
    priorityPlanDateKeyEnd: today,
    priorityPlanExplicitMultiDay: false,
    priorityStart: prev.priorityStart || '07:00',
    priorityEnd: prev.priorityEnd || '23:00',
    priorityCategoryOrder: [...keys, ...keptOrder],
    priorityCategoryFaceColor: face,
    completedFocusCategoryKeys: [...doneKeys, ...keptDone],
    priorityEndedTodayKeys: (prev.priorityEndedTodayKeys ?? []).filter((key) => !keys.includes(key)),
    quickMemoDraft: copyFor(getAppLocale()).quickMemo,
  });
  return { previousQuickMemo: prev.quickMemoDraft ?? '' };
}

function seedStartTimes(keys: string[], previous: Record<string, StartSpan | null>): void {
  const current = loadRoutineStartTimes();
  const byCategoryKey = { ...current.byCategoryKey };
  for (const key of keys) previous[key] = byCategoryKey[key] ?? null;
  for (const key of Object.keys(byCategoryKey)) {
    if (isConceptCategoryKey(key) && !keys.includes(key)) delete byCategoryKey[key];
  }
  for (const key of BUILTIN_KEYS) {
    if (keys.includes(key)) byCategoryKey[key] = BUILTIN_TIME[key];
  }
  for (const spec of CUSTOM_SPECS) {
    const categoryKey = conceptCategoryKey(spec.key);
    if (!keys.includes(categoryKey)) continue;
    byCategoryKey[categoryKey] = { startMinutes: spec.startMinutes, endMinutes: spec.endMinutes };
  }
  saveRoutineStartTimes({ byCategoryKey });
}

function seedSchedule(today: string, keys: string[]): string[] {
  const tomorrow = addDaysToLocalDateKey(today, 1);
  const later = addDaysToLocalDateKey(today, 3);
  const dates = [today, tomorrow, later];
  let plan = loadScheduledRoutinePlan();
  const previous = readMarker();
  for (const dateKey of previous?.scheduledDateKeys ?? []) {
    plan = setScheduledCategoryKeysForDate(plan, dateKey, []);
  }
  const slices = [keys, keys.slice(0, 3), keys.slice(3)];
  dates.forEach((dateKey, index) => {
    plan = setScheduledCategoryKeysForDate(plan, dateKey, slices[index] ?? []);
  });
  saveScheduledRoutinePlan(plan);
  return dates;
}

function seedComic(today: string, locale: AppLocale): number {
  const copy = copyFor(locale);
  const scenes: ComicDayScene[] = copy.scenes.map((scene, index) => ({
    id: `dev-concept-scene-${index + 1}`,
    title: scene.title,
    image: scene.image as ComicSceneId,
    time: scene.time,
    memo: scene.memo,
    todos: scene.todos,
    paper: '#FEFEFE',
    pen: '#202020',
  }));
  const now = Date.now();
  const diary: ComicDiary = {
    id: DEV_CONCEPT_DIARY_ID,
    title: copy.diaryTitle,
    characterId: DEFAULT_COMIC_CHARACTER_ID,
    scenes,
    createdAt: now,
    updatedAt: now,
  };
  const current = loadComicDiaryLibrary(today, copy.diaryFallback);
  saveComicDiaryLibrary({
    version: 1,
    diaries: [diary, ...current.diaries.filter((item) => item.id !== DEV_CONCEPT_DIARY_ID)],
    activeId: diary.id,
    migratedLegacyKeys: current.migratedLegacyKeys,
  });
  return scenes.length;
}

function seedHistory(keys: string[], today: string): string[] {
  const seeded = buildConceptHistoryRows(keys, today);
  const seededDates = new Set(seeded.map((row) => row.dateKey));
  const previous = new Set(readMarker()?.historyDateKeys ?? []);
  const kept = loadHistoryDailyStats().filter((row) => !seededDates.has(row.dateKey) && !previous.has(row.dateKey));
  saveHistoryDailyStats([...kept, ...seeded]);
  saveHistoryMeta({ lastUpdatedAt: new Date().toISOString(), schemaVersion: 1 });
  return seeded.map((row) => row.dateKey);
}

function eraseMarkedMock(marker: ConceptMarker | null): void {
  if (!marker) return;
  const customKeys = new Set(marker.routineKeys.filter((key) => isConceptCategoryKey(key)));
  for (const key of customKeys) {
    removeCustomFlowCatalogId(key);
    removeGoalDetailCategoryConfig(key);
  }
  for (const key of BUILTIN_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(marker.builtinSnapshots, key)) continue;
    const snapshot = marker.builtinSnapshots[key];
    if (snapshot == null) removeGoalDetailCategoryConfig(key);
    else saveGoalDetailCategoryConfig(key, snapshot);
  }
  const dropFromLists = new Set([...customKeys, ...marker.orderAdded, ...marker.catalogAdded]);
  saveRoutineCatalogSelectionKeys(loadRoutineCatalogSelectionKeys().filter((key) => !dropFromLists.has(key)));

  const draft = loadDayPlanDraft();
  if (draft) {
    const face = { ...(draft.priorityCategoryFaceColor ?? {}) };
    for (const key of [...customKeys, ...BUILTIN_KEYS]) {
      if (!Object.prototype.hasOwnProperty.call(marker.previousFaces, key)) continue;
      const previous = marker.previousFaces[key];
      if (previous == null) delete face[key];
      else face[key] = previous;
    }
    saveDayPlanDraft({
      ...draft,
      priorityCategoryOrder: (draft.priorityCategoryOrder ?? []).filter((key) => !dropFromLists.has(key) && !customKeys.has(key)),
      prioritySectionsCategoryOrder: (draft.prioritySectionsCategoryOrder ?? []).filter((key) => !dropFromLists.has(key)),
      completedFocusCategoryKeys: (draft.completedFocusCategoryKeys ?? []).filter(
        (key) => !customKeys.has(key) && !Object.prototype.hasOwnProperty.call(marker.builtinSnapshots, key),
      ),
      priorityCategoryFaceColor: face,
      quickMemoDraft: marker.previousQuickMemo,
    });
  }

  const times = loadRoutineStartTimes();
  const byCategoryKey = { ...times.byCategoryKey };
  for (const key of Object.keys(byCategoryKey)) {
    if (customKeys.has(key)) delete byCategoryKey[key];
  }
  for (const [key, span] of Object.entries(marker.previousStartTimes)) {
    if (span == null) delete byCategoryKey[key];
    else byCategoryKey[key] = span;
  }
  saveRoutineStartTimes({ byCategoryKey });

  let plan = loadScheduledRoutinePlan();
  for (const dateKey of marker.scheduledDateKeys) {
    plan = setScheduledCategoryKeysForDate(plan, dateKey, []);
  }
  saveScheduledRoutinePlan(plan);

  const today = getLocalDateKey();
  const copy = copyFor(getAppLocale());
  const library = loadComicDiaryLibrary(today, copy.diaryFallback);
  const diaries = library.diaries.filter((diary) => diary.id !== marker.comicDiaryId);
  saveComicDiaryLibrary({
    ...library,
    diaries,
    activeId: library.activeId === marker.comicDiaryId ? diaries[0]?.id ?? null : library.activeId,
  });

  const historyDates = new Set(marker.historyDateKeys);
  if (historyDates.size > 0) {
    saveHistoryDailyStats(loadHistoryDailyStats().filter((row) => !historyDates.has(row.dateKey)));
  }
  localStorageClient.removeItem(MARKER_KEY);
}

async function reloadAfterConceptSeed(): Promise<void> {
  await flushLocalStorageClientWrites();
  useHistoryStore.getState().reloadFromStorage();
  useGoalDetailSettingsStore.getState().reloadAllFromStorage();
  useScheduledRoutinePlanStore.setState({ isHydrated: false });
  useScheduledRoutinePlanStore.getState().hydrate();
  useRoutineStartTimesStore.setState({ isHydrated: false });
  useRoutineStartTimesStore.getState().hydrate();
  useDayPlanDraftStore.setState({ isHydrated: false });
  useDayPlanDraftStore.getState().hydrate();
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
}

export async function seedConceptMock(): Promise<ConceptMockSeedResult> {
  eraseMarkedMock(readMarker());
  const locale = getAppLocale();
  const today = getLocalDateKey();
  const builtinSnapshots = snapshotBuiltins();
  seedBuiltinConfigs(locale, today);
  const customKeys = seedCustomRoutines(locale);
  const keys = [...BUILTIN_KEYS, ...customKeys];
  const catalogBefore = new Set(loadRoutineCatalogSelectionKeys());
  const catalogAdded = keys.filter((key) => !catalogBefore.has(key));
  appendGoalDetailCommittedCategoryKeys(keys);
  appendRoutineCatalogSelectionKeys(catalogAdded);
  const draftBefore = loadDayPlanDraft();
  const orderBefore = new Set(draftBefore?.priorityCategoryOrder ?? []);
  const orderAdded = keys.filter((key) => !orderBefore.has(key));
  const previousFaces: Record<string, PostItFaceColorId | null> = {};
  const previousStartTimes: Record<string, StartSpan | null> = {};
  const { previousQuickMemo } = seedTodayDraft(today, keys, previousFaces);
  seedStartTimes(keys, previousStartTimes);
  const scheduledDateKeys = seedSchedule(today, keys);
  const scenes = seedComic(today, locale);
  const historyDateKeys = seedHistory(keys, today);
  if (!loadDailyRhythmOnboardingCompleted()) markDailyRhythmOnboardingCompleted();
  writeMarker({
    routineKeys: customKeys,
    builtinSnapshots,
    orderAdded,
    catalogAdded,
    previousFaces,
    previousStartTimes,
    previousQuickMemo,
    historyDateKeys,
    scheduledDateKeys,
    comicDiaryId: DEV_CONCEPT_DIARY_ID,
  });
  await reloadAfterConceptSeed();
  return {
    routines: keys.length,
    scenes,
    historyDays: historyDateKeys.length,
    scheduledDates: scheduledDateKeys.length,
    locale,
    readingTitles: copyFor(locale).booksReading.length,
  };
}

export async function clearConceptMock(): Promise<void> {
  eraseMarkedMock(readMarker());
  await reloadAfterConceptSeed();
}
