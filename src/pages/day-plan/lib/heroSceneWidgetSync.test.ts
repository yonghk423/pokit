import { NativeModules, Platform } from 'react-native';
import {
  buildComicSceneWidgetBundle,
  buildComicSceneWidgetBundleWithArtwork,
} from './heroSceneWidgetSync';
import { saveComicDiaryLibrary, type ComicDiaryLibrary } from './heroDiaryStorage';
import { newComicScene } from './heroDayStorage';

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: (source: number) => ({
      localUri: `file:///catalog/${source}.webp`,
      uri: `file:///catalog/${source}.webp`,
      downloadAsync: async () => undefined,
    }),
  },
}));

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

it('preserves the selected diary, scene artwork and caption in the native widget payload', async () => {
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
  const withArt = await buildComicSceneWidgetBundleWithArtwork(library);
  expect(withArt.scenes[1].artworkUri).toMatch(/^file:\/\/\/catalog\//);
  const previousOS = Platform.OS;
  const previousModule = NativeModules.PokitWidgetSync;
  const syncComicSceneWidgetJson = jest.fn();
  try {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    NativeModules.PokitWidgetSync = { syncComicSceneWidgetJson };
    saveComicDiaryLibrary(library);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(syncComicSceneWidgetJson).toHaveBeenCalledWith(JSON.stringify(withArt));
    saveComicDiaryLibrary({ ...library, diaries: [], activeId: null });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(JSON.parse(syncComicSceneWidgetJson.mock.calls[1][0])).toMatchObject({ scenes: [], fallbackSceneId: null });
  } finally {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: previousOS });
    NativeModules.PokitWidgetSync = previousModule;
  }
});


it('includes generated artwork so native sync can copy it into the widget shared container', async () => {
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
  const withCatalog = await buildComicSceneWidgetBundleWithArtwork(library);
  expect(withCatalog.scenes[0].artworkUri).toMatch(/^file:\/\/\/catalog\//);
});

it('keeps only the empty-state scene in the widget asset catalog; used scenes sync via App Group', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const catalog = path.resolve(__dirname, '../../../../ios/PokitLiveActivity/ComicScenes.xcassets');
  const empty = path.join(catalog, 'comic_10-park-walk.imageset');
  const contents = JSON.parse(fs.readFileSync(path.join(empty, 'Contents.json'), 'utf8'));
  expect(fs.statSync(path.join(empty, contents.images[0].filename)).size).toBeGreaterThan(0);
  const comicSets = fs.readdirSync(catalog).filter((name: string) => /^comic_\d/.test(name));
  expect(comicSets).toEqual(['comic_10-park-walk.imageset']);
});
