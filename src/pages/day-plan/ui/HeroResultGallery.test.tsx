import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroResultGallery } from './HeroResultGallery';
import { HeroImageActions } from './HeroImageActions';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));

it('starts multiple results together, opens the tapped photo and keeps it selected across view changes', () => {
  const images = [{ uri: 'file:///one.png' }, { uri: 'file:///two.png' }, { uri: 'file:///three.png' }];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroResultGallery images={images} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-result-grid' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-result-open-1' })[0].props.onPress());
  const pager = () => tree.root.findAllByProps({ testID: 'hero-result-pager' })[0];
  expect(pager().props.initialScrollIndex).toBe(1);
  expect(tree.root.findAllByType(HeroImageActions).map(node => node.props.uri)).toContain('file:///two.png');
  act(() => tree.root.findAllByProps({ testID: 'hero-result-view-2' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-result-view-2' })[0].props.accessibilityState.selected).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-result-view-1' })[0].props.onPress());
  expect(pager().props.initialScrollIndex).toBe(1);
  act(() => pager().props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 640 } } }));
  act(() => tree.root.findAllByProps({ testID: 'hero-result-viewport' })[0].props.onLayout({ nativeEvent: { layout: { width: 400, height: 500 } } }));
  expect(pager().props.initialScrollIndex).toBe(2);
  expect(pager().props.getItemLayout(null, 2)).toEqual({ length: 400, offset: 800, index: 2 });
  act(() => tree.unmount());
});

it('opens one result at a height that fits the viewport with its actions', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroResultGallery images={[{ uri: 'file:///one.png' }]} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-result-pager' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-result-viewport' })[0].props.onLayout({ nativeEvent: { layout: { width: 350, height: 300 } } }));
  expect(tree.root.findAllByProps({ testID: 'hero-result-large-image' })[0].props.style.height).toBe(238);
  expect(tree.root.findAllByProps({ testID: 'hero-result-next-0' })[0].props.disabled).toBe(true);
  act(() => tree.unmount());
});
