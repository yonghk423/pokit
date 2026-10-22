import { DEFAULT_COMIC_CHARACTER_ID } from './comicCharacters';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { COMIC_SCENES, type ComicSceneId } from './comicSceneImages';
export type ComicDayScene = {
  id: string; title: string; image: ComicSceneId; time: string; memo: string;
  todos: { id: string; text: string; completed: boolean }[];
  paper: string; pen: string;
};
// Keep the original key for the existing character so no saved scenes are lost.
const key = (date: string, characterId: string) => characterId === DEFAULT_COMIC_CHARACTER_ID ? `pokit:comic-day:${date}` : `pokit:comic-day:${characterId}:${date}`;
export function loadComicDay(date: string, characterId: string = DEFAULT_COMIC_CHARACTER_ID): ComicDayScene[] {
  return normalizeComicScenes(localStorageClient.getJson<unknown>(key(date, characterId)));
}
export function normalizeComicScenes(value: unknown): ComicDayScene[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.filter((item): item is ComicDayScene => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) return false;
    const ok = typeof item.title === 'string' && typeof item.memo === 'string' && typeof item.time === 'string'
      && typeof item.paper === 'string' && typeof item.pen === 'string'
      && COMIC_SCENES.some(scene => scene.id === item.image) && Array.isArray(item.todos)
      && item.todos.every((todo: ComicDayScene['todos'][number]) => todo && typeof todo.id === 'string' && typeof todo.text === 'string' && typeof todo.completed === 'boolean');
    if (ok) seen.add(item.id);
    return ok;
  });
}
export function saveComicDay(date: string, scenes: ComicDayScene[], characterId: string = DEFAULT_COMIC_CHARACTER_ID) { localStorageClient.setJson(key(date, characterId), scenes); }
export function newComicScene(title: string): ComicDayScene {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, title, image: 'focus', time: '', memo: '', todos: [], paper: '#FFFFFF', pen: '#202020' };
}
export function validComicTime(time: string) { return time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time); }
