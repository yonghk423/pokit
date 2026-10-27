import { loadComicScenes, resolveComicScene, saveComicScene } from './heroSceneImages';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

beforeEach(() => localStorageClient.removeItem('pokit:comic-scene-images'));
afterEach(() => localStorageClient.removeItem('pokit:comic-scene-images'));
it('retains image choices across reloads and honors them over suggested images', () => {
  expect(resolveComicScene('book', '독서', {}).id).toBe('06-reading');
  saveComicScene('book', '10-park-walk');
  saveComicScene('meal', '27-breakfast');
  expect(loadComicScenes()).toEqual({ book: '10-park-walk', meal: '27-breakfast' });
  expect(resolveComicScene('book', '독서', loadComicScenes()).id).toBe('10-park-walk');
});
it('ignores corrupt and obsolete stored images', () => {
  localStorageClient.setItemRaw('pokit:comic-scene-images', 'broken');
  expect(loadComicScenes()).toEqual({});
  localStorageClient.setItemRaw('pokit:comic-scene-images', JSON.stringify({ a: 'removed', b: 'wake' }));
  expect(loadComicScenes()).toEqual({ b: '23-morning-stretch' });
});
