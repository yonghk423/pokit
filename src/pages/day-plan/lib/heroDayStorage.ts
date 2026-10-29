import { DEFAULT_COMIC_CHARACTER_ID } from './heroCharacters';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { canonicalComicSceneId, type ComicSceneId } from './heroSceneImages';
export type ComicDayScene = {
  id: string; title: string; image: ComicSceneId; artworkUri?: string; time: string; memo: string;
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
  const scenes: ComicDayScene[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const scene = item as ComicDayScene;
    const image = canonicalComicSceneId(scene.image);
    if (typeof scene.id !== 'string' || seen.has(scene.id) || !image) continue;
    const ok = typeof scene.title === 'string' && typeof scene.memo === 'string' && typeof scene.time === 'string'
      && typeof scene.paper === 'string' && typeof scene.pen === 'string'
      && Array.isArray(scene.todos)
      && scene.todos.every(todo => todo && typeof todo.id === 'string' && typeof todo.text === 'string' && typeof todo.completed === 'boolean');
    if (!ok) continue;
    seen.add(scene.id);
    scenes.push({ ...scene, image, artworkUri: typeof scene.artworkUri === 'string' && scene.artworkUri.startsWith('file://') ? scene.artworkUri : undefined });
  }
  return scenes;
}
export function saveComicDay(date: string, scenes: ComicDayScene[], characterId: string = DEFAULT_COMIC_CHARACTER_ID) { localStorageClient.setJson(key(date, characterId), scenes); }
export function newComicScene(title: string): ComicDayScene {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, title, image: '05-work', time: '', memo: '', todos: [], paper: '#FFFFFF', pen: '#202020' };
}
export function validComicTime(time: string) { return time === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(time); }
