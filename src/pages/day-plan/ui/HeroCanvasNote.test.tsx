import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, PanResponder, View, type PanResponderCallbacks } from 'react-native';
import { HeroCanvasNote } from './HeroCanvasNote';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(() => []), setJson: jest.fn(), getItemRaw: jest.fn(() => 'Saved story'), setItemRaw: jest.fn() } }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ events: [], refresh: jest.fn() }) }));
jest.mock('@features/apple-calendar/appleCalendar', () => ({ useAppleCalendar: () => [] }));
jest.mock('../model/heroCanvasEvents', () => ({ saveCanvasEvents: jest.fn() }));
jest.mock('@shared/ui/native-hhmm-wheel-picker/NativeHhmmWheelPicker', () => ({ NativeHhmmWheelPicker: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 54, bottom: 34, left: 0, right: 0 }) }));

it.each(['story', 'calendar', 'event'].flatMap(tab => [-1000, -40].map(distance => ({ tab, distance }))))('keeps $tab open after an upward drag of $distance', ({ tab, distance }) => {
  let gesture!: PanResponderCallbacks;
  jest.spyOn(PanResponder, 'create').mockImplementation(config => { gesture = config; return { panHandlers: {} }; });
  jest.spyOn(Animated, 'spring').mockImplementation((value, config) => ({ start: () => { (value as Animated.Value).setValue(config.toValue as number); }, stop: jest.fn(), reset: jest.fn() }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-10" ink="#222222" />); });
  const canvas = tree.root.findAllByType(View).find(node => node.props.onLayout && node.props.style?.flex === 1)!;
  act(() => canvas.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  act(() => tree.root.findByProps({ testID: `hero-canvas-tab-${tab}` }).props.onPress());
  const top = () => tree.root.findByProps({ testID: 'hero-canvas-reading-panel' }).props.style.top.__getValue();
  expect(top()).toBe(582);
  act(() => gesture.onPanResponderGrant!({} as any, {} as any));
  act(() => gesture.onPanResponderMove!({} as any, { dy: distance } as any));
  expect(top()).toBe(Math.max(102, 582 + distance));
  act(() => gesture.onPanResponderRelease!({} as any, { dy: distance, dx: 0, vy: 1 } as any));
  expect(tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.accessibilityState.expanded).toBe(true);
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:canvas-panel-expanded', true);
  expect(top()).toBe(102); // remains below the date after release
  act(() => canvas.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  expect(top()).toBe(102);
  expect(tree.root.findByProps({ testID: 'hero-canvas-note' }).props.value).toBe('Saved story');
  const panel = tree.root.findByProps({ testID: 'hero-canvas-reading-panel' });
  const contentId = tab === 'calendar' ? 'hero-canvas-calendar-events' : tab === 'event' ? 'hero-canvas-own-events' : 'hero-canvas-note';
  expect(panel.findByProps({ testID: contentId })).toBeDefined();
  act(() => tree.root.findByProps({ testID: 'hero-canvas-tab-story' }).props.onPress());
  expect(top()).toBe(102);
  act(() => tree.root.findByProps({ testID: `hero-canvas-tab-${tab}` }).props.onPress());
  expect(top()).toBe(102);
  act(() => gesture.onPanResponderGrant!({} as any, {} as any));
  act(() => gesture.onPanResponderMove!({} as any, { dy: 1000 } as any));
  expect(top()).toBe(582);
  act(() => gesture.onPanResponderRelease!({} as any, { dy: 1000, dx: 0, vy: 1 } as any));
  expect(tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.accessibilityState.expanded).toBe(false);
  expect(localStorageClient.setItemRaw).not.toHaveBeenCalled();
  act(() => tree.unmount());
  jest.restoreAllMocks();
});

it('restores the expanded panel on another date without a collapsed first render', () => {
  jest.mocked(localStorageClient.getJson).mockImplementation(key => key === 'pokit:canvas-panel-expanded' ? true : [] as any);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-11" ink="#222222" />); });
  const canvas = tree.root.findAllByType(View).find(node => node.props.onLayout && node.props.style?.flex === 1)!;
  act(() => canvas.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  expect(tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.accessibilityState.expanded).toBe(true);
  expect(tree.root.findByProps({ testID: 'hero-canvas-reading-panel' }).props.style.top.__getValue()).toBe(102);
  act(() => tree.unmount());
});
