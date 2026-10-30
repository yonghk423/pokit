import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image as NativeImage } from 'react-native';
import { ComicSceneImage } from './HeroSceneImage';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
afterEach(() => { jest.useRealTimers(); });
it('keeps a skeleton until display and starts a fresh session when a recycled cell changes source', () => {
  let tree!: ReactTestRenderer;
  const render = (id: string) => <ComicSceneImage source={{ uri: id }} imageKey={id} style={{ width: 100, height: 80 }} />;
  act(() => { tree = create(render('first')); });
  const skeleton = () => tree.root.findAll(node => node.props.testID === 'comic-image-skeleton');
  const nativeImage = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(nativeImage().props.useAppleWebpCodec).toBe(false);
  expect(skeleton().length).toBeGreaterThan(0);
  act(() => { nativeImage().props.onDisplay(); });
  expect(skeleton()).toHaveLength(0);
  act(() => { tree.update(render('second')); });
  expect(skeleton().length).toBeGreaterThan(0);
  expect(nativeImage().props.source).toEqual(expect.objectContaining({ uri: 'second' }));
  act(() => { tree.unmount(); });
});
it('automatically retries without cache, then uses the optimized fallback, and offers manual retry only after all attempts fail', () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage source={{ uri: 'thumbnail-960.webp' }} fallbackSource={{ uri: 'fallback-960.webp' }} imageKey="scene" style={{ width: 100, height: 80 }} />); });
  const nativeImage = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  const retry = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.retryImage' && typeof node.props.onPress === 'function')[0];
  act(() => { nativeImage().props.onError(); });
  expect(retry()).toBeUndefined();
  act(() => { jest.advanceTimersByTime(300); });
  expect(nativeImage().props.cachePolicy).toBe('none');
  expect(nativeImage().props.source).toEqual(expect.objectContaining({ uri: 'thumbnail-960.webp' }));
  act(() => { nativeImage().props.onError(); });
  act(() => { jest.advanceTimersByTime(600); });
  expect(nativeImage().props.source).toEqual(expect.objectContaining({ uri: 'fallback-960.webp' }));
  act(() => { nativeImage().props.onError(); });
  expect(retry()).toBeDefined();
  act(() => { retry().props.onPress(); });
  expect(nativeImage().props.source).toEqual(expect.objectContaining({ uri: 'thumbnail-960.webp' }));
  expect(nativeImage().props.cachePolicy).toBe('none');
  act(() => { nativeImage().props.onDisplay(); });
  expect(retry()).toBeUndefined();
  act(() => { tree.unmount(); });
  expect(jest.getTimerCount()).toBe(0);
});
it('skips the skeleton when artwork that already displayed is mounted again', () => {
  let tree!: ReactTestRenderer;
  const render = () => <ComicSceneImage source={{ uri: 'shown' }} imageKey="shown-again" style={{ width: 100, height: 80 }} />;
  const skeleton = () => tree.root.findAll(node => node.props.testID === 'comic-image-skeleton');
  act(() => { tree = create(render()); });
  expect(skeleton().length).toBeGreaterThan(0);
  act(() => { tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0].props.onDisplay(); });
  act(() => { tree.unmount(); });
  act(() => { tree = create(render()); });
  expect(skeleton()).toHaveLength(0);
  act(() => { tree.unmount(); });
});
it('cancels pending retries when the screen closes', () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage source={{ uri: 'broken' }} imageKey="scene" style={{ width: 100, height: 80 }} />); });
  act(() => { tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0].props.onError(); });
  expect(jest.getTimerCount()).toBe(1);
  act(() => { tree.unmount(); });
  expect(jest.getTimerCount()).toBe(0);
});

it('uses full-size decoding and a fresh native cache for both tiny thumbnails and large details', () => {
  let tree!: ReactTestRenderer;
  const render = (size: number) => <ComicSceneImage source={{ uri: 'wake-960.webp', width: 720, height: 960 }} imageKey={`wake:${size}`} style={{ width: size, height: size * 4 / 3 }} />;
  act(() => { tree = create(render(32)); });
  const nativeImage = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  const check = () => {
    expect(nativeImage().props.allowDownscaling).toBe(false);
    expect(nativeImage().props.enforceEarlyResizing).toBe(false);
    expect(nativeImage().props.source).toEqual({ uri: 'wake-960.webp', width: 720, height: 960, cacheKey: 'comic-full-v1:wake-960.webp' });
  };
  check();
  act(() => { nativeImage().props.onDisplay(); });
  act(() => { tree.update(render(390)); });
  check();
  act(() => { tree.unmount(); });
});

it('resolves bundled artwork before assigning the full-resolution cache key', () => {
  const resolve = jest.spyOn(NativeImage, 'resolveAssetSource').mockReturnValue({ uri: 'file:///bundle/wake.webp', width: 720, height: 960, scale: 1 });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage source={123} imageKey="bundled-wake" style={{ width: 390, height: 520 }} />); });
  const nativeImage = tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(resolve).toHaveBeenCalledWith(123);
  expect(nativeImage.props.source).toEqual({ uri: 'file:///bundle/wake.webp', width: 720, height: 960, scale: 1, cacheKey: 'comic-full-v1:file:///bundle/wake.webp' });
  act(() => { tree.unmount(); });
  resolve.mockRestore();
});

it('keeps chooser artwork covered until native display even when a previous mount was cached', () => {
  let tree!: ReactTestRenderer;
  const render = () => <ComicSceneImage showSkeletonOnMount source={{ uri: 'chooser-cached' }} imageKey="chooser-cached" style={{ width: 100, height: 80 }} />;
  act(() => { tree = create(render()); });
  act(() => { tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0].props.onDisplay(); });
  act(() => { tree.unmount(); });
  act(() => { tree = create(render()); });
  expect(tree.root.findAllByProps({ testID: 'comic-image-skeleton' }).length).toBeGreaterThan(0);
  act(() => { tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0].props.onDisplay(); });
  expect(tree.root.findAllByProps({ testID: 'comic-image-skeleton' })).toHaveLength(0);
  act(() => { tree.unmount(); });
});

it('fills portrait photos while preserving landscape and square photos in full', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fillPortrait source={{ uri: 'mixed-photo' }} imageKey="portrait-fill" contentFit="contain" style={{ width: 100, height: 120 }} />); });
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width: 600, height: 1000 } }));
  expect(image().props.contentFit).toBe('cover');
  act(() => image().props.onLoad({ source: { width: 1000, height: 600 } }));
  expect(image().props.contentFit).toBe('contain');
  act(() => image().props.onLoad({ source: { width: 600, height: 600 } }));
  expect(image().props.contentFit).toBe('contain');
  act(() => tree.unmount());
});
