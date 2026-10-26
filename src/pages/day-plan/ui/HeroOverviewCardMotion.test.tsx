import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, Text } from 'react-native';
import { HeroOverviewCardMotion } from './HeroOverviewCardMotion';

it('moves and resizes each overview card from the focused deck frame to its measured grid slot', () => {
  const progress = new Animated.Value(0);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroOverviewCardMotion progress={progress} index={0} count={3}
    source={{ active: 0, width: 300, height: 400 }} stageWidth={400} sourceTop={12} parentTop={20}
    style={{ width: 100 }} enabled><Text>scene</Text></HeroOverviewCardMotion>); });
  const card = () => tree.root.findAll(node => node.props.testID === 'comic-overview-motion-0' && typeof node.props.onLayout === 'function')[0];
  act(() => card().props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 100, height: 150 } } }));
  const transform = () => card().props.style[2].transform.map((part: Record<string, { __getValue: () => unknown }>) => Object.values(part)[0].__getValue());
  expect(transform()).toEqual([134, 117, 3, 400 / 150, '0deg']);
  act(() => progress.setValue(1));
  expect(transform()).toEqual([0, 0, 1, 1, '0deg']);
  act(() => progress.setValue(0));
  expect(transform()).toEqual([134, 117, 3, 400 / 150, '0deg']);
  act(() => tree.unmount());
});
