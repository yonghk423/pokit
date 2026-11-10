import { getLocalDateKey, addDaysToLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import type { AppLocale } from '@shared/lib/i18n';
import { localStorageClient, getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiary, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { mockCopy } from './mockCopy';
import { MOCK_PROTAGONISTS, getMockProtagonist, getMockProtagonistName, getMockSceneImages } from './mockProtagonists';
import type { ComicDayScene } from '@pages/day-plan/lib/heroDayStorage';
import { developmentArtworkUri } from './mockArtwork';
const koreanCharacterStories: Record<string, Pick<ComicDayScene, 'image' | 'title' | 'memo'>[]> = {
  'protagonist-5': [
    { image: 'p5-01-platform', title: '기다리는 시간도 내 하루', memo: '기차를 기다리며 잠깐 이어폰을 뺐다. 바쁘게 걷는 사람들 사이에서 나만 잠시 멈춘 기분이었다. 서둘러야 한다는 생각 대신, 오늘은 내 속도로 가도 괜찮다고 마음속으로 이야기했다.' },
    { image: 'p5-05-bakery', title: '갓 구운 빵 냄새', memo: '골목을 걷다가 따뜻한 빵 냄새에 발길을 멈췄다. 평소라면 그냥 지나쳤을 작은 빵집에서 내일 아침 먹을 빵을 골랐다. 특별한 일이 없어도 이렇게 기분이 좋아지는 순간이 있다는 걸 적어 두고 싶다.' },
    { image: 'p5-34-bookshop', title: '책 사이에서 찾은 작은 쉼', memo: '서점에서 표지가 마음에 드는 책을 펼쳤다. 몇 줄 읽었을 뿐인데 종일 복잡했던 머릿속이 조금 조용해졌다. 다 읽겠다는 목표 없이, 오늘 마음에 남는 문장 하나만 챙겨 돌아왔다.' },
  ],
  'protagonist-6': [
    { image: 'p6-01-rush-hour-commute', title: '분주한 아침 속 나의 자리', memo: '출근길 지하철은 오늘도 사람들로 가득했다. 가방을 고쳐 메고 천천히 숨을 쉬었다. 정신없이 하루를 시작하는 대신, 오늘 꼭 챙기고 싶은 내 마음부터 한 번 들여다보기로 했다.' },
    { image: 'p6-04-lunch-rooftop', title: '점심시간의 하늘', memo: '점심을 먹고 옥상에 올라갔다. 오전 내내 화면만 보다가 고개를 드니 생각보다 하늘이 넓었다. 일이 마음처럼 풀리지 않아 답답했지만, 바람을 쐬고 나니 오후를 다시 시작할 힘이 조금 생겼다.' },
    { image: 'p6-21-couch-after-work', title: '오늘도 내 몫의 하루를 살았다', memo: '집에 돌아와 소파에 앉자 긴장이 한꺼번에 풀렸다. 끝내지 못한 일도 있지만 오늘 해낸 것부터 떠올려 봤다. 애쓴 나에게 따뜻한 저녁과 충분한 휴식을 주는 것으로 하루를 마무리하고 싶다.' },
  ],
};

const labels: Record<AppLocale, string[]> = {
  ko: ['천천히 시작한 아침', '집중했던 오전', '점심 뒤의 작은 쉼', '오후에 만난 풍경', '나를 위한 저녁', '잠들기 전의 기록'],
  en: ['A slow morning', 'A focused start', 'A break after lunch', 'An afternoon discovery', 'An evening for myself', 'Before the day ends'],
  ja: ['ゆっくり始める朝', '集中した午前', 'お昼のあとのひと休み', '午後に出会った景色', '自分のための夕方', '眠る前の記録'],
  'zh-TW': ['慢慢開始的早晨', '專注的上午', '午餐後的小歇', '午後遇見的風景', '留給自己的夜晚', '睡前的紀錄'],
};
const CALENDAR_MOCK_CHARACTER_VERSION_KEY = 'pokit:calendar-mock-character-version';
const CALENDAR_MOCK_CHARACTER_VERSION = '7';
/** Stable dated photo diary fixtures with long entries and fullbleed artwork. */
export function buildCalendarMockDiaries(locale: AppLocale, date: string): ComicDiary[] {
  const month = date.slice(0, 7);
  const today = Number(date.slice(8));
  const days = locale === 'ko'
    ? Array.from({ length: today }, (_, index) => index + 1)
    : [...new Set([1, 3, 5, 7, 9, 12, 13, 16, 18, 20, 23, 26, today - 1, today])].filter(day => day > 0 && day <= today).sort((a, b) => a - b);
  const copy = mockCopy[locale];
  const source = copy.scenes.slice(0, 10).map(scene => ({ copy: scene }));
  // Korean previews include a completed month, even when today is the first.
  const previous = addDaysToLocalDateKey(`${month}-01`, -1);
  const previousDays = locale === 'ko'
    ? Array.from({ length: Number(previous.slice(8)) }, (_, index) => ({ day: `${previous.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`, count: index + 1 === Number(previous.slice(8)) ? 3 : index % 3 + 1 }))
    : [{ day: previous, count: 3 }];
  const plan = [...days.map(day => ({ day: `${month}-${String(day).padStart(2, '0')}`, count: day === 13 || day === today && locale === 'ko' ? 6 : day === today ? 4 : day % 3 + 1 })), ...previousDays];
  return plan.flatMap(({ day, count }, dayIndex) => Array.from({ length: count }, (_, entry) => {
    const id = `mock-calendar:${locale}:${day}:${entry}`;
    const characterIndex = MOCK_PROTAGONISTS.findIndex(item => item.id === 'protagonist-6');
    const character = getMockProtagonist(characterIndex);
    const characterScenes = getMockSceneImages(character.id);
    const sizes = day.endsWith('-13') ? [3, 6, 12, 20, 5, 9] : [3, 7, 12, 20, 5, 9];
    const stories = locale === 'ko' ? koreanCharacterStories[character.id] : undefined;
    const characterStories = stories?.map((_, index) => stories[(index + Number(day.slice(8)) - 1) % stories.length]);
    const size = characterStories?.length ?? sizes[entry];
    const timestamp = new Date(`${day}T${String(7 + entry * 2).padStart(2, '0')}:15:00`).getTime();
    return {
      id, title: `${day.slice(5).replace('-', '/')} · ${characterStories?.[0].title ?? labels[locale][entry]}`, characterId: character.id, characterName: getMockProtagonistName(characterIndex, locale),
      createdAt: timestamp, updatedAt: timestamp,
      scenes: Array.from({ length: size }, (_, i) => {
        const item = source[(dayIndex * 3 + entry * 2 + i) % source.length];
        const [title, memo] = item.copy;
        const minutes = 7 * 60 + Math.round(i * 15 * 60 / Math.max(size - 1, 1));
        const story = characterStories?.[i];
        const image = story?.image ?? characterScenes[(dayIndex * 3 + entry * 2 + i) % characterScenes.length]!;
        return { id: `${id}:scene:${i}`, title, memo, image, artworkUri: developmentArtworkUri(image), ...story, time: `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`, paper: '#FFFFFF', pen: '#252822', todos: [] };
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
  const datasetVersion = `${CALENDAR_MOCK_CHARACTER_VERSION}:${date}`;
  const upgrade = localStorageClient.getItemRaw(CALENDAR_MOCK_CHARACTER_VERSION_KEY) !== datasetVersion;
  if (upgrade) {
    // Replace only the old generated calendar fixtures. Real and hand-made diaries stay intact.
    const diaries = [...library.diaries.filter(diary => !diary.id.startsWith('mock-calendar:')), ...samples];
    localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries });
    localStorageClient.setItemRaw(CALENDAR_MOCK_CHARACTER_VERSION_KEY, datasetVersion);
    return true;
  }
  let updated = false;
  const diaries = library.diaries.map(diary => {
    const sample = sampleById.get(diary.id);
    if (!sample) return diary;
    let scenesChanged = false;
    const scenes = diary.scenes.map(scene => {
      const sampleScene = sample.scenes.find(item => item.id === scene.id);
      if (!sampleScene) return scene;
      const image = scene.artworkUri ? scene.image : sampleScene.image;
      const artworkUri = scene.artworkUri ?? sampleScene.artworkUri;
      const title = scene.title.trim() ? scene.title : sampleScene.title;
      const memo = scene.memo.trim() ? scene.memo : sampleScene.memo;
      if (scene.image === image && scene.artworkUri === artworkUri && scene.title === title && scene.memo === memo) return scene;
      scenesChanged = true;
      updated = true;
      return { ...scene, image, artworkUri, title, memo };
    });
    const sceneIds = new Set(scenes.map(scene => scene.id));
    const missingScenes = sample.scenes.filter(scene => !sceneIds.has(scene.id));
    if (missingScenes.length) { scenes.push(...missingScenes); scenesChanged = true; }
    if (diary.characterId === sample.characterId && diary.characterName === sample.characterName && !scenesChanged) return diary;
    updated = true;
    return { ...diary, characterId: sample.characterId, characterName: sample.characterName, scenes };
  });
  const ids = new Set(library.diaries.map(diary => diary.id));
  const missing = samples.filter(diary => !ids.has(diary.id));
  if (updated || missing.length) localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries: [...diaries, ...missing] });
  localStorageClient.setItemRaw(CALENDAR_MOCK_CHARACTER_VERSION_KEY, datasetVersion);
  return updated || missing.length > 0;
}
