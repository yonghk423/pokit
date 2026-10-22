import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { COMIC_CHARACTERS, DEFAULT_COMIC_CHARACTER_ID } from './comicCharacters';
import { normalizeComicScenes, type ComicDayScene } from './comicDayStorage';

export const COMIC_DIARY_STORAGE_KEY = 'pokit:comic-diaries:v1';
export type ComicDiary = { id: string; title: string; characterId: string; scenes: ComicDayScene[]; createdAt: number; updatedAt: number };
export type ComicDiaryLibrary = { version: 1; diaries: ComicDiary[]; activeId: string | null; migratedLegacyKeys: string[] };
const knownCharacter = (id: unknown): id is string => COMIC_CHARACTERS.some(character => character.id === id);
export function saveComicDiaryLibrary(library: ComicDiaryLibrary) { localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, library); }

/** Import every dated record once, leaving its original data intact as a backup. */
export function loadComicDiaryLibrary(currentDate: string, titleForNumber: (number: number) => string): ComicDiaryLibrary {
  const raw = localStorageClient.getJson<Partial<ComicDiaryLibrary>>(COMIC_DIARY_STORAGE_KEY);
  const seen = new Set<string>();
  const diaries: ComicDiary[] = [];
  for (const diary of Array.isArray(raw?.diaries) ? raw.diaries : []) {
    if (!diary || typeof diary.id !== 'string' || seen.has(diary.id) || typeof diary.title !== 'string' || !knownCharacter(diary.characterId)) continue;
    seen.add(diary.id);
    const legacyDefaultTitle = /^(?:만화 일기|Comic diary|漫画日記) (\d+)$/.exec(diary.title);
    diaries.push({ ...diary, title: legacyDefaultTitle ? titleForNumber(Number(legacyDefaultTitle[1])) : diary.title, scenes: normalizeComicScenes(diary.scenes), createdAt: Number(diary.createdAt) || 0, updatedAt: Number(diary.updatedAt) || 0 });
  }
  const migrated = new Set((Array.isArray(raw?.migratedLegacyKeys) ? raw.migratedLegacyKeys : []).filter(key => typeof key === 'string'));
  let importedCurrent: string | null = null;
  for (const key of localStorageClient.listKeys('pokit:comic-day:').sort()) {
    if (migrated.has(key)) continue;
    const match = /^pokit:comic-day:(?:(.+):)?(\d{4}-\d{2}-\d{2})$/.exec(key);
    if (!match) continue;
    const characterId = match[1] ?? DEFAULT_COMIC_CHARACTER_ID;
    if (!knownCharacter(characterId)) continue;
    const scenes = normalizeComicScenes(localStorageClient.getJson(key));
    if (!scenes.length) continue;
    const id = `legacy:${characterId}:${match[2]}`;
    if (!seen.has(id)) {
      diaries.push({ id, title: titleForNumber(diaries.length + 1), characterId, scenes, createdAt: Date.parse(match[2]) || 0, updatedAt: Date.parse(match[2]) || 0 });
      seen.add(id);
    }
    migrated.add(key);
    if (match[2] === currentDate) importedCurrent = id;
  }
  const activeId = diaries.some(diary => diary.id === raw?.activeId) ? raw!.activeId! : importedCurrent ?? diaries[diaries.length - 1]?.id ?? null;
  const library: ComicDiaryLibrary = { version: 1, diaries, activeId, migratedLegacyKeys: [...migrated] };
  saveComicDiaryLibrary(library);
  return library;
}
export function createComicDiary(library: ComicDiaryLibrary, characterId: string, title: string): ComicDiaryLibrary {
  if (!knownCharacter(characterId)) return library;
  const now = Date.now();
  const diary: ComicDiary = { id: `diary:${now}:${Math.random().toString(36).slice(2, 10)}`, characterId, title: title.trim().slice(0, 60), scenes: [], createdAt: now, updatedAt: now };
  return { ...library, diaries: [diary, ...library.diaries], activeId: diary.id };
}
export function updateComicDiary(library: ComicDiaryLibrary, id: string, patch: { title?: string; scenes?: ComicDayScene[] }): ComicDiaryLibrary {
  if (patch.title != null && !patch.title.trim()) return library;
  return { ...library, diaries: library.diaries.map(diary => diary.id === id ? { ...diary, ...patch, ...(patch.title != null ? { title: patch.title.trim().slice(0, 60) } : {}), updatedAt: Date.now() } : diary) };
}
export function deleteComicDiary(library: ComicDiaryLibrary, id: string): ComicDiaryLibrary {
  const diaries = library.diaries.filter(diary => diary.id !== id);
  return { ...library, diaries, activeId: library.activeId === id ? diaries[0]?.id ?? null : library.activeId };
}
