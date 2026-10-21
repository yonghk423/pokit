import { loadComicCharacterName, saveComicCharacterName } from './comicCharacterName';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
afterEach(() => { for (const id of ['protagonist-1', 'protagonist-2']) localStorageClient.removeItem(`pokit:comic-character-name:${id}`); });
it('persists trimmed names per character without accepting blank names', () => {
  expect(loadComicCharacterName('protagonist-1')).toBeNull();
  saveComicCharacterName('protagonist-1', '  나의 하루  ');
  expect(loadComicCharacterName('protagonist-1')).toBe('나의 하루');
  expect(loadComicCharacterName('protagonist-2')).toBeNull();
  expect(saveComicCharacterName('protagonist-1', '  ')).toBeNull();
  expect(loadComicCharacterName('protagonist-1')).toBe('나의 하루');
});
