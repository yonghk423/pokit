let mockPro = false;
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('@shared/lib/scheduleIdleTask', () => ({ scheduleIdleTask: (work: () => void) => { work(); return {cancel: jest.fn()}; } }));
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({
  useSubscriptionStore: Object.assign(() => mockPro, { getState: () => ({}) }), selectIsPro: () => mockPro,
}));
jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: () => undefined }));
jest.mock('./HeroMiniMemo', () => ({ HeroMiniMemo: () => null }));
jest.mock('./HeroMovablePocket', () => ({ HeroMovablePocket: () => null }));
jest.mock('./HeroTrashIcon', () => ({ HeroTrashIcon: () => null }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, PanResponder, View, type PanResponderCallbacks } from 'react-native';
import { PostItColorGrid } from '@shared/ui/post-it-color-palette';
import { router } from 'expo-router';
import { HeroCanvasNote } from './HeroCanvasNote';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(() => null), setJson: jest.fn(), getItemRaw: jest.fn(() => 'Saved story'), setItemRaw: jest.fn() } }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ events: [], refresh: jest.fn() }) }));
jest.mock('@features/apple-calendar/appleCalendar', () => ({ useAppleCalendar: () => [] }));
jest.mock('../model/heroCanvasEvents', () => ({ saveCanvasEvents: jest.fn() }));
jest.mock('@shared/ui/native-hhmm-wheel-picker/NativeHhmmWheelPicker', () => ({ NativeHhmmWheelPicker: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 54, bottom: 34, left: 0, right: 0 }) }));

beforeEach(() => {
  jest.mocked(localStorageClient.getJson).mockImplementation(() => null);
  mockPro = false;
  jest.clearAllMocks();
});
afterEach(() => jest.restoreAllMocks());

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
  expect(top()).toBe(Math.max(58, 582 + distance));
  act(() => gesture.onPanResponderRelease!({} as any, { dy: distance, dx: 0, vy: 1 } as any));
  expect(tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.accessibilityState.expanded).toBe(true);
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:canvas-panel-expanded', true);
  expect(top()).toBe(58); // remains below the date after release
  act(() => canvas.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  expect(top()).toBe(58);
  expect(tree.root.findAll(node => typeof node.props.onFocusChange === 'function' && typeof node.props.storageKey === 'string')[0].props.storageKey).toBe('pokit:canvas-note:2026-11-10');
  const panel = tree.root.findByProps({ testID: 'hero-canvas-reading-panel' });
  const contentId = tab === 'calendar' ? 'hero-canvas-calendar-events' : tab === 'event' ? 'hero-canvas-own-events' : 'hero-canvas-note';
  expect(panel.findByProps({ testID: contentId })).toBeDefined();
  act(() => tree.root.findByProps({ testID: 'hero-canvas-tab-story' }).props.onPress());
  expect(top()).toBe(58);
  act(() => tree.root.findByProps({ testID: `hero-canvas-tab-${tab}` }).props.onPress());
  expect(top()).toBe(58);
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
  jest.mocked(localStorageClient.getJson).mockImplementation(key => key === 'pokit:canvas-panel-expanded' ? true : null);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-11" ink="#222222" />); });
  const canvas = tree.root.findAllByType(View).find(node => node.props.onLayout && node.props.style?.flex === 1)!;
  act(() => canvas.props.onLayout({ nativeEvent: { layout: { height: 800 } } }));
  expect(tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.accessibilityState.expanded).toBe(true);
  expect(tree.root.findByProps({ testID: 'hero-canvas-reading-panel' }).props.style.top.__getValue()).toBe(58);
  act(() => tree.unmount());
});

