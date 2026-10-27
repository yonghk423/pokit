import { buildInitialCustomFlowDetailConfig, normalizeCustomFlowDetailConfig, type CustomFlowTemplateKey } from '@entities/day-plan/lib/customFlowTemplate';
import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import type { ComicDayScene } from '@pages/day-plan/lib/heroDayStorage';
import { initialServiceProgress } from '@pages/welcome-intro/model/serviceTutorial';
import type { AppLocale } from '@shared/lib/i18n';
import { localStorageClient, getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { saveGoalDetailCategoryConfig, appendGoalDetailCommittedCategoryKeys } from '@shared/lib/storage/goalDetailSettingsStorage';
import { saveDayPlanDraft } from '@shared/lib/storage/dayPlanDraftStorage';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { bookstoreSceneCopy, mockCopy, sceneImages } from './mockCopy';

export const MOCK_DATA_VERSION = 1;
const SEED_KEY = 'pokit:mock-data-version';
const sceneTimes = ['07:10', '07:45', '09:20', '13:10', '18:30', '22:15', '14:00', '15:30', '12:40', '17:00', '08:10', '09:00', '13:00', '16:30', '17:20'];
function bookstoreScene(locale: AppLocale): ComicDayScene {
  const [title, memo, tasks] = bookstoreSceneCopy[locale];
  return { id: `mock-scene:${locale}:bookstore-daily`, title, memo, image: '56-bookstore', time: '19:10',
    paper: '#FFFFFF', pen: '#252822', todos: tasks.map((text, i) => ({ id: `mock-bookstore-task:${i}`, text, completed: i === 0 })) };
}
/** Add new preview content without replacing diary edits or mate records. */
function addBookstoreToExistingMock(locale: AppLocale): boolean {
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
  const dailyId = `mock-diary:${locale}:0`;
  const daily = library?.diaries?.find(diary => diary.id === dailyId);
  if (!library || !daily) return false;
  const seed = bookstoreScene(locale);
  const existingBookstore = daily.scenes.find(scene => scene.id === seed.id || scene.image === '56-bookstore');
  if (existingBookstore) {
    // An earlier preview may have saved the artwork without the mock memo or todos.
    // Fill only empty fields so any edits already made by the user stay intact.
    const completedScene = {
      ...existingBookstore,
      title: existingBookstore.title.trim() ? existingBookstore.title : seed.title,
      memo: existingBookstore.memo.trim() ? existingBookstore.memo : seed.memo,
      todos: existingBookstore.todos.length ? existingBookstore.todos : seed.todos,
    };
    if (completedScene.title === existingBookstore.title
      && completedScene.memo === existingBookstore.memo
      && completedScene.todos === existingBookstore.todos) return false;
    localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, {
      ...library,
      diaries: library.diaries.map(diary => diary.id === dailyId
        ? { ...diary, scenes: diary.scenes.map(scene => scene.id === existingBookstore.id ? completedScene : scene) }
        : diary),
    });
    return true;
  }
  const scenes = [...daily.scenes];
  const eveningIndex = scenes.findIndex(scene => scene.time > '19:10');
  scenes.splice(eveningIndex < 0 ? scenes.length : eveningIndex, 0, seed);
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries: library.diaries.map(diary => diary.id === dailyId ? { ...diary, scenes } : diary) });
  return true;
}
/** Pure builder: the same local dates and stable ids make previews reproducible. */
export function buildMockDiaries(locale: AppLocale, date: string): ComicDiaryLibrary {
  const copy = mockCopy[locale];
  const groups = [[0, 6, 0], [6, 10, -2], [10, 15, -1]];
  const diaries = groups.map(([start, end, offset], index) => {
    const day = addDaysToLocalDateKey(date, offset);
    const timestamp = new Date(`${day}T12:00:00`).getTime();
    const scenes: ComicDayScene[] = copy.scenes.slice(start, end).map(([title, memo, tasks], j) => ({
      id: `mock-scene:${locale}:${start + j}`, title, memo, image: sceneImages[start + j], time: sceneTimes[start + j],
      paper: '#FFFFFF', pen: '#252822',
      todos: tasks.map((text, k) => ({ id: `mock-task:${start + j}:${k}`, text, completed: k === 0 || (j < 2 && k < 2) })),
    }));
    if (index === 0) scenes.splice(5, 0, bookstoreScene(locale));
    return { id: `mock-diary:${locale}:${index}`, title: `${day.slice(5).replace('-', '/')} · ${copy.titles[index]}`, characterId: index === 2 ? 'puppy-companion' : 'protagonist-1', characterName: index === 2 ? copy.puppy : copy.name, scenes, createdAt: timestamp, updatedAt: timestamp };
  });
  return { version: 1, diaries, activeId: diaries[0].id, migratedLegacyKeys: [] };
}

