import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, View } from 'react-native';
import { HeroFacePhotoPanel } from './HeroFacePhotoPanel';

it('animates between the measured preview and action heights and disables hidden actions', async () => {
  jest.useFakeTimers();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  let tree!: ReactTestRenderer;
  const render = (open: boolean) => <HeroFacePhotoPanel open={open} actions={<View />} preview={<View />} />;
  await act(async () => { tree = create(render(false)); });
  const measure = tree.root.findAllByType(View).filter(node => typeof node.props.onLayout === 'function');
  act(() => {
    measure[0].props.onLayout({ nativeEvent: { layout: { height: 108 } } });
    measure[1].props.onLayout({ nativeEvent: { layout: { height: 140 } } });
  });
  act(() => jest.advanceTimersByTime(300));
  const height = () => tree.root.findAllByProps({ testID: 'hero-face-photo-panel' })[0].props.style.height.__getValue();
  expect(height()).toBe(140);
  act(() => tree.update(render(true)));
  expect(height()).toBe(140);
  act(() => jest.advanceTimersByTime(300));
  expect(height()).toBe(108);
  act(() => tree.update(render(false)));
  expect(tree.root.findAllByProps({ testID: 'hero-face-photo-actions' })[0].props.pointerEvents).toBe('none');
  act(() => jest.advanceTimersByTime(300));
  expect(height()).toBe(140);
  act(() => tree.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});
