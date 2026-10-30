import { HeroPhotoPreview } from './HeroPhotoPreview';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { HeroPhotoSource } from './HeroPhotoSource';
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../lib/heroPhotoUseNotice', () => ({ requestHeroPhotoUseNotice: jest.fn().mockResolvedValue(true) }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));

it.each([3, 2, 1, 0])('configures the actual photo picker for the remaining quota: %s', async limit => {
  jest.mocked(launchImageLibraryAsync).mockReset().mockResolvedValue({ canceled: false, assets: ['one', 'two', 'three', 'four'].map(id => ({ uri: `file:///${id}.jpg`, width: 100, height: 100 })) });
  const onSelect = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPhotoSource mode="photo" uri={null} selectionLimit={limit} onChange={jest.fn()} onSelect={onSelect} />); });
  const button = tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.photo.choose' && typeof node.props.onPress === 'function')[0];
  expect(button.props.disabled).toBe(limit === 0);
  await act(async () => button.props.onPress());
  if (limit === 0) {
    expect(launchImageLibraryAsync).not.toHaveBeenCalled();
  } else {
    expect(launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ allowsMultipleSelection: limit > 1, selectionLimit: limit }));
    expect(onSelect.mock.calls[0][0]).toHaveLength(limit);
  }
  act(() => tree.unmount());
});


it('shows every selected photo in the first screen and updates after replacement', () => {
  const photos = ['file:///one.jpg', 'file:///two.jpg', 'file:///three.jpg'];
  let tree!: ReactTestRenderer;
  const render = (selectedUris: string[]) => <HeroPhotoSource compactPreview mode="photo" uri={selectedUris[0]} selectedUris={selectedUris} onChange={jest.fn()} />;
  act(() => { tree = create(render(photos)); });
  expect(tree.root.findAllByType(HeroPhotoPreview).map(node => node.props.uri)).toEqual(photos);
  expect(tree.root.findAllByProps({ testID: 'hero-source-photo-row' })[0].props.style.flexDirection).toBe('row');
  act(() => tree.update(render(['file:///replacement.jpg'])));
  expect(tree.root.findAllByType(HeroPhotoPreview).map(node => node.props.uri)).toEqual(['file:///replacement.jpg']);
  act(() => tree.unmount());
});

it('shows opening feedback immediately and blocks duplicate picker requests', async () => {
  const frames = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0; });
  let finish!: (value: { canceled: true; assets: null }) => void;
  jest.mocked(launchImageLibraryAsync).mockReset().mockReturnValue(new Promise(resolve => { finish = resolve; }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPhotoSource mode="photo" uri={null} onChange={jest.fn()} />); });
  const button = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.photo.choose' && typeof node.props.onPress === 'function')[0];
  let pending!: Promise<void>;
  await act(async () => { pending = button().props.onPress(); void button().props.onPress(); await Promise.resolve(); });
  expect(tree.root.findAllByProps({ testID: 'hero-photo-opening' }).length).toBeGreaterThan(0);
  expect(button().props.disabled).toBe(true);
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ canceled: true, assets: null }); await pending; });
  expect(tree.root.findAllByProps({ testID: 'hero-photo-opening' })).toHaveLength(0);
  expect(button().props.disabled).toBe(false);
  act(() => tree.unmount());
  frames.mockRestore();
});
