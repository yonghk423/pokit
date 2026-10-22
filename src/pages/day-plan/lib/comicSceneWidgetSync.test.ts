import { NativeModules, Platform } from 'react-native';
import { buildComicSceneWidgetBundle } from './comicSceneWidgetSync';
import { saveComicDiaryLibrary, type ComicDiaryLibrary } from './comicDiaryStorage';
import { newComicScene } from './comicDayStorage';

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
