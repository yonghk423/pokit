import { NativeModules, Platform } from 'react-native';
import { buildComicSceneWidgetBundle } from './heroSceneWidgetSync';
import { saveComicDiaryLibrary, type ComicDiaryLibrary } from './heroDiaryStorage';
import { newComicScene } from './heroDayStorage';

it('groups scene choices by local diary date and retains migrated calendar dates', () => {
  const scene = newComicScene('Morning');
  const library: ComicDiaryLibrary = {
    version: 1, activeId: 'new', migratedLegacyKeys: [],
    diaries: [
      { id: 'new', title: 'Today', characterId: 'protagonist-1', scenes: [scene], createdAt: new Date(2026, 9, 26, 0, 15).getTime(), updatedAt: 0 },
      { id: 'legacy:protagonist-1:2026-10-25', title: 'Yesterday', characterId: 'protagonist-1', scenes: [scene], createdAt: new Date(2026, 9, 26).getTime(), updatedAt: 0 },
      { id: 'unknown', title: 'Older diary', characterId: 'protagonist-1', scenes: [scene], createdAt: 0, updatedAt: 0 },
    ],
  };
  const payload = buildComicSceneWidgetBundle(library);
  expect(payload.scenes.map(row => row.dateKey)).toEqual(['2026-10-26', '2026-10-25', null]);
  expect(payload.fallbackSceneId).toBe(`new::${scene.id}`);
});

it('preserves the selected diary, scene artwork and caption in the native widget payload', () => {
  const scene = { ...newComicScene('회의하기'), image: '03-meeting' as const, memo: '회의 메모', todos: [{ id: 'task', text: '  자료 준비  ', completed: true }, { id: 'blank', text: ' ', completed: false }] };
  const library: ComicDiaryLibrary = {
    version: 1, activeId: 'second', migratedLegacyKeys: [],
    diaries: ['first', 'second'].map(id => ({
      id, title: id, characterId: 'protagonist-1', scenes: [scene], createdAt: 0, updatedAt: 0,
    })),
  };
  const payload = buildComicSceneWidgetBundle(library);
  expect(payload.fallbackSceneId).toBe(`second::${scene.id}`);
  expect(payload.scenes[1]).toMatchObject({ title: '회의하기', imageId: '03-meeting', index: 1, total: 1, memo: '회의 메모', todos: [{ id: 'task', text: '자료 준비', completed: true }] });
  const previousOS = Platform.OS;
  const previousModule = NativeModules.PokitWidgetSync;
  const syncComicSceneWidgetJson = jest.fn();
  try {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    NativeModules.PokitWidgetSync = { syncComicSceneWidgetJson };
    saveComicDiaryLibrary(library);
    expect(syncComicSceneWidgetJson).toHaveBeenCalledWith(JSON.stringify(payload));
    saveComicDiaryLibrary({ ...library, diaries: [], activeId: null });
    expect(JSON.parse(syncComicSceneWidgetJson.mock.calls[1][0])).toMatchObject({ scenes: [], fallbackSceneId: null });
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: previousOS });
    NativeModules.PokitWidgetSync = previousModule;
  }
});


it('includes generated artwork so native sync can copy it into the widget shared container', () => {
  const scene = { ...newComicScene('겨울에는 귤이지'), artworkUri: 'file:///Documents/yourday-ai/winter.jpg' };
  const library: ComicDiaryLibrary = {
    version: 1, activeId: 'generated', migratedLegacyKeys: [],
    diaries: [{ id: 'generated', title: '겨울', characterId: 'protagonist-1', scenes: [scene], createdAt: 0, updatedAt: 0 }],
  };
  expect(buildComicSceneWidgetBundle(library).scenes[0]).toMatchObject({
    title: '겨울에는 귤이지', artworkUri: scene.artworkUri, imageId: scene.image,
  });
  const ordinary = { ...scene, artworkUri: undefined };
  library.diaries[0].scenes = [ordinary];
  expect(buildComicSceneWidgetBundle(library).scenes[0]).not.toHaveProperty('artworkUri');
});

it('bundles widget artwork for every selectable scene, including newly added protagonists', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const { COMIC_SCENES } = require('./heroSceneImages') as typeof import('./heroSceneImages');
  const catalog = path.resolve(__dirname, '../../../../ios/PokitLiveActivity/ComicScenes.xcassets');
  for (const scene of COMIC_SCENES) {
    const folder = path.join(catalog, `comic_${scene.id}.imageset`);
    const contents = JSON.parse(fs.readFileSync(path.join(folder, 'Contents.json'), 'utf8'));
    expect(fs.statSync(path.join(folder, contents.images[0].filename)).size).toBeGreaterThan(0);
  }
});