it('shows time controls only while editing and deletes only the confirmed event', () => {
  const { AppAlert } = require('@shared/lib/app-alert');
  const { saveCanvasEvents } = require('../model/heroCanvasEvents');
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => {});
  const events = [{ id: 'one', title: 'First', time: '09:00' }, { id: 'two', title: 'Second' }];
  jest.mocked(localStorageClient.getJson).mockImplementation(key => key === 'pokit:canvas-events:2026-11-11' ? events : undefined);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-11" ink="#222222" />); });
  act(() => tree.root.findByProps({ testID: 'hero-canvas-tab-event' }).props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-event-time' })).toHaveLength(0);
  act(() => tree.root.findByProps({ testID: 'hero-event-delete-one' }).props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-event-delete-one' }).length).toBeGreaterThan(0);
  const buttons = alert.mock.calls[0][2] as any[];
  act(() => buttons.find(button => button.style === 'destructive').onPress());
  expect(saveCanvasEvents).toHaveBeenLastCalledWith('2026-11-11', [events[1]]);
  expect(tree.root.findAllByProps({ testID: 'hero-event-delete-one' })).toHaveLength(0);
  act(() => tree.root.findByProps({ testID: 'hero-event-title' }).props.onFocus());
  expect(tree.root.findAllByProps({ testID: 'hero-event-time' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
  alert.mockRestore();
});


it('places the return action inside the editing canvas and keeps it tappable above the input', () => {
  const back = jest.fn();
  const { Pressable } = require('react-native');
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-14" ink="#222222" returnAction={<Pressable testID="note-back" onPress={back} />} />); });
  try {
    expect(tree.root.findAllByProps({ testID: 'hero-canvas-recording-return' })).toHaveLength(0);
    act(() => tree.root.findByProps({ testID: 'hero-canvas-clip-handle' }).props.onAccessibilityAction());
    const expandedAction = tree.root.findByProps({ testID: 'hero-canvas-expanded-return' });
    expect(expandedAction.props.style.right).toBe(20);
    expect(expandedAction.props.style.top).toBe(64);
    act(() => expandedAction.findAllByProps({ testID: 'note-back' })[0].props.onPress());
    expect(back).toHaveBeenCalledTimes(1);
    back.mockClear();
    act(() => tree.root.findAll(node => typeof node.props.onFocusChange === 'function' && typeof node.props.storageKey === 'string')[0].props.onFocusChange(true));
    const action = tree.root.findByProps({ testID: 'hero-canvas-recording-return' });
    expect(action.props.style.top).toBe(64);
    expect(action.props.style.zIndex).toBe(30);
    act(() => action.findAllByProps({ testID: 'note-back' })[0].props.onPress());
    expect(back).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});

it.each(['pen', 'paper'] as const)('gates %s color edits and stale callbacks after expiry', kind => {
  mockPro = true;
  let tree!: ReactTestRenderer;
  const component = <HeroCanvasNote date="2026-11-21" ink="#222222" />;
  act(() => { tree = create(component); });
  const note = tree.root.findAll(node => typeof node.props.onFocusChange === 'function' && typeof node.props.storageKey === 'string')[0];
  act(() => note.props.onFocusChange(true));
  const label = kind === 'pen' ? '글자색' : '배경색';
  const button = () => tree.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' &&
    node.findAll(child => Array.isArray(child.props.children) && child.props.children[0] === label).length > 0)[0];
  act(() => button().props.onPress());
  const grid = tree.root.findByType(PostItColorGrid);
  const choice = grid.props.choices[0];
  act(() => choice.onSelect());
  expect(localStorageClient.setJson).toHaveBeenCalledWith('pokit:canvas-note:2026-11-21:colors', expect.objectContaining({[kind]: choice.color}));
  mockPro = false;
  jest.mocked(localStorageClient.setJson).mockClear();
  act(() => choice.onSelect());
  expect(localStorageClient.setJson).not.toHaveBeenCalled();
  act(() => tree.update(<HeroCanvasNote date="2026-11-21" ink="#222222" />));
  expect(tree.root.findAllByType(PostItColorGrid)).toHaveLength(0);
  act(() => button().props.onPress());
  expect(router.push).toHaveBeenCalledWith('/pro-preview');
  act(() => tree.unmount());
});
it.each([false, true])('gates illustration picker with Pro=%s', pro => {
  mockPro = pro;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-21" ink="#222222" />); });
  act(() => tree.root.findAll(node => typeof node.props.onFocusChange === 'function' && typeof node.props.storageKey === 'string')[0].props.onFocusChange(true));
  act(() => tree.root.findByProps({testID:'hero-canvas-illustrations'}).props.onPress());
  expect(tree.root.findByProps({testID:'hero-canvas-illustrations'}).props.accessibilityState.expanded).toBe(pro);
  if (!pro) expect(router.push).toHaveBeenCalledWith('/pro-preview');
  act(() => tree.unmount());
});
