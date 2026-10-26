import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadComicDay, newComicScene, saveComicDay } from './heroDayStorage';
import { COMIC_DIARY_STORAGE_KEY, createComicDiary, deleteComicDiary, loadComicDiaryLibrary, saveComicDiaryLibrary, updateComicDiary } from './heroDiaryStorage';
const title = (number: number) => `만화 일기 ${number}`;
afterEach(() => { for (const key of [COMIC_DIARY_STORAGE_KEY, ...localStorageClient.listKeys('pokit:comic-day:')]) localStorageClient.removeItem(key); });
it('imports all old dated scenes once and never resurrects deleted diaries from their backups', () => {
  const first = { ...newComicScene('First'), memo: 'Keep this note', todos: [{ id: 't', text: 'Keep task', completed: true }] };
  const second = newComicScene('Second');
  saveComicDay('2026-10-20', [first]); saveComicDay('2026-10-21', [second]);
  let library = loadComicDiaryLibrary('2026-10-21', title);
  expect(library.diaries).toHaveLength(2);
  expect(library.diaries.find(item => item.id === library.activeId)?.scenes).toEqual([second]);
  expect(library.diaries[0].scenes).toEqual([first]);
  expect(loadComicDiaryLibrary('2026-10-22', title).diaries).toHaveLength(2);
  for (const diary of library.diaries) library = deleteComicDiary(library, diary.id);
  saveComicDiaryLibrary(library);
  expect(loadComicDiaryLibrary('2026-10-22', title).diaries).toEqual([]);
  expect(loadComicDay('2026-10-20')).toEqual([first]);
});
it('keeps independent diary scenes, active selection and names across day changes', () => {
  let library = createComicDiary(loadComicDiaryLibrary('2026-10-21', title), 'protagonist-1', 'First');
  const firstId = library.activeId!;
  library = updateComicDiary(library, firstId, { scenes: [newComicScene('A')], title: '  Renamed  ' });
  library = createComicDiary(library, 'protagonist-1', 'Second');
  const secondId = library.activeId!;
  expect(library.diaries.find(item => item.id === secondId)?.scenes).toEqual([]);
  expect(updateComicDiary(library, firstId, { title: '  ' })).toBe(library);
  saveComicDiaryLibrary(library);
  const restored = loadComicDiaryLibrary('2026-11-01', title);
  expect(restored.activeId).toBe(secondId);
  expect(restored.diaries.find(item => item.id === firstId)?.title).toBe('Renamed');
  expect(deleteComicDiary(restored, secondId).activeId).toBe(firstId);
});

it('stores the newly entered protagonist name on the new diary without reusing or changing an older name', () => {
  let library = createComicDiary(loadComicDiaryLibrary('2026-10-23', title), 'protagonist-1', 'Existing', '이전 이름');
  const existingId = library.activeId;
  library = createComicDiary(library, 'protagonist-1', 'Tutorial', '  내가 쓴 이름  ');
  const tutorialId = library.activeId;
  expect(library.diaries.find(item => item.id === tutorialId)?.characterName).toBe('내가 쓴 이름');
  expect(library.diaries.find(item => item.id === existingId)?.characterName).toBe('이전 이름');
  saveComicDiaryLibrary(library);
  const restored = loadComicDiaryLibrary('2026-10-24', title);
  expect(restored.diaries.find(item => item.id === tutorialId)?.characterName).toBe('내가 쓴 이름');
});
