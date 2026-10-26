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
