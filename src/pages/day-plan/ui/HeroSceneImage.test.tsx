import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image as NativeImage, StyleSheet } from 'react-native';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
afterEach(() => { jest.useRealTimers(); });
function layoutCard(tree: ReactTestRenderer, width = 300, height = 400) {
  act(() => tree.root.findAll(node => typeof node.props.onLayout === 'function')[0].props.onLayout({ nativeEvent: { layout: { width, height } } }));
}
it('anchors portraits at the top so width filling preserves the head, while wide images fill the frame', () => {
  let tree!: ReactTestRenderer;
  const render = (width: number, height: number) => <ComicSceneImage fitToCard source={{ uri: `top-framing-${width}-${height}`, width, height }} imageKey={`top-framing-${width}-${height}`} style={{ width: 300, height: 350 }} />;
  act(() => { tree = create(render(768, 960)); });
  layoutCard(tree, 300, 350);
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(image().props.contentFit).toBe('fill');
  const frame = StyleSheet.flatten(image().props.style);
  expect(frame.top).toBe(0);
  expect(frame.width / frame.height).toBeCloseTo(768 / 960);
  expect(frame.height).toBeGreaterThanOrEqual(350);
  expect(image().props.contentPosition).toBe('top');
  act(() => tree.update(render(1200, 800)));
  expect(image().props.contentFit).toBe('cover');
  expect(image().props.contentPosition).toBeUndefined();
  act(() => tree.unmount());
});

it.each([[600, 1000, 'fill'], [1000, 600, 'cover']])('keeps %s×%s artwork framing across new URI objects and remounted cards', (width, height, fit) => {
  let tree!: ReactTestRenderer;
  const uri = `file:///stable-framing-${width}-${height}.png`;
  const render = (key: string) => <ComicSceneImage fitToCard source={{ uri }} imageKey={key} style={{ width: 300, height: 400 }} />;
  act(() => { tree = create(render('first-card')); });
  layoutCard(tree);
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width, height } }));
  act(() => image().props.onDisplay());
  expect(image().props.contentFit).toBe(fit);
  act(() => tree.update(render('first-card')));
  expect(image().props.contentFit).toBe(fit);
  expect(StyleSheet.flatten(image().props.style).opacity).not.toBe(0);
  act(() => tree.unmount());
  act(() => { tree = create(render('remounted-card')); });
  layoutCard(tree);
  expect(image().props.contentFit).toBe(fit);
  expect(StyleSheet.flatten(image().props.style).opacity).not.toBe(0);
  act(() => tree.unmount());
});

it('never reveals an unknown-size card in the temporary contain layout', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fitToCard source={{ uri: 'file:///first-ever-portrait.png' }} imageKey="first-ever-portrait" style={{ width: 300, height: 400 }} />); });
  layoutCard(tree);
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(StyleSheet.flatten(image().props.style).opacity).toBe(0);
  act(() => image().props.onDisplay());
  expect(tree.root.findAllByProps({ testID: 'comic-image-skeleton' }).length).toBeGreaterThan(0);
  expect(StyleSheet.flatten(image().props.style).opacity).toBe(0);
  act(() => image().props.onLoad({ source: { width: 600, height: 1000 } }));
  expect(image().props.contentFit).toBe('fill');
  expect(StyleSheet.flatten(image().props.style).opacity).not.toBe(0);
  expect(tree.root.findAllByProps({ testID: 'comic-image-skeleton' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('uses thumbnail dimensions before a full card loads the same file', () => {
  let tree!: ReactTestRenderer;
  const source = { uri: 'file:///thumb-to-card-portrait.png' };
  act(() => { tree = create(<ComicSceneImage source={source} imageKey="sizing-thumb" style={{ width: 44, height: 44 }} />); });
  act(() => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0].props.onLoad({ source: { width: 600, height: 1000 } }));
  act(() => tree.unmount());
  act(() => { tree = create(<ComicSceneImage fitToCard source={{ ...source }} imageKey="sizing-full-card" style={{ width: 300, height: 400 }} />); });
  layoutCard(tree);
  const image = tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(image.props.contentFit).toBe('fill');
  expect(StyleSheet.flatten(image.props.style).opacity).not.toBe(0);
  act(() => tree.unmount());
});

it('removes baked sidebars using an exact-ratio image pinned at the top with no scale transform', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fitToCard source={COMIC_SCENE_THUMBNAILS['p3-38-mountain-hike']} imageKey="head-safe-padded-hike" style={{ width: 326, height: 455 }} />); });
  layoutCard(tree, 326, 455);
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width: 768, height: 960 } }));
  const frame = StyleSheet.flatten(image().props.style);
  expect(image().props.contentFit).toBe('fill');
  expect(frame.width / frame.height).toBeCloseTo(768 / 960);
  expect(frame.top).toBe(0);
  expect(frame.height).toBeGreaterThanOrEqual(455);
  expect(frame.width * 718 / 768).toBeGreaterThanOrEqual(326);
  expect(frame.left).toBeCloseTo((326 - frame.width) / 2);
  expect(frame.transform).toBeUndefined();
  act(() => tree.unmount());
});

