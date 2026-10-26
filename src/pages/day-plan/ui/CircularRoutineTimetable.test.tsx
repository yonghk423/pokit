import { ComicDayBoard, ComicSceneDetail } from './HeroDayBoard';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Path } from 'react-native-svg';
import { CircularRoutineTimetable, type CircularRoutineItem } from './CircularRoutineTimetable';
import { ThemedText } from '@shared/ui/themed-text';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
  Gesture: {
    Native: () => ({}),
    Pan: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'minDistance', 'onBegin', 'onStart', 'onUpdate', 'onEnd', 'runOnJS', 'activeOffsetX', 'failOffsetY', 'activeOffsetY', 'failOffsetX', 'activateAfterLongPress']) chain[name] = (value: unknown) => { chain[`${name}Value`] = value; return chain; };
      return chain;
    },
    Tap: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'maxDistance', 'maxDuration', 'onBegin', 'onEnd']) chain[name] = (value: unknown) => { chain[`${name}Value`] = value; return chain; };
      return chain;
    },
    LongPress: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'minDuration', 'maxDistance', 'onBegin', 'onStart', 'onEnd', 'runOnJS']) chain[name] = (value: unknown) => { chain[`${name}Value`] = value; return chain; };
      return chain;
    },
    Race: (...gestures: unknown[]) => ({ gestures }),
    Simultaneous: (...gestures: unknown[]) => ({ gestures }),
    Exclusive: (...gestures: unknown[]) => ({ gestures }),
  },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View, ScrollView: jest.requireActual('react-native').ScrollView },
  useSharedValue: (value: number) => {
    const ref = jest.requireActual('react').useRef(null);
    if (!ref.current) ref.current = { value, get() { return this.value; }, set(next: number) { this.value = next; } };
    return ref.current;
  },
  useAnimatedRef: () => jest.requireActual('react').useRef(null),
  scrollTo: jest.fn(),
  useAnimatedScrollHandler: (handler: Record<string, (event: unknown) => void>) => {
    const callback = (event: { nativeEvent: unknown }) => handler.onScroll(event.nativeEvent);
    callback.handlers = handler;
    return callback;
  },
  useAnimatedStyle: (fn: () => unknown) => fn(),
  cancelAnimation: jest.fn(),
  withDecay: jest.fn(),
  withTiming: jest.fn((value: number, _config?: unknown, done?: (finished: boolean) => void) => { done?.(true); return value; }),
  withDelay: (_ms: number, value: unknown) => value,
  withRepeat: (value: unknown) => value,
  withSequence: (...values: unknown[]) => values[0],
  runOnJS: (fn: unknown) => fn,
  Easing: {
    bezier: jest.fn(),
    cubic: jest.fn(),
    out: (fn: unknown) => fn,
    inOut: (fn: unknown) => fn,
    quad: jest.fn(),
    sin: jest.fn(),
    in: (fn: unknown) => fn,
  },
}));

it('reflects changed paper and ink colors without coloring completed sectors automatically', () => {
  const base: CircularRoutineItem = { key: 'note', label: 'Memo', icon: 'note', completed: false };
  const render = (item: CircularRoutineItem) => <CircularRoutineTimetable items={[item]} ink="#222222" muted="#888888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render(base)); });
  const sector = () => tree.root.findAllByType(Path).find(node => node.props.accessibilityLabel === 'Memo')!;
  expect(sector().props.fill).toBe('transparent');
  act(() => { tree.update(render({ ...base, faceColor: '#EFC85A', inkColor: '#751C48' })); });
  expect(sector().props.fill).toBe('#EFC85A');
  const title = tree.root.findAllByType(ThemedText).find(node => node.props.children === 'Memo')!;
  expect(StyleSheet.flatten(title.props.style).color).toBe('#751C48');
  act(() => { tree.update(render({ ...base, completed: true })); });
  expect(sector().props.fill).toBe('transparent');
  act(() => { tree.unmount(); });
});

it('ends the selected routine from its detail footer without toggling completion', () => {
  const onComplete = jest.fn();
  const onFinish = jest.fn();
  const item: CircularRoutineItem = { key: 'note', label: 'Memo', icon: 'note', completed: false };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[item]} ink="#222222" muted="#888888" isDark={false} renderDetail={() => null} onComplete={onComplete} onFinish={onFinish} onAdd={jest.fn()} />); });
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'Memo' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  const button = tree.root.findAll(node => node.props.accessibilityLabel === 'dayPlan.endTodayA11y' && typeof node.props.onPress === 'function')[0];
  act(() => { button.props.onPress(); });
  expect(onFinish).toHaveBeenCalledWith('note', 'Memo');
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

