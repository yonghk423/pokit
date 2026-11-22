let mockPro = true;
jest.mock('@features/subscriptions', () => ({
  useSubscriptionStore: (select: () => boolean) => select(),
  selectCanTestProStoreItems: () => mockPro,
}));
beforeEach(() => { mockPro = true; });
import { act, create } from 'react-test-renderer';
import { ComicSceneImage } from './HeroSceneImage';
import { ensurePremiumScene } from '../lib/heroPremiumPack';
jest.mock('../lib/heroPremiumPack', () => ({ ensurePremiumScene: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
it('waits for the restored file before decoding and uses a fresh native image cache', async () => {
  let finish!: (ready: boolean) => void;
  jest.mocked(ensurePremiumScene).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<ComicSceneImage source={{ uri: 'file:///documents/character-packs/protagonist-7/p7-01.webp' }} imageKey="restored-scene" style={{ width: 300, height: 400 }} />); });
  act(() => { tree.root.findAll(n => typeof n.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width: 300, height: 400 } } }); });
  expect(tree.root.findAll(n => typeof n.props.onDisplay === 'function')).toHaveLength(0);
  await act(async () => { finish(true); });
  const images = tree.root.findAll(n => typeof n.props.onDisplay === 'function');
  expect(images.length).toBeGreaterThan(0);
  expect(images[0].props.source.cacheKey).toContain('comic-scene-display-v6-release');
  act(() => { tree.unmount(); });
});

it('offers retry after a failed restoration without displaying a low-resolution fallback', async () => {
  jest.useFakeTimers();
  jest.mocked(ensurePremiumScene).mockReset().mockResolvedValue(false);
  let tree!: ReturnType<typeof create>;
  try {
    await act(async () => { tree = create(<ComicSceneImage source={{ uri: 'file:///documents/character-packs/protagonist-7/p7-01.webp' }} fallbackSource={{ uri: 'file:///thumbnail.webp' }} imageKey="restoration-failure" style={{ width: 300, height: 400 }} />); });
    for (let attempt = 0; attempt < 3; attempt++) {
      await act(async () => { await jest.runOnlyPendingTimersAsync(); });
    }
    expect(ensurePremiumScene).toHaveBeenCalledTimes(3);
    expect(tree.root.findAll(n => typeof n.props.onDisplay === 'function')).toHaveLength(0);
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'button').length).toBeGreaterThan(0);
  } finally {
    act(() => { tree.unmount(); });
    jest.useRealTimers();
  }
});

it('unmounts downloaded paid artwork on expiry and restores it on renewal', async () => {
  jest.mocked(ensurePremiumScene).mockResolvedValue(true);
  const props = { source: { uri: 'file:///documents/character-packs/protagonist-7/p7-01.webp' }, imageKey: 'expiry', style: { width: 300, height: 400 } };
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<ComicSceneImage {...props} />); });
  expect(tree.root.findAllByProps({ testID: 'premium-scene-locked' })).toHaveLength(0);
  mockPro = false;
  act(() => tree.update(<ComicSceneImage {...props} />));
  expect(tree.root.findAllByProps({ testID: 'premium-scene-locked' }).length).toBeGreaterThan(0);
  expect(tree.root.findAll(n => typeof n.props.onDisplay === 'function')).toHaveLength(0);
  mockPro = true;
  await act(async () => { tree.update(<ComicSceneImage {...props} />); });
  expect(tree.root.findAllByProps({ testID: 'premium-scene-locked' })).toHaveLength(0);
  act(() => tree.unmount());
});

jest.mock('./HeroPolaroidExport', () => ({ HeroPolaroidExport: () => null, formatHeroPolaroidDate: jest.fn() }));
jest.mock('./HeroTrashIcon', () => ({ HeroTrashIcon: () => null }));
import { HeroImageActions } from './HeroImageActions';
it('blocks editing and exporting a downloaded paid scene after expiry', () => {
  mockPro = false;
  const onClose = jest.fn();
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<HeroImageActions uri="file:///documents/character-packs/protagonist-7/p7-01.webp" editorOnly onEditorClose={onClose} />); });
  const locked = tree.root.findAll(n => n.props.testID === 'premium-image-actions-locked' && typeof n.props.onPress === 'function')[0];
  expect(locked).toBeDefined();
  act(() => locked.props.onPress());
  expect(onClose).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
