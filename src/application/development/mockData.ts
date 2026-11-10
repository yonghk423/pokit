import { buildInitialCustomFlowDetailConfig, normalizeCustomFlowDetailConfig, type CustomFlowTemplateKey } from '@entities/day-plan/lib/customFlowTemplate';
import { addDaysToLocalDateKey, getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import type { ComicDayScene } from '@pages/day-plan/lib/heroDayStorage';
import { COMIC_PAPER_COLORS, COMIC_PEN_COLORS } from '@pages/day-plan/lib/heroScenePalette';
import { initialServiceProgress } from '@pages/welcome-intro/model/serviceTutorial';
import type { AppLocale } from '@shared/lib/i18n';
import { clearPokitLocalStorage, localStorageClient, getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { mockCopy } from './mockCopy';
import { getMockProtagonist, getMockProtagonistName, getMockSceneImages } from './mockProtagonists';
import { developmentArtworkUri } from './mockArtwork';

export const MOCK_DATA_VERSION = 7;
const SEED_KEY = 'pokit:mock-data-version';
const COLOR_STYLE_KEY = 'pokit:mock-color-style-version';
const COLOR_STYLE_VERSION = JSON.stringify([2, COMIC_PAPER_COLORS, COMIC_PEN_COLORS]);
const sceneTimes = ['07:10', '07:45', '09:20', '13:10', '18:30', '22:15', '14:00', '15:30', '12:40', '17:00', '08:10', '09:00', '13:00', '16:30', '17:20'];
const canvasStories: Record<AppLocale, string> = {
  en: 'The morning felt busier than I expected. I took a breath on the way to work, made it through a difficult meeting, and stepped outside for lunch to look at the sky. After work, I went for a short run and came home ready for a quiet evening. Nothing extraordinary happened, but there were small moments I want to remember: the warm light through the windows, a kind message from a friend, and the feeling of finally slowing down.',
  ko: '생각보다 분주한 아침이었다. 출근길에 잠시 숨을 고르고, 어려웠던 회의를 마친 뒤 점심에는 밖으로 나가 하늘을 바라봤다. 퇴근 후에는 짧게 달리고 집에 돌아와 조용한 저녁을 보냈다. 특별한 일은 없었지만 창문으로 들어오던 따뜻한 빛, 친구가 보내준 다정한 메시지, 그리고 마침내 천천히 쉬는 기분을 기억하고 싶다.',
  ja: '思っていたより慌ただしい朝だった。通勤中にひと息つき、少し大変な会議を終えてから、昼休みに外へ出て空を眺めた。仕事のあとに少し走って帰り、静かな夜を過ごした。特別なことはなかったけれど、窓から差し込むあたたかな光、友だちからのやさしいメッセージ、ようやくゆっくりできた気持ちを覚えておきたい。',
  'zh-TW': '早晨比預想中更忙碌。通勤時先停下來深呼吸，完成一場不太容易的會議後，午休時走到戶外看看天空。下班後去慢跑了一小段，回家度過安靜的夜晚。今天沒有什麼大事，但我想記住窗邊溫暖的光、朋友傳來的貼心訊息，還有終於能慢下來的感覺。',
};
/** Pure builder: the same local dates and stable ids make previews reproducible. */
export function buildMockDiaries(locale: AppLocale, date: string): ComicDiaryLibrary {
  const copy = mockCopy[locale];
  const groups = [[0, 6, 0], [6, 10, -2], [10, 15, -1]];
  const diaries = groups.map(([start, end, offset], index) => {
    const character = getMockProtagonist(4);
    const characterScenes = getMockSceneImages(character.id);
    const day = addDaysToLocalDateKey(date, offset);
    const timestamp = new Date(`${day}T12:00:00`).getTime();
    const scenes: ComicDayScene[] = copy.scenes.slice(start, end).map(([title, memo], j) => {
      const image = characterScenes[start + j];
      return {
        id: `mock-scene:${locale}:${start + j}`, title, memo, image, artworkUri: developmentArtworkUri(image), time: sceneTimes[start + j],
        paper: '#FFFFFF', pen: '#252822',
        todos: [],
      };
    });
    return { id: `mock-diary:${locale}:${index}`, title: `${day.slice(5).replace('-', '/')} · ${copy.titles[index]}`, characterId: character.id, characterName: getMockProtagonistName(4, locale), scenes, createdAt: timestamp, updatedAt: timestamp };
  });
  return { version: 1, diaries, activeId: diaries[0].id, migratedLegacyKeys: [] };
}

/** Discard the previous mock app profile once when migrating to the photo diary fixtures. */
export async function clearObsoleteDevelopmentMockData(): Promise<void> {
  if (!__DEV__ || !getDevelopmentStorageProfile()) return;
  const storedVersion = localStorageClient.getItemRaw(SEED_KEY);
  if (storedVersion && !storedVersion.startsWith(`${MOCK_DATA_VERSION}:`)) await clearPokitLocalStorage();
}

/** The existing stories, with the same paper and ink choices offered by the editor. */
export function buildColorMockDiaries(locale: AppLocale, date: string): ComicDiaryLibrary {
  const library = buildMockDiaries(locale, date);
  const label = { ko: '컬러', en: 'Color', ja: 'カラー', 'zh-TW': '彩色' }[locale];
  let colorIndex = 0;
  const sceneCount = library.diaries.reduce((total, diary) => total + diary.scenes.length, 0);
  const variants = Math.max(2, Math.ceil(COMIC_PAPER_COLORS.length * 3 / sceneCount));
  const stories = Array.from({ length: variants }, () => library.diaries).flat();
  const diaries = stories.map((diary, index) => ({
    ...diary,
    id: `mock-color-diary:${locale}:${index}`,
    title: `${label} · ${diary.title}${index < library.diaries.length ? '' : ` · ${Math.floor(index / library.diaries.length) + 1}`}`,
    scenes: diary.scenes.map((scene, sceneIndex) => {
      const paletteIndex = colorIndex++;
      return {
        ...scene,
        id: `mock-color-scene:${locale}:${index}:${sceneIndex}`,
        paper: COMIC_PAPER_COLORS[paletteIndex % COMIC_PAPER_COLORS.length],
        pen: COMIC_PEN_COLORS[(paletteIndex + 3 + Math.floor(paletteIndex / COMIC_PAPER_COLORS.length) * 3) % COMIC_PEN_COLORS.length],
        todos: scene.todos.map((todo, todoIndex) => ({ ...todo, id: `mock-color-task:${locale}:${index}:${sceneIndex}:${todoIndex}` })),
      };
    }),
  }));
  return { ...library, diaries, activeId: diaries[0].id };
}

/** Upgrade sample colors once per palette revision; preserve story edits and ordinary diaries. */
export function addDevelopmentColorMockData(date = getLocalDateKey()): boolean {
  if (!__DEV__) return false;
  const locale = getDevelopmentStorageProfile();
  if (!locale) return false;
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
  if (!Array.isArray(library?.diaries)) return false;
  const samples = buildColorMockDiaries(locale, date);
  const upgrade = localStorageClient.getItemRaw(COLOR_STYLE_KEY) !== COLOR_STYLE_VERSION;
  let updated = false;
  const diaries = library.diaries.map(diary => {
    const sample = samples.diaries.find(item => item.id === diary.id);
    if (!upgrade || !sample) return diary;
    const scenes = diary.scenes.map(scene => {
      const style = sample.scenes.find(item => item.id === scene.id);
      if (!style || (style.paper === scene.paper && style.pen === scene.pen)) return scene;
      updated = true;
      return { ...scene, paper: style.paper, pen: style.pen };
    });
    return { ...diary, scenes };
  });
  const missing = samples.diaries.filter(sample => !library.diaries.some(diary => diary.id === sample.id));
  const changed = updated || missing.length > 0 || library.activeId !== samples.activeId;
  if (changed) localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries: [...diaries, ...missing], activeId: samples.activeId });
  localStorageClient.setItemRaw(COLOR_STYLE_KEY, COLOR_STYLE_VERSION);
  localStorageClient.setJson('pokit:comic-navigation', { characterId: samples.diaries[0].characterId, screen: 'board', diaryId: samples.activeId });
  return changed;
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
  // Repair missing home text even when the diary seed version is already current.
  const storyKey = `pokit:canvas-note:${date}`;
  if (!localStorageClient.getItemRaw(storyKey)?.trim()) localStorageClient.setItemRaw(storyKey, canvasStories[locale]);
  if (!force && localStorageClient.getItemRaw(SEED_KEY) === version) {
    const existing = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
    if (Array.isArray(existing?.diaries) && existing.diaries.length > 0) return false;
    const diaries = buildMockDiaries(locale, date);
    localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, diaries);
    localStorageClient.setJson('pokit:comic-navigation', { characterId: diaries.diaries[0].characterId, screen: 'board', diaryId: diaries.activeId });
    return true;
  }
  const diaries = buildMockDiaries(locale, date);
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, diaries);
  localStorageClient.setJson('pokit:comic-navigation', { characterId: diaries.diaries[0].characterId, screen: 'board', diaryId: diaries.activeId });
  localStorageClient.setItemRaw(`pokit:canvas-note:${date}`, canvasStories[locale]);
  // Mock browsing starts in the actual app, without onboarding or review prompts.
  localStorageClient.setJson('pokit:service-tutorial-v2', { ...initialServiceProgress, completed: ['comic', 'rhythm'], step: 'finish', dismissed: true });
  localStorageClient.setJson('pokit:tutorial-media-v1', { introSeen: true, reviewRequested: true });
  localStorageClient.setJson(StorageKeys.welcomeIntro, { seen: true });
  localStorageClient.setJson(StorageKeys.dailyRhythmOnboarding, { completed: true });
  localStorageClient.setItemRaw(SEED_KEY, version);
  return true;
}
