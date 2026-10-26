jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: jest.requireActual('react-native').View,
  GestureDetector: ({ children }: { children: unknown }) => children,
  Gesture: {
    Native: () => ({ kind: 'native-scroll' }),
    Pan: () => {
      const gesture: Record<string, unknown> = { handlers: {} };
      for (const key of ['minDistance', 'maxPointers', 'shouldCancelWhenOutside', 'blocksExternalGesture']) gesture[key] = (value: unknown) => { gesture[key + 'Value'] = value; return gesture; };
      for (const key of ['onBegin', 'onUpdate', 'onFinalize']) gesture[key] = (callback: unknown) => { (gesture.handlers as Record<string, unknown>)[key] = callback; return gesture; };
      return gesture;
    },
  },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View },
  useSharedValue: (value: number) => jest.requireActual('react').useRef({ value, get() { return this.value; }, set(next: number) { this.value = next; } }).current,
  useAnimatedStyle: (fn: () => unknown) => fn(),
  runOnJS: (fn: unknown) => fn,
}));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ComicRhythmTimeLayout } from './HeroMateTimeLayout';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/native-hhmm-wheel-picker', () => ({ NativeHhmmWheelPicker: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
it('edits the existing time window from compact controls and retains the primary confirmation action', () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  const onChange = jest.fn(), onPrimary = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicRhythmTimeLayout start="07:00" end="23:00" nextDay={false} onChange={onChange} endDateControls={null} primaryLabel="Start my day" onPrimary={onPrimary} />); });
  const circularContent = tree.root.findByProps({ testID: 'rhythm-circle-content' });
  const circleStyle = require('react-native').StyleSheet.flatten(circularContent.props.style);
  expect(circleStyle.overflow).toBe('hidden');
  expect(circleStyle.width).toBe(circleStyle.height);
  expect(circleStyle.borderRadius).toBeCloseTo(circleStyle.width / 2);
  const suns = tree.root.findAll(node => typeof node.props.onMinute === 'function' && node.props.kind === 'sun');
  expect(suns).toHaveLength(2);
  expect(suns[1].props.minutes - suns[0].props.minutes).toBe(1440);
  act(() => { suns[1].props.onMinute(suns[1].props.minutes + 30); });
  expect(onChange).toHaveBeenLastCalledWith('07:30', '23:00', false);
  onChange.mockClear();
  const highlightedTexts = tree.root.findAll(node => node.type === jest.requireActual('react-native').Text && typeof node.props.onTextLayout === 'function');
  expect(highlightedTexts).toHaveLength(2);
  act(() => {
    highlightedTexts[0].props.onTextLayout({ nativeEvent: { lines: [{ x: 2, y: 0, width: 96, height: 28 }] } });
    highlightedTexts[1].props.onTextLayout({ nativeEvent: { lines: [{ x: 0, y: 0, width: 180, height: 23 }] } });
  });
  const highlights = tree.root.findAll(node => node.props.testID === 'text-width-highlight' && typeof node.props.width === 'number');
  expect(highlights.length).toBeGreaterThanOrEqual(2);
  expect(highlights.map(node => node.props.width)).toEqual(expect.arrayContaining([96, 180]));
  expect(highlights.every(node => node.props.width === 96 || node.props.width === 180)).toBe(true);
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  act(() => { button('dayRhythm.dayStart').props.onPress(); });
  expect(tree.root.findAll(node => typeof node.props.onChangeHhmm === 'function')[0].props.valueHhmm).toBe('07:00');
  act(() => { tree.root.findAll(node => typeof node.props.onChangeHhmm === 'function')[0].props.onChangeHhmm('08:30'); });
  act(() => { button('common.save').props.onPress(); });
  expect(onChange).toHaveBeenCalledWith('08:30', '23:00', false);
  expect(onPrimary).not.toHaveBeenCalled();
  act(() => { button('Start my day').props.onPress(); });
  expect(onPrimary).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
  expect(errors.mock.calls.filter(args => args.some(arg => typeof arg === 'string' && arg.includes('same key')))).toHaveLength(0);
  errors.mockRestore();
});

it('previews drag changes locally and commits the latest position only once on release', () => {
  jest.useFakeTimers();
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicRhythmTimeLayout start="07:00" end="23:00" nextDay={false} onChange={onChange} endDateControls={null} primaryLabel="Save" onPrimary={jest.fn()} />); });
  const sun = () => tree.root.findAll(node => typeof node.props.onMinute === 'function' && node.props.kind === 'sun')[0];
  act(() => { sun().props.onDragging(true); });
  act(() => { sun().props.onMinute(480); sun().props.onMinute(485); sun().props.onMinute(490); });
  expect(onChange).not.toHaveBeenCalled();
  act(() => { jest.advanceTimersByTime(20); });
  expect(sun().props.minutes).toBe(490);
  expect(onChange).not.toHaveBeenCalled();
  // Release before another preview frame; its final position must not be lost.
  act(() => { sun().props.onMinute(495); sun().props.onDragging(false); });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('08:15', '23:00', false);
  act(() => { jest.advanceTimersByTime(50); });
  expect(onChange).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
  jest.useRealTimers();
});

it('does not commit an unchanged tap and cancels pending preview work on unmount', () => {
  jest.useFakeTimers();
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicRhythmTimeLayout start="07:00" end="23:00" nextDay={false} onChange={onChange} endDateControls={null} primaryLabel="Save" onPrimary={jest.fn()} />); });
  const moon = () => tree.root.findAll(node => typeof node.props.onMinute === 'function' && node.props.kind === 'moon')[0];
  act(() => { moon().props.onDragging(true); moon().props.onDragging(false); });
  expect(onChange).not.toHaveBeenCalled();
  act(() => { moon().props.onDragging(true); moon().props.onMinute(1385); });
  act(() => { tree.unmount(); jest.advanceTimersByTime(50); });
  expect(onChange).not.toHaveBeenCalled();
  jest.useRealTimers();
});

it('claims native touches immediately, blocks the outer scroll and flushes the final native drag', () => {
  jest.useFakeTimers();
  const { comicRhythmPoint } = jest.requireActual('./../lib/heroMateMath');
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicRhythmTimeLayout start="07:00" end="23:00" nextDay={false} onChange={onChange} endDateControls={null} primaryLabel="Save" onPrimary={jest.fn()} />); });
  const pan = tree.root.findAll(node => node.props.gesture?.handlers?.onUpdate)[0].props.gesture;
  expect(pan.minDistanceValue).toBe(0);
  expect(pan.blocksExternalGestureValue).toEqual({ kind: 'native-scroll' });
  const from = comicRhythmPoint(420, 320, 164), to = comicRhythmPoint(480, 320, 164);
  const event = { translationX: to.x - from.x, translationY: to.y - from.y };
  act(() => { pan.handlers.onBegin(); });
  act(() => { pan.handlers.onUpdate(event); });
  expect(onChange).not.toHaveBeenCalled();
  act(() => { pan.handlers.onFinalize(event, true); });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('08:00', '23:00', false);
  act(() => { tree.unmount(); });
  jest.useRealTimers();
});
