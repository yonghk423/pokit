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
