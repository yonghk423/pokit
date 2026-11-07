import { loadHeroOriginalPhotoLibrary } from '../lib/heroOriginalPhoto';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, FlatList } from 'react-native';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadComicCharacterName } from '../lib/heroCharacterName';
import { deleteHeroAiLibraryImages, loadHeroAiLibrary, notifyHeroAiLibraryChanged } from '../lib/heroAiLibrary';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { HeroEmptyTodayChooser } from './HeroEmptyTodayChooser';
import { HeroCharacterGalleryPage } from './HeroCharacterGalleryPage';
import { HeroImageActions } from './HeroImageActions';

jest.mock('../lib/heroOriginalPhoto', () => ({ loadHeroOriginalPhotoLibrary: jest.fn(async () => []), deleteHeroOriginalPhotoLibraryImages: jest.fn() }));
jest.mock('../lib/heroAiLibrary', () => ({ ...jest.requireActual('../lib/heroAiLibrary'), loadHeroAiLibrary: jest.fn(), deleteHeroAiLibraryImages: jest.fn() }));
jest.mock('../model/useHeroLoopingRail', () => ({ useHeroLoopingRail: () => ({ ref: { current: null } }) }));
jest.mock('../../welcome-intro/ui/ServiceTutorialTarget', () => ({ ServiceTutorialTarget: jest.requireActual('react-native').View }));
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }), useIsFocused: () => true }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/lib/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').View }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));

beforeEach(() => { jest.mocked(loadHeroOriginalPhotoLibrary).mockResolvedValue([]); jest.mocked(loadHeroAiLibrary).mockResolvedValue([]); for (const id of ['protagonist-1', 'protagonist-6']) localStorageClient.removeItem(`pokit:comic-character-name:${id}`); });
afterEach(() => { for (const id of ['protagonist-1', 'protagonist-6']) localStorageClient.removeItem(`pokit:comic-character-name:${id}`); });
it('opens only the selected character artwork, previews an image, and returns to the list', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  const originalList = tree.root.findAllByType(FlatList)[0];
  const original = tree.root.findAllByType(FlatList).at(-1)!.props.data;
  expect(original).toHaveLength(6);
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-character-personal' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-character-protagonist-1' })[0].props.onPress());
  expect(tree.root.findAllByType(FlatList)[0]).toBe(originalList);
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data).toBe(COMIC_CHARACTERS[0].scenes);
  const scene = COMIC_CHARACTERS[0].scenes[0];
  act(() => tree.root.findAllByProps({ testID: `hero-gallery-scene-${scene.id}` })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-preview-close' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-preview-close' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-back' })[0].props.onPress());
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data.filter(Boolean)).toHaveLength(6);
  act(() => tree.unmount());
});
it('updates the sixth character name immediately in its grid cell and detail header', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-edit-protagonist-6' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-name-input' })[0].props.onChangeText('나의 여섯 번째 주인공'));
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-name-save' })[0].props.onPress());
  expect(loadComicCharacterName('protagonist-6')).toBe('나의 여섯 번째 주인공');
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data.find((item: { id: string }) => item.id === 'protagonist-6').displayName).toBe('나의 여섯 번째 주인공');
  const card = tree.root.findAllByProps({ testID: 'hero-gallery-character-protagonist-6' })[0];
  expect(card.props.accessibilityLabel).toBe('나의 여섯 번째 주인공');
  expect(tree.root.findAll(node => node.props.children === '나의 여섯 번째 주인공').length).toBeGreaterThan(0);
  act(() => card.props.onPress());
  expect(tree.root.findAll(node => node.props.children === '나의 여섯 번째 주인공').length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
it('persists a trimmed name, rejects a blank name, and restores it after remounting', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-edit-protagonist-1' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-name-input' })[0].props.onChangeText('  '));
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-name-save' })[0].props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-name-input' })[0].props.onChangeText('  나의 주인공  '));
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-name-save' })[0].props.onPress());
  expect(loadComicCharacterName('protagonist-1')).toBe('나의 주인공');
  act(() => tree.unmount());
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-character-protagonist-1' })[0].props.accessibilityLabel).toBe('나의 주인공');
  act(() => tree.unmount());
});

