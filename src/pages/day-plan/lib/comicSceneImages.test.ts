import { loadComicScenes, resolveComicScene, saveComicScene } from './comicSceneImages';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

beforeEach(() => localStorageClient.removeItem('pokit:comic-scene-images'));
afterEach(() => localStorageClient.removeItem('pokit:comic-scene-images'));
it('retains image choices across reloads and honors them over suggested images', () => {
  expect(resolveComicScene('book', '독서', {}).id).toBe('read');
  saveComicScene('book', 'walk');
  saveComicScene('meal', 'breakfast');
  expect(loadComicScenes()).toEqual({ book: 'walk', meal: 'breakfast' });
  expect(resolveComicScene('book', '독서', loadComicScenes()).id).toBe('walk');
});
it('ignores corrupt and obsolete stored images', () => {
  localStorageClient.setItemRaw('pokit:comic-scene-images', 'broken');
  expect(loadComicScenes()).toEqual({});
  localStorageClient.setItemRaw('pokit:comic-scene-images', JSON.stringify({ a: 'removed', b: 'wake' }));
  expect(loadComicScenes()).toEqual({ b: 'wake' });
});