it.each([
  [1200, 800, 'cover'],
  [800, 1200, 'cover'],
  [900, 900, 'cover'],
])('fits %s×%s card artwork with %s before and after native load', (width, height, fit) => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fitToCard source={{ uri: `card-${width}-${height}`, width, height }} imageKey={`card-${width}-${height}`} style={{ width: 300, height: 400 }} />); });
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(image().props.contentFit).toBe(fit);
  act(() => image().props.onLoad({ source: { width, height } }));
  expect(image().props.contentFit).toBe(fit);
  act(() => tree.unmount());
});

it('learns remote card orientation and recalculates it for a different fallback image', () => {
  jest.useFakeTimers();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fitToCard source={{ uri: 'remote-card' }} fallbackSource={{ uri: 'wide-fallback', width: 1200, height: 800 }} imageKey="card-fallback-orientation" style={{ width: 300, height: 400 }} />); });
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width: 800, height: 1200 } }));
  expect(image().props.contentFit).toBe('cover');
  act(() => image().props.onError());
  act(() => jest.advanceTimersByTime(300));
  act(() => image().props.onError());
  act(() => jest.advanceTimersByTime(600));
  expect(image().props.source.uri).toBe('wide-fallback');
  expect(image().props.contentFit).toBe('cover');
  act(() => tree.unmount());
});
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

it('keeps portraits in full and fills their side space with a blurred backdrop', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fillPortrait source={{ uri: 'mixed-photo' }} imageKey="portrait-fill" contentFit="contain" style={{ width: 100, height: 120 }} />); });
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width: 600, height: 1000 } }));
  expect(image().props.contentFit).toBe('contain');
  expect(tree.root.findAllByProps({ testID: 'comic-image-portrait-backdrop' }).length).toBeGreaterThan(0);
  act(() => image().props.onLoad({ source: { width: 1000, height: 600 } }));
  expect(image().props.contentFit).toBe('contain');
  act(() => image().props.onLoad({ source: { width: 600, height: 600 } }));
  expect(image().props.contentFit).toBe('contain');
  act(() => tree.unmount());
});

it('fills a wide uploaded photo after its dimensions load in the detail view', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage source={{ uri: 'file:///Documents/hero-photos/photo-456-abc.jpg' }} imageKey="wide-original-detail" style={{ width: 300, height: 450 }} />); });
  const image = () => tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  act(() => image().props.onLoad({ source: { width: 1800, height: 600 } }));
  expect(image().props.contentFit).toBe('cover');
  expect(image().props.contentPosition).toBe('center');
  act(() => tree.unmount());
});

it.each([[1200, 675], [600, 1200], [900, 900]])('fills original %s×%s photos without side margins', (width, height) => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicSceneImage fitToCard contentFit="cover" source={{ uri: 'file:///Documents/hero-photos/photo-123-abc.jpg', width, height }} imageKey={`original-${width}-${height}`} style={{ width: 300, height: 400 }} />); });
  layoutCard(tree);
  const image = tree.root.findAll(node => typeof node.props.onDisplay === 'function')[0];
  expect(image.props.contentFit).toBe('cover');
  expect(image.props.contentPosition).toBe('center');
  expect(StyleSheet.flatten(image.props.style).width).toBeUndefined();
  act(() => tree.unmount());
});