it('collects existing local generations and refreshes the open collection after a new save', async () => {
  const first = { uri: 'file:///Documents/hero-ai/hero-old-0.png' };
  const second = { uri: 'file:///Documents/hero-ai/hero-new-0.png', title: '해변', memo: '태닝하고 싶다', createdAt: new Date(2026, 10, 3).getTime() };
  jest.mocked(loadHeroAiLibrary).mockResolvedValue([first]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data).toHaveLength(7);
  act(() => tree.root.findAllByProps({ testID: 'hero-gallery-character-generated-illustrations' })[0].props.onPress());
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data[0].source).toEqual(first);
  jest.mocked(loadHeroAiLibrary).mockResolvedValue([second, first]);
  await act(async () => { notifyHeroAiLibraryChanged(); });
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data.map((item: { source: unknown }) => item.source)).toEqual([{ uri: second.uri }, first]);
  act(() => tree.root.findAllByProps({ testID: `hero-gallery-scene-${second.uri}` })[0].props.onPress());
  expect(tree.root.findAllByProps({ imageKey: `gallery-polaroid:${second.uri}` })[0].props.source).toEqual({ uri: second.uri });
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-polaroid-title' })[0].props.children).toBe('해변');
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-polaroid-memo' })[0].props.children).toBe('태닝하고 싶다');
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-polaroid-date' })[0].props.children).toBe('2026. 11. 03');
  expect(tree.root.findByType(HeroImageActions).props).toMatchObject({ uri: second.uri, title: second.title, memo: second.memo, exportDate: second.createdAt, saveOnly: true });
  expect(tree.root.findAllByProps({ testID: 'hero-image-save' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-image-share' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('selects generated illustrations for deletion, supports cancel, and removes only confirmed selections', async () => {
  const images = [{ uri: 'file:///Documents/hero-ai/hero-one-0.png' }, { uri: 'file:///Documents/hero-ai/hero-two-0.png' }];
  jest.mocked(loadHeroAiLibrary).mockResolvedValue(images);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-delete' })).toHaveLength(0);
  const press = (testID: string) => act(() => tree.root.findAllByProps({ testID })[0].props.onPress());
  press('hero-gallery-character-generated-illustrations');
  press('hero-gallery-delete');
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-delete-selected' })[0].props.disabled).toBe(true);
  press(`hero-gallery-scene-${images[0].uri}`);
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-preview-close' })).toHaveLength(0);
  press('hero-gallery-delete');
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-delete-selected' })).toHaveLength(0);
  press('hero-gallery-delete');
  press(`hero-gallery-scene-${images[1].uri}`);
  press('hero-gallery-delete-selected');
  expect(deleteHeroAiLibraryImages).not.toHaveBeenCalled();
  act(() => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(deleteHeroAiLibraryImages).toHaveBeenCalledWith([images[1].uri]);
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data.map((item: { id: string }) => item.id)).toEqual([images[0].uri]);
  act(() => tree.unmount());
  alert.mockRestore();
});

it('shows the generated collection on the initial chooser and opens it without starting a diary', async () => {
  jest.mocked(loadHeroAiLibrary).mockResolvedValue([{ uri: 'file:///Documents/hero-ai/hero-saved-0.png', title: '나의 하루', memo: '편안한 오후', createdAt: 123456 }]);
  const start = jest.fn(), personalize = jest.fn(), choose = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroEmptyTodayChooser ink="#222" muted="#777" isDark={false} onStart={start} onPersonalize={personalize} onChooseGenerated={choose} />); });
  const card = tree.root.findAllByProps({ testID: 'hero-empty-character-generated-illustrations' })[0];
  await act(async () => card.props.onPress());
  expect(tree.root.findAllByType(FlatList).at(-1)!.props.data[0].title).toBe('나의 하루');
  expect(start).not.toHaveBeenCalled();
  expect(personalize).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(HeroCharacterGalleryPage)).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-generated-write-file:///Documents/hero-ai/hero-saved-0.png' })[0].props.onPress());
  expect(choose).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///Documents/hero-ai/hero-saved-0.png' }));
  expect(tree.root.findAllByProps({ testID: 'hero-character-gallery' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('uses generated selection mode to choose artwork instead of opening its gallery detail', async () => {
  const image = { uri: 'file:///Documents/hero-ai/hero-select-0.png', title: '기존 제목', memo: '기존 글', createdAt: 1000 };
  jest.mocked(loadHeroAiLibrary).mockResolvedValue([image]);
  const choose = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage initialGenerated onSelectGenerated={choose} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-delete' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: `hero-gallery-scene-${image.uri}` })[0].props.onPress());
  expect(choose).toHaveBeenCalledWith(image);
  expect(tree.root.findAllByProps({ testID: 'hero-gallery-polaroid' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('groups every uploaded original in one live My Photos collection while keeping AI illustrations separate', async () => {
  const first = { uri: 'file:///Documents/hero-photos/photo-1-a.jpg', title: '첫 사진', memo: '첫 기록', createdAt: 1 };
  const second = { uri: 'file:///Documents/hero-photos/photo-2-b.jpg', title: '두 번째 사진', createdAt: 2 };
  jest.mocked(loadHeroOriginalPhotoLibrary).mockResolvedValue([second, first]);
  jest.mocked(loadHeroAiLibrary).mockResolvedValue([{ uri: 'file:///Documents/hero-ai/hero-1-0.png' }]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  try {
    const groups = () => tree.root.findByProps({ testID: 'hero-character-gallery-list' }).props.data;
    expect(groups().filter((item: { id: string }) => item.id === 'original-photos')).toHaveLength(1);
    expect(groups().filter((item: { id: string }) => item.id === 'generated-illustrations')).toHaveLength(1);
    act(() => tree.root.findAllByProps({ testID: 'hero-gallery-character-original-photos' })[0].props.onPress());
    const photos = () => tree.root.findByProps({ testID: 'hero-character-artwork-list' }).props.data;
    expect(photos().map((item: { id: string }) => item.id)).toEqual([second.uri, first.uri]);
    const third = { uri: 'file:///Documents/hero-photos/photo-3-c.jpg', title: '새 사진', createdAt: 3 };
    jest.mocked(loadHeroOriginalPhotoLibrary).mockResolvedValue([third, second, first]);
    await act(async () => { notifyHeroAiLibraryChanged(); });
    expect(photos()).toHaveLength(3);
    expect(groups().filter((item: { id: string }) => item.id === 'original-photos')).toHaveLength(1);
  } finally { act(() => tree.unmount()); }
});

it('renames a single character image, persists it and does not open its preview', async () => {
  const { loadHeroSceneTitle } = require('../lib/heroSceneTitle');
  const scene = COMIC_CHARACTERS[0].scenes[0];
  const storageKey = `pokit:comic-scene-title:protagonist-1:${encodeURIComponent(scene.id)}`;
  localStorageClient.removeItem(storageKey);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
  try {
    act(() => tree.root.findAllByProps({ testID: 'hero-gallery-character-protagonist-1' })[0].props.onPress());
    const stopPropagation = jest.fn();
    act(() => tree.root.findAllByProps({ testID: `hero-gallery-scene-rename-${scene.id}` })[0].props.onPress({ stopPropagation }));
    expect(stopPropagation).toHaveBeenCalled();
    expect(tree.root.findAllByProps({ testID: 'hero-gallery-preview-close' })).toHaveLength(0);
    act(() => tree.root.findAllByProps({ testID: 'hero-gallery-scene-title-input' })[0].props.onChangeText('  나의 아침 운동  '));
    act(() => tree.root.findAllByProps({ testID: 'hero-gallery-scene-title-save' })[0].props.onPress());
    expect(loadHeroSceneTitle('protagonist-1', scene.id)).toBe('나의 아침 운동');
    expect(loadHeroSceneTitle('protagonist-2', scene.id)).toBeNull();
    act(() => tree.unmount());
    await act(async () => { tree = create(<HeroCharacterGalleryPage />); });
    act(() => tree.root.findAllByProps({ testID: 'hero-gallery-character-protagonist-1' })[0].props.onPress());
    expect(tree.root.findAllByProps({ testID: `hero-gallery-scene-${scene.id}` })[0].props.accessibilityLabel).toBe('나의 아침 운동');
  } finally { act(() => tree.unmount()); localStorageClient.removeItem(storageKey); }
});
