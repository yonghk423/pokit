import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMIC_SCENES, canonicalComicSceneId } from './heroSceneImages';
import { COMIC_SCENE_THUMBNAILS } from './heroSceneThumbnails';
import manifest from '../../../../assets/activity-illustrations/manifest.json';
import { loadComicDay, newComicScene, saveComicDay } from './heroDayStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

afterEach(() => localStorageClient.removeItem('pokit:comic-day:catalog-test'));
it('ships no character photos and keeps historical asset aliases resolvable', () => {
  const folder = resolve(__dirname, '../../../../assets/activity-illustrations');
  expect(readdirSync(folder).some(name => name.startsWith('protagonist-'))).toBe(false);
  for (const row of manifest) expect(existsSync(resolve(folder, row.file))).toBe(true);
  expect(Object.keys(COMIC_SCENE_THUMBNAILS).sort()).toEqual(COMIC_SCENES.map(scene => scene.id).sort());
  expect(new Set(Object.values(COMIC_SCENE_THUMBNAILS)).size).toBe(1);
});
it('restores historical text and uploaded artwork without requiring bundled photos', () => {
  const scenes = [{ ...newComicScene('내 기록'), image: '01-exercise' as const, memo: '메모 유지', artworkUri: 'file:///documents/my-photo.jpg' }];
  saveComicDay('catalog-test', scenes);
  expect(loadComicDay('catalog-test')).toEqual(scenes);
  expect(canonicalComicSceneId('01-exercise')).toBe('01-exercise');
});