export function buildMockMates(locale: AppLocale, date: string) {
  const copy = mockCopy[locale];
  const templates: CustomFlowTemplateKey[] = ['checklist', 'checklist', 'checklist', 'memo', 'counter', 'counter', 'measurement', 'checklist'];
  const icons = ['routine:stretching', 'routine:work', 'routine:shopping', 'routine:journal', 'routine:reading', 'routine:water', 'routine:exercise', 'routine:sleep'];
  const checklistForMate: Record<number, number> = { 0: 0, 1: 1, 2: 2, 7: 3 };
  return templates.map((template, i) => {
    const id = `customFlow:mock-preview:${locale}:${i}`;
    const base = buildInitialCustomFlowDetailConfig(template, { displayName: copy.mateNames[i], summary: copy.summaries[i], icon: icons[i], accentColor: '#737A6A' });
    let records: Record<string, unknown> = {};
    if (template === 'checklist') records = { checklist: copy.checklists[checklistForMate[i]].map((text, j) => ({ id: `${id}:task:${j}`, text, done: i === 0 ? true : j < (i === 1 ? 2 : 1) })) };
    if (template === 'memo') records = { lastEntry: copy.notes[0][0], recentEntries: copy.notes[0].map((text, j) => ({ dateKey: addDaysToLocalDateKey(date, -j), text })) };
    if (template === 'counter') records = {
      activityLabel: copy.mateNames[i], unitKey: 'custom', customUnitLabel: i === 4 ? { ko: '쪽', en: 'pages', ja: 'ページ', 'zh-TW': '頁' }[locale] : { ko: '잔', en: 'glasses', ja: '杯', 'zh-TW': '杯' }[locale],
      goalCount: i === 4 ? 30 : 8, currentCount: i === 4 ? 18 : 5, stepSize: 1, secondaryStepSize: i === 4 ? 10 : 2, dailyReset: true, countDateKey: date,
      history: Array.from({ length: 7 }, (_, j) => ({ dateKey: addDaysToLocalDateKey(date, j - 6), count: i === 4 ? [24, 32, 15, 0, 38, 30, 18][j] : [6, 8, 7, 4, 8, 6, 5][j] })),
    };
    if (template === 'measurement') records = { metricLabel: { ko: '아침 체중', en: 'Morning weight', ja: '朝の体重', 'zh-TW': '早晨體重' }[locale], unit: 'kg', currentValue: 61.4, previousValue: 61.7, useGoalValue: true, goalValue: 60, lastRecordedDateKey: date, frequency: 'once', history: Array.from({ length: 7 }, (_, j) => ({ dateKey: addDaysToLocalDateKey(date, j - 6), value: [61.9, 61.7, 61.8, 61.6, 61.5, 61.7, 61.4][j] })) };
    return { id, groupKey: i === 5 || i === 6 ? 'health' : 'productivity', config: normalizeCustomFlowDetailConfig(template, { ...base, ...records }) };
  });
}

/** Writes only into the explicitly selected development namespace. */
export function ensureDevelopmentMockData(force = false, date = getLocalDateKey()): boolean {
  if (!__DEV__) return false;
  const locale = getDevelopmentStorageProfile();
  if (!locale) return false;
  const version = `${MOCK_DATA_VERSION}:${date}`;
  if (!force && localStorageClient.getItemRaw(SEED_KEY) === version) {
    const existing = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
    if (Array.isArray(existing?.diaries) && existing.diaries.length > 0) return addBookstoreToExistingMock(locale);
    // The seed marker can survive a deleted/empty library. Repair only the
    // missing diary preview, preserving edits to mates and other mock records.
    const diaries = buildMockDiaries(locale, date);
    localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, diaries);
    localStorageClient.setJson('pokit:comic-navigation', { characterId: 'protagonist-1', screen: 'board', diaryId: diaries.activeId });
    return true;
  }
  const diaries = buildMockDiaries(locale, date);
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, diaries);
  localStorageClient.setJson('pokit:comic-navigation', { characterId: 'protagonist-1', screen: 'board', diaryId: diaries.activeId });
  const mates = buildMockMates(locale, date);
  mates.forEach(mate => saveGoalDetailCategoryConfig(mate.id, mate.config));
  appendGoalDetailCommittedCategoryKeys(mates.map(mate => mate.id));
  localStorageClient.setJson(StorageKeys.customFlowCatalog, { items: mates.map(({ id, groupKey }) => ({ id, groupKey })) });
  localStorageClient.setJson(StorageKeys.priorityCatalogFixedRoutines, { manualSelectionKeys: mates.map(mate => mate.id) });
  const keys = mates.map(mate => mate.id);
  saveDayPlanDraft({ dailyRolloverVersion: 1, planMode: 'priority', isFocusStarted: true, completedFocusCategoryKeys: [keys[0]], planCompletionDismissedKeys: [], priorityPlanDateKey: date, priorityPlanDateKeyEnd: date, priorityPlanExplicitMultiDay: false, priorityOvernightEndAuto: false, priorityStart: '00:00', priorityEnd: '23:59', priorityCategoryOrder: keys, quickMemoDraft: mockCopy[locale].notes[0][0], priorityMealSlotLayoutEnabled: false, prioritySpineLayoutEnabled: false });
  localStorageClient.setJson(StorageKeys.routineStartTimes, { byCategoryKey: Object.fromEntries(keys.map((key, i) => [key, { startMinutes: [420, 540, 1080, 780, 810, 900, 430, 1320][i], endMinutes: [435, 600, 1110, 795, 840, 910, 440, 1350][i] }])) });
  // Mock browsing starts in the actual app, without onboarding or review prompts.
  localStorageClient.setJson('pokit:service-tutorial-v2', { ...initialServiceProgress, completed: ['comic', 'rhythm'], step: 'finish', dismissed: true });
  localStorageClient.setJson('pokit:tutorial-media-v1', { introSeen: true, reviewRequested: true });
  localStorageClient.setJson(StorageKeys.welcomeIntro, { seen: true });
  localStorageClient.setJson(StorageKeys.dailyRhythmOnboarding, { completed: true });
  localStorageClient.setItemRaw(SEED_KEY, version);
  return true;
}
