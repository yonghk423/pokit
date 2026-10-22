import {
  addDaysToLocalDateKey,
  buildTemplateDemoConfig,
  CUSTOM_FLOW_TEMPLATE_ICONS,
  getLocalDateKey,
  listCustomFlowTemplateCatalogEntries,
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

/** 개발 메뉴 목업 루틴. 만들 수 있는 템플릿만 쓴다. */
export const DEV_CONCEPT_FLOW_PREFIX = 'customFlow:dev-concept:' as const;
export const DEV_CONCEPT_DIARY_ID = 'dev-concept-diary';
const MARKER_KEY = 'pokit:dev-concept-mock';
const HISTORY_DAYS = 28;

export type ConceptHistoryProfile = 'mixed' | 'low' | 'strong';

type ConceptSpec = {
  key: CustomFlowTemplateKey;
  groupKey: 'health' | 'productivity';
  face: PostItFaceColorId;
  accent: string;
  startMinutes: number;
  endMinutes: number;
};

const SPECS: readonly ConceptSpec[] = [
  { key: 'checklist', groupKey: 'productivity', face: 'yellow', accent: '#356668', startMinutes: 7 * 60 + 30, endMinutes: 8 * 60 + 10 },
  { key: 'healthIntake', groupKey: 'health', face: 'lavender', accent: '#7A4E8C', startMinutes: 8 * 60 + 20, endMinutes: 8 * 60 + 40 },
  { key: 'fasting', groupKey: 'health', face: 'seafoam', accent: '#2F6F5E', startMinutes: 12 * 60, endMinutes: 20 * 60 },
  { key: 'counter', groupKey: 'health', face: 'coral', accent: '#B85C38', startMinutes: 18 * 60, endMinutes: 18 * 60 + 40 },
  { key: 'measurement', groupKey: 'health', face: 'sky', accent: '#C45C26', startMinutes: 21 * 60, endMinutes: 21 * 60 + 10 },
  { key: 'reminder', groupKey: 'productivity', face: 'mint', accent: '#3D6FA8', startMinutes: 9 * 60, endMinutes: 21 * 60 + 30 },
  { key: 'memo', groupKey: 'productivity', face: 'butter', accent: '#5B6B8C', startMinutes: 22 * 60, endMinutes: 22 * 60 + 20 },
];

const NAMES: Record<AppLocale, Record<ConceptSpec['key'], string>> = {
  ko: {
    checklist: '오늘 할 일',
    healthIntake: '영양·물',
    fasting: '간헐적 단식',
    counter: '푸쉬업',
    measurement: '체중',
    reminder: '하루 알림',
    memo: '빠른 메모',
  },
  en: {
    checklist: 'Today’s list',
    healthIntake: 'Vitamins & water',
    fasting: 'Intermittent fast',
    counter: 'Push-ups',
    measurement: 'Weight',
    reminder: 'Day reminders',
    memo: 'Quick memo',
  },
  ja: {
    checklist: '今日のやること',
    healthIntake: '栄養と水',
    fasting: '断食',
    counter: '腕立て',
    measurement: '体重',
    reminder: '一日の通知',
    memo: 'クイックメモ',
  },
};

type ComicCopy = {
  title: string;
  fallbackTitle: (number: number) => string;
  scenes: Array<Pick<ComicDayScene, 'title' | 'image' | 'time' | 'memo' | 'todos'>>;
};

const COMIC: Record<AppLocale, ComicCopy> = {
  ko: {
    title: '오늘의 하루',
    fallbackTitle: (number) => `만화 일기 ${number}`,
    scenes: [
      { title: '기상', image: 'wake', time: '07:10', memo: '알람 끄고 바로 일어났다.', todos: [] },
      { title: '아침', image: '27-breakfast', time: '08:00', memo: '토스트랑 커피.', todos: [{ id: 'todo-breakfast', text: '물 한 잔', completed: true }] },
      { title: '집중', image: 'focus', time: '10:00', memo: '오전에 한 덩어리만 끝냈다.', todos: [{ id: 'todo-focus', text: '초안 마치기', completed: false }] },
      { title: '산책', image: 'walk', time: '15:30', memo: '공원 한 바퀴.', todos: [] },
      { title: '독서', image: 'read', time: '20:10', memo: '30쪽.', todos: [] },
      { title: '잠들기 전', image: '53-diary-in-bed', time: '22:40', memo: '내일 할 일만 적고 덮었다.', todos: [] },
    ],
  },
  en: {
    title: 'Today',
    fallbackTitle: (number) => `Comic diary ${number}`,
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
    title: '今日の一日',
    fallbackTitle: (number) => `漫画日記 ${number}`,
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

type ConceptMarker = {
  routineKeys: string[];
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
  profile: ConceptHistoryProfile;
};

export function conceptCategoryKey(templateKey: CustomFlowTemplateKey): string {
  return `${DEV_CONCEPT_FLOW_PREFIX}${templateKey}`;
}

export function isConceptCategoryKey(key: string): boolean {
  return key.startsWith(DEV_CONCEPT_FLOW_PREFIX);
}

export function listConceptCategoryKeys(): string[] {
  const creatable = new Set(listCustomFlowTemplateCatalogEntries().map((entry) => entry.key));
  return SPECS.filter((spec) => creatable.has(spec.key)).map((spec) => conceptCategoryKey(spec.key));
}

/** 오늘이 0. 혼합은 들쭉날쭉, 저달성는 최근 2주가 낮고, 고달성는 거의 매일 채운다. */
export function rateForConceptDay(profile: ConceptHistoryProfile, daysAgo: number): number {
  if (profile === 'strong') return daysAgo % 6 === 0 ? 0.85 : 1;
  if (profile === 'low') {
    if (daysAgo === 0) return 0.15;
    if (daysAgo < 14) return daysAgo % 4 === 0 ? 0.3 : 0;
    return 0.7;
  }
  const cycle = [0.7, 1, 0.4, 0, 0.85, 0.55, 0.15];
  return cycle[daysAgo % cycle.length] ?? 0;
}

export function buildConceptHistoryRows(
  profile: ConceptHistoryProfile,
  keys: readonly string[],
  today: string,
): HistoryDailyStatRow[] {
  const rows: HistoryDailyStatRow[] = [];
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const rate = rateForConceptDay(profile, daysAgo);
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

function namesFor(locale: AppLocale): Record<ConceptSpec['key'], string> {
  return NAMES[locale] ?? NAMES.en;
}

function readMarker(): ConceptMarker | null {
  const raw = localStorageClient.getJson<ConceptMarker>(MARKER_KEY);
  if (!raw || !Array.isArray(raw.routineKeys)) return null;
  return {
    routineKeys: raw.routineKeys.filter((key) => typeof key === 'string'),
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

function seedRoutines(locale: AppLocale, keys: string[]): string[] {
  const names = namesFor(locale);
  const creatable = new Set(listCustomFlowTemplateCatalogEntries().map((entry) => entry.key));
  const written: string[] = [];
  for (const spec of SPECS) {
    if (!creatable.has(spec.key)) continue;
    const categoryKey = conceptCategoryKey(spec.key);
    const config = {
      ...buildTemplateDemoConfig(spec.key),
      displayName: names[spec.key],
      icon: CUSTOM_FLOW_TEMPLATE_ICONS[spec.key],
      accentColor: spec.accent,
    };
    saveGoalDetailCategoryConfig(categoryKey, config);
    appendCustomFlowCatalogEntry({ id: categoryKey, groupKey: spec.groupKey });
    written.push(categoryKey);
  }
  appendGoalDetailCommittedCategoryKeys(written);
  appendRoutineCatalogSelectionKeys(written);
  return written.length > 0 ? written : keys;
}

function seedTodayDraft(today: string, keys: string[], profile: ConceptHistoryProfile): void {
  const prev = loadDayPlanDraft() ?? emptyDraft(today);
  const keptOrder = (prev.priorityCategoryOrder ?? []).filter((key) => !isConceptCategoryKey(key));
  const todayDone = buildConceptHistoryRows(profile, keys, today).find((row) => row.dateKey === today);
  const doneKeys = Object.keys(todayDone?.categoryCompletions ?? {});
  const keptDone = (prev.completedFocusCategoryKeys ?? []).filter((key) => !isConceptCategoryKey(key));
  const face = { ...(prev.priorityCategoryFaceColor ?? {}) };
  for (const key of Object.keys(face)) {
    if (isConceptCategoryKey(key)) delete face[key];
  }
  for (const spec of SPECS) {
    const categoryKey = conceptCategoryKey(spec.key);
    if (keys.includes(categoryKey)) face[categoryKey] = spec.face;
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
    priorityCategoryOrder: [...keys, ...keptOrder.filter((key) => !keys.includes(key))],
    priorityCategoryFaceColor: face,
    completedFocusCategoryKeys: [...doneKeys, ...keptDone],
    priorityEndedTodayKeys: (prev.priorityEndedTodayKeys ?? []).filter((key) => !isConceptCategoryKey(key)),
  });
}

function seedStartTimes(keys: string[]): void {
  const current = loadRoutineStartTimes();
  const byCategoryKey = { ...current.byCategoryKey };
  for (const key of Object.keys(byCategoryKey)) {
    if (isConceptCategoryKey(key)) delete byCategoryKey[key];
  }
  for (const spec of SPECS) {
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
  const slices = [keys, keys.slice(0, 3), keys.slice(3, 6)];
  dates.forEach((dateKey, index) => {
    plan = setScheduledCategoryKeysForDate(plan, dateKey, slices[index] ?? []);
  });
  saveScheduledRoutinePlan(plan);
  return dates;
}

function seedComic(today: string, locale: AppLocale): number {
  const copy = COMIC[locale] ?? COMIC.en;
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
    title: copy.title,
    characterId: DEFAULT_COMIC_CHARACTER_ID,
    scenes,
    createdAt: now,
    updatedAt: now,
  };
  const current = loadComicDiaryLibrary(today, copy.fallbackTitle);
  saveComicDiaryLibrary({
    version: 1,
    diaries: [diary, ...current.diaries.filter((item) => item.id !== DEV_CONCEPT_DIARY_ID)],
    activeId: diary.id,
    migratedLegacyKeys: current.migratedLegacyKeys,
  });
  return scenes.length;
}

function seedHistory(profile: ConceptHistoryProfile, keys: string[], today: string): string[] {
  const seeded = buildConceptHistoryRows(profile, keys, today);
  const seededDates = new Set(seeded.map((row) => row.dateKey));
  const previous = new Set(readMarker()?.historyDateKeys ?? []);
  const kept = loadHistoryDailyStats().filter((row) => !seededDates.has(row.dateKey) && !previous.has(row.dateKey));
  saveHistoryDailyStats([...kept, ...seeded]);
  saveHistoryMeta({ lastUpdatedAt: new Date().toISOString(), schemaVersion: 1 });
  return seeded.map((row) => row.dateKey);
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

export async function seedConceptMock(profile: ConceptHistoryProfile = 'mixed'): Promise<ConceptMockSeedResult> {
  const locale = getAppLocale();
  const today = getLocalDateKey();
  const keys = seedRoutines(locale, listConceptCategoryKeys());
  seedTodayDraft(today, keys, profile);
  seedStartTimes(keys);
  const scheduledDateKeys = seedSchedule(today, keys);
  const scenes = seedComic(today, locale);
  const historyDateKeys = seedHistory(profile, keys, today);
  if (!loadDailyRhythmOnboardingCompleted()) markDailyRhythmOnboardingCompleted();
  writeMarker({
    routineKeys: keys,
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
    profile,
  };
}

export async function clearConceptMock(): Promise<void> {
  const marker = readMarker();
  const keys = new Set([...(marker?.routineKeys ?? []), ...listConceptCategoryKeys()]);
  for (const key of keys) {
    removeCustomFlowCatalogId(key);
    removeGoalDetailCategoryConfig(key);
  }
  saveRoutineCatalogSelectionKeys(loadRoutineCatalogSelectionKeys().filter((key) => !keys.has(key)));

  const draft = loadDayPlanDraft();
  if (draft) {
    const face = { ...(draft.priorityCategoryFaceColor ?? {}) };
    for (const key of Object.keys(face)) {
      if (keys.has(key)) delete face[key];
    }
    saveDayPlanDraft({
      ...draft,
      priorityCategoryOrder: (draft.priorityCategoryOrder ?? []).filter((key) => !keys.has(key)),
      prioritySectionsCategoryOrder: (draft.prioritySectionsCategoryOrder ?? []).filter((key) => !keys.has(key)),
      completedFocusCategoryKeys: (draft.completedFocusCategoryKeys ?? []).filter((key) => !keys.has(key)),
      priorityCategoryFaceColor: face,
    });
  }

  const times = loadRoutineStartTimes();
  const byCategoryKey = { ...times.byCategoryKey };
  for (const key of Object.keys(byCategoryKey)) {
    if (keys.has(key)) delete byCategoryKey[key];
  }
  saveRoutineStartTimes({ byCategoryKey });

  let plan = loadScheduledRoutinePlan();
  for (const dateKey of marker?.scheduledDateKeys ?? []) {
    plan = setScheduledCategoryKeysForDate(plan, dateKey, []);
  }
  saveScheduledRoutinePlan(plan);

  const today = getLocalDateKey();
  const locale = getAppLocale();
  const copy = COMIC[locale] ?? COMIC.en;
  const library = loadComicDiaryLibrary(today, copy.fallbackTitle);
  const diaryId = marker?.comicDiaryId ?? DEV_CONCEPT_DIARY_ID;
  const diaries = library.diaries.filter((diary) => diary.id !== diaryId);
  saveComicDiaryLibrary({
    ...library,
    diaries,
    activeId: library.activeId === diaryId ? diaries[0]?.id ?? null : library.activeId,
  });

  const historyDates = new Set(marker?.historyDateKeys ?? []);
  if (historyDates.size > 0) {
    saveHistoryDailyStats(loadHistoryDailyStats().filter((row) => !historyDates.has(row.dateKey)));
  }

  localStorageClient.removeItem(MARKER_KEY);
  await reloadAfterConceptSeed();
}
