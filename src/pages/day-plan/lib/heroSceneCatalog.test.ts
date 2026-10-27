import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMIC_SCENES, COMIC_SCENE_CATEGORIES, comicSceneMatchesCategory } from './heroSceneImages';
import manifest from '../../../../assets/activity-illustrations/manifest.json';
import { loadComicDay, newComicScene, saveComicDay } from './heroDayStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import ko from '@shared/lib/i18n/model/messages/ko.json';

afterEach(() => localStorageClient.removeItem('pokit:comic-day:catalog-test'));
it('includes every activity photo and the five comic images with searchable labels', () => {
  const optimized = readdirSync(resolve(__dirname, '../../../../assets/activity-illustrations/optimized')).filter(file => file.endsWith('-960.webp'));
  const activityIds = manifest.map(item => item.id);
  expect(optimized.filter(file => /^\d{2}-/.test(file)).map(file => file.replace(/-960\.webp$/, '')).sort()).toEqual([...activityIds].sort());
  expect(optimized.every(file => /^\d{2}-/.test(file))).toBe(true);
  expect(COMIC_SCENES).toHaveLength(activityIds.length + 15);
  expect(new Set(COMIC_SCENES.map(scene => scene.id)).size).toBe(COMIC_SCENES.length);
  for (const item of manifest) expect(COMIC_SCENES.some(scene => scene.id === item.id)).toBe(true);
  for (const scene of COMIC_SCENES) expect(ko[scene.label]).toBeTruthy();
});
it('restores newly linked images with scene details and includes them in category filters', () => {
  const scenes = [{ ...newComicScene('카페에서 독서하기'), image: '52-reading-cafe' as const, memo: 'Keep my note' }];
  saveComicDay('catalog-test', scenes);
  expect(loadComicDay('catalog-test')).toEqual(scenes);
  expect(comicSceneMatchesCategory('52-reading-cafe', 'cafe')).toBe(true);
  expect(comicSceneMatchesCategory('23-morning-stretch', 'preparation')).toBe(true);
  expect(comicSceneMatchesCategory('05-work', 'work')).toBe(true);
  expect(COMIC_SCENES.every(scene => comicSceneMatchesCategory(scene.id, 'all'))).toBe(true);
});

it('assigns every image to an activity category and supports meaningful overlaps', () => {
  const categories = COMIC_SCENE_CATEGORIES.filter(category => category.id !== 'all');
  for (const scene of COMIC_SCENES) expect(categories.some(category => comicSceneMatchesCategory(scene.id, category.id))).toBe(true);
  for (const category of categories) expect(COMIC_SCENES.some(scene => comicSceneMatchesCategory(scene.id, category.id))).toBe(true);
  expect(comicSceneMatchesCategory('52-reading-cafe', 'hobbies')).toBe(true);
  expect(comicSceneMatchesCategory('23-morning-stretch', 'exercise')).toBe(true);
  expect(comicSceneMatchesCategory('04-laundry', 'home')).toBe(true);
  expect(comicSceneMatchesCategory('34-subway-commute', 'travel')).toBe(true);
  expect(comicSceneMatchesCategory('33-grocery-shopping', 'shopping')).toBe(true);
});

it('ships only 960px artwork with one source for every scene', () => {
  const { COMIC_SCENE_THUMBNAILS } = require('./heroSceneThumbnails');
  expect(Object.keys(COMIC_SCENE_THUMBNAILS).sort()).toEqual(COMIC_SCENES.map(scene => scene.id).sort());
  for (const folder of ['optimized', 'puppy']) {
    const files = readdirSync(resolve(__dirname, '../../../../assets/activity-illustrations', folder));
    expect(files.filter(file => file.endsWith('-480.webp'))).toEqual([]);
    expect(files.filter(file => file.endsWith('.webp')).every(file => file.endsWith('-960.webp'))).toBe(true);
  }
});
