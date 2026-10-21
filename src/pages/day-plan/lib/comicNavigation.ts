import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { COMIC_CHARACTERS } from './comicCharacters';
const KEY = 'pokit:comic-navigation';
type ComicNavigation = { characterId: string; screen: 'board' | 'picker' };
export function loadComicNavigation(): ComicNavigation | null {
  const value = localStorageClient.getJson<ComicNavigation>(KEY);
  return value && COMIC_CHARACTERS.some(character => character.id === value.characterId) && (value.screen === 'board' || value.screen === 'picker') ? value : null;
}
export function saveComicNavigation(characterId: string, screen: ComicNavigation['screen']) { localStorageClient.setJson(KEY, { characterId, screen }); }
export function clearComicNavigation() { localStorageClient.removeItem(KEY); }