it('opens time editing for an unscheduled routine and keeps scheduled time editable', () => {
  const onEditTime = jest.fn();
  const onComplete = jest.fn();
  const item: CircularRoutineItem = { key: 'note', label: 'Memo', icon: 'note', completed: false };
  const render = (timeLabel?: string) => <CircularRoutineTimetable items={[{ ...item, timeLabel }]} ink="#222222" muted="#888888" isDark={false} renderDetail={() => null} onComplete={onComplete} onFinish={jest.fn()} onAdd={jest.fn()} onEditTime={onEditTime} />;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render()); });
  const pressTime = (label: string) => act(() => {
    tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0].props.onPress();
  });
  pressTime('dayPlan.timeUnsetA11y');
  expect(onEditTime).toHaveBeenCalledWith('note', 'Memo');
  act(() => { tree.update(render('AM 7:00')); });
  pressTime('todo.timeA11y');
  expect(onEditTime).toHaveBeenCalledTimes(2);
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});

it('opens comic scenes with existing details and keeps add, time and completion actions connected', () => {
  const onComplete = jest.fn();
  const onAdd = jest.fn();
  const onEditTime = jest.fn();
  const item: CircularRoutineItem = { key: 'read', label: 'Reading', icon: 'book', completed: false };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="comic" items={[item]} ink="#222" muted="#888" isDark={false} renderDetail={() => <ThemedText>Existing details</ThemedText>} onComplete={onComplete} onFinish={jest.fn()} onAdd={onAdd} onEditTime={onEditTime} />); });
  expect(tree.root.findAllByType(Path).filter(node => node.props.accessibilityLabel === item.label)).toHaveLength(0);
  const board = tree.root.findByType(ComicDayBoard);
  act(() => {
    board.props.onAdd();
    board.props.onEditTime(item.key, item.label);
    board.props.onComplete(item.key);
    board.props.onOpen(item.key);
  });
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onEditTime).toHaveBeenCalledWith('read', 'Reading');
  expect(onComplete).toHaveBeenCalledWith('read');
  expect(tree.root.findByType(ComicSceneDetail).props.item).toEqual(item);
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Existing details')).toBe(true);
  act(() => { tree.root.findByType(ComicSceneDetail).props.onChoose('walk'); });
  expect(tree.root.findByType(ComicDayBoard).props.choices.read).toBe('walk');
  act(() => { tree.unmount(); });
});

it('adds a routine from the icon-only wheel action while retaining an accessible label', () => {
  const onAdd = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[]} ink="#222222" muted="#888888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={onAdd} />); });
  const button = tree.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'dayPlan.addMoreRoutine' && typeof node.props.onPress === 'function')[0];
  expect(button).toBeDefined();
  expect(tree.root.findAllByType(ThemedText).filter(node => node.props.children === 'dayPlan.addMoreRoutine')).toHaveLength(0);
  act(() => { button.props.onPress(); });
  expect(onAdd).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

it('shows the first-rhythm state on an empty wheel and preserves the add action', () => {
  const onAdd = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={onAdd} />); });
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'dayPlan.rhythmEmptyTitle')).toBe(true);
  const add = tree.root.findAll(node => node.props.accessibilityLabel === 'dayPlan.addMoreRoutine' && typeof node.props.onPress === 'function')[0];
  act(() => { add.props.onPress(); });
  expect(onAdd).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

it('shows the ended-rhythm state and lets the user review preserved items', () => {
  const item: CircularRoutineItem = { key: 'note', label: 'Memo', icon: 'note', completed: false };
  const onFinish = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable timeEnded items={[item]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={onFinish} onAdd={jest.fn()} />); });
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'dayPlan.rhythmEndedTitle')).toBe(true);
  expect(tree.root.findAllByType(Path).some(node => node.props.accessibilityLabel === 'Memo')).toBe(false);
  const review = tree.root.findAll(node => node.props.accessibilityLabel === 'dayPlan.rhythmReview' && typeof node.props.onPress === 'function')[0];
  act(() => { review.props.onPress(); });
  expect(tree.root.findAllByType(Path).some(node => node.props.accessibilityLabel === 'Memo')).toBe(true);
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'dayPlan.rhythmEndedTitle')).toBe(false);
  expect(onFinish).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});


it('keeps wheel geometry stable while the keyboard resizes the detail screen', () => {
  jest.useFakeTimers();
  const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const root = () => tree.root.findAllByType(View).find(node => node.props.testID === 'circular-timetable-root')!;
  const layout = (height: number) => { act(() => root().props.onLayout({ nativeEvent: { layout: { width: 390, height } } })); act(() => { jest.advanceTimersByTime(40); }); };
  const geometry = () => tree.root.findAllByType(View).map(node => StyleSheet.flatten(node.props.style)).find(style => style?.left < 0 && style?.width > 390);
  layout(700);
  const before = geometry();
  visible.mockReturnValue(true);
  layout(380);
  expect(geometry()).toEqual(before);
  visible.mockReturnValue(false);
  layout(700);
  expect(geometry()).toEqual(before);
  layout(800);
  expect(geometry().top).not.toBe(before.top);
  act(() => tree.unmount());
  visible.mockRestore();
  jest.clearAllTimers(); jest.useRealTimers();
});

