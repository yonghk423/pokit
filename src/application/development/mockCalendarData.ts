import { getLocalDateKey, addDaysToLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { AppLocale } from '@shared/lib/i18n';
import { localStorageClient, getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiary, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { mockCopy, bookstoreSceneCopy } from './mockCopy';
import { getMockProtagonist, getMockProtagonistName, getMockSceneImages } from './mockProtagonists';

const labels: Record<AppLocale, string[]> = {
  ko: ['천천히 시작한 아침', '집중했던 오전', '점심 뒤의 작은 쉼', '오후에 만난 풍경', '나를 위한 저녁', '잠들기 전의 기록'],
  en: ['A slow morning', 'A focused start', 'A break after lunch', 'An afternoon discovery', 'An evening for myself', 'Before the day ends'],
  ja: ['ゆっくり始める朝', '集中した午前', 'お昼のあとのひと休み', '午後に出会った景色', '自分のための夕方', '眠る前の記録'],
  'zh-TW': ['慢慢開始的早晨', '專注的上午', '午餐後的小歇', '午後遇見的風景', '留給自己的夜晚', '睡前的紀錄'],
};
const CALENDAR_MOCK_CHARACTER_VERSION_KEY = 'pokit:calendar-mock-character-version';
const CALENDAR_MOCK_CHARACTER_VERSION = '1';
/** Additive calendar fixtures: stable dated ids, dense days, sparse days and long diaries. */
export function buildCalendarMockDiaries(locale: AppLocale, date: string): ComicDiary[] {
  const month = date.slice(0, 7);
  const today = Number(date.slice(8));
  const days = [...new Set([1, 3, 5, 7, 9, 12, 13, 16, 18, 20, 23, 26, today - 1, today])].filter(day => day > 0 && day <= today).sort((a, b) => a - b);
  const copy = mockCopy[locale];
  const source = [...copy.scenes.slice(0, 10).map(scene => ({ copy: scene })), { copy: bookstoreSceneCopy[locale] }];
  // Include the previous month as well, so month navigation has real content.
  const previous = addDaysToLocalDateKey(`${month}-01`, -1);
  const plan = [...days.map(day => ({ day: `${month}-${String(day).padStart(2, '0')}`, count: day === 13 ? 6 : day === today ? 4 : day % 3 + 1 })), { day: previous, count: 3 }];
  return plan.flatMap(({ day, count }, dayIndex) => Array.from({ length: count }, (_, entry) => {
    const id = `mock-calendar:${locale}:${day}:${entry}`;
    const characterIndex = (dayIndex * 3 + entry) % 6;
    const character = getMockProtagonist(characterIndex);
    const characterScenes = getMockSceneImages(character.id);
    const sizes = day.endsWith('-13') ? [3, 6, 12, 20, 5, 9] : [3, 7, 12, 20, 5, 9];
    const size = sizes[entry];
    const timestamp = new Date(`${day}T${String(7 + entry * 2).padStart(2, '0')}:15:00`).getTime();
    return {
      id, title: `${day.slice(5).replace('-', '/')} · ${labels[locale][entry]}`, characterId: character.id, characterName: getMockProtagonistName(characterIndex, locale),
      createdAt: timestamp, updatedAt: timestamp,
      scenes: Array.from({ length: size }, (_, i) => {
        const item = source[(dayIndex * 3 + entry * 2 + i) % source.length];
        const [title, memo, tasks] = item.copy;
        const minutes = 7 * 60 + Math.round(i * 15 * 60 / Math.max(size - 1, 1));
        return { id: `${id}:scene:${i}`, title, memo, image: characterScenes[(dayIndex * 3 + entry * 2 + i) % characterScenes.length], time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, paper: '#FFFFFF', pen: '#252822', todos: tasks.map((text, j) => ({ id: `${id}:scene:${i}:todo:${j}`, text, completed: (entry + i + j) % 3 !== 0 })) };
      }),
    };
  }));
}
/** Keep existing mock calendar records and refresh only their character artwork once. */
export function addDevelopmentCalendarMockData(date = getLocalDateKey()): boolean {
  if (!__DEV__) return false;
  const locale = getDevelopmentStorageProfile();
  if (!locale) return false;
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
  if (!Array.isArray(library?.diaries)) return false;
  const samples = buildCalendarMockDiaries(locale, date);
  const sampleById = new Map(samples.map(diary => [diary.id, diary]));
  const upgrade = localStorageClient.getItemRaw(CALENDAR_MOCK_CHARACTER_VERSION_KEY) !== CALENDAR_MOCK_CHARACTER_VERSION;
  let updated = false;
  const diaries = library.diaries.map(diary => {
    const sample = upgrade ? sampleById.get(diary.id) : undefined;
    if (!sample) return diary;
    let scenesChanged = false;
    const scenes = diary.scenes.map((scene, index) => {
      const sampleScene = sample.scenes[index];
      if (!sampleScene || scene.image === sampleScene.image) return scene;
      scenesChanged = true;
      updated = true;
      return { ...scene, image: sampleScene.image };
    });
    if (diary.characterId === sample.characterId && diary.characterName === sample.characterName && !scenesChanged) return diary;
    updated = true;
    return { ...diary, characterId: sample.characterId, characterName: sample.characterName, scenes };
  });
  const ids = new Set(library.diaries.map(diary => diary.id));
  const missing = samples.filter(diary => !ids.has(diary.id));
  if (updated || missing.length) localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries: [...diaries, ...missing] });
  localStorageClient.setItemRaw(CALENDAR_MOCK_CHARACTER_VERSION_KEY, CALENDAR_MOCK_CHARACTER_VERSION);
  return updated || missing.length > 0;
}
