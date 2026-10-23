import { ComicDayBoard, ComicSceneDetail } from './ComicDayBoard';
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
    Pan: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'minDistance', 'onBegin', 'onStart', 'onUpdate', 'onEnd', 'runOnJS', 'activeOffsetX', 'failOffsetY', 'activeOffsetY', 'failOffsetX']) chain[name] = () => chain;
      return chain;
    },
    Tap: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'maxDistance', 'maxDuration', 'onBegin', 'onEnd']) chain[name] = (value: unknown) => { chain[`${name}Value`] = value; return chain; };
      return chain;
    },
    LongPress: () => {
      const chain: Record<string, unknown> = {};
      for (const name of ['enabled', 'minDuration', 'maxDistance', 'onStart']) chain[name] = (value: unknown) => { chain[`${name}Value`] = value; return chain; };
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

it('shows only the add-card icon in the actual empty card deck and opens the add flow', () => {
  const onAdd = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={[]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={onAdd} />); });
  const deck = tree.root.findAll(node => node.props.testID === 'rhythm-card-stack-layer')[0];
  expect(deck).toBeDefined();
  expect(deck.findAllByType(ThemedText)).toHaveLength(0);
  const empty = tree.root.findByProps({ testID: 'rhythm-card-empty' });
  expect(StyleSheet.flatten(empty.props.style)).toMatchObject({
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center',
  });
  const add = deck.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'dayPlan.addRoutine' && typeof node.props.onPress === 'function')[0];
  expect(add).toBeDefined();
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
  const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const root = () => tree.root.findAllByType(View).find(node => node.props.testID === 'circular-timetable-root')!;
  const layout = (height: number) => act(() => root().props.onLayout({ nativeEvent: { layout: { width: 390, height } } }));
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
});

it('opens the existing detail controls from the card preview and keeps completion separate', () => {
  const item: CircularRoutineItem = { key: 'walk', label: 'Walk', icon: 'figure.walk', completed: false };
  const complete = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={[item]} ink="#222" muted="#888" isDark={false} renderDetail={selected => <ThemedText>{`Detail: ${selected.label}`}</ThemedText>} onComplete={complete} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const open = tree.root.findAll(node => node.props.accessibilityLabel === 'Walk' && node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0];
  act(() => open.props.onPress());
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Detail: Walk')).toBe(true);
  expect(complete).not.toHaveBeenCalled();
  act(() => tree.unmount());
});


it('keeps reference coordinates and expands a tapped overlay card without toggling completion', () => {
  const items: CircularRoutineItem[] = ['Read', 'Walk', 'Write', 'Rest'].map(key => ({ key, label: key, icon: 'note', completed: false }));
  const complete = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={item => <ThemedText>{`Detail: ${item.label}`}</ThemedText>} onComplete={complete} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const card = (key: string) => tree.root.findAllByType(View).find(node => node.props.testID === `rhythm-card-${key}`)!;
  const geometry = (key: string) => StyleSheet.flatten(card(key).props.style);
  expect(geometry('Read').zIndex).toBe(30);
  const initial = geometry('Read');
  expect(initial.left).toBeCloseTo(12);
  expect(initial.width / initial.height).toBeCloseTo(300 / 414);
  expect(initial.top + initial.height).toBeLessThan(600 - 64);
  expect(geometry('Walk').left + initial.width).toBeCloseTo(340 - 12);
  expect(geometry('Write').top).toBeLessThan(initial.top);
  const select = tree.root.findAll(node => node.props.accessibilityLabel === 'Read' && node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0];
  act(() => select.props.onPress());
  expect(geometry('Read').zIndex).toBe(30);
  expect(geometry('Write').zIndex).toBe(20);
  expect(geometry('Read').left).toBe(initial.left);
  expect(geometry('Read').top).toBe(initial.top);
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Detail: Read')).toBe(true);
  expect(complete).not.toHaveBeenCalled();
  expect(card('Rest')).toBeDefined();
  act(() => tree.unmount());
});


it('shows only title and summary until tapped, then restores the same card after closing', () => {
  const item: CircularRoutineItem = { key: 'memo', label: 'Memo', icon: 'note', timeLabel: '07:00', summary: 'My saved summary', completed: false };
  const editTime = jest.fn();
  let tree!: ReactTestRenderer;
  const render = (summary: string) => <CircularRoutineTimetable presentation="cards" items={[{ ...item, summary }]} ink="#222" muted="#888" isDark={false} renderDetail={() => <ThemedText>Editable memo body</ThemedText>} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} onEditTime={editTime} />;
  act(() => { tree = create(render(item.summary!)); });
  const texts = () => tree.root.findAllByType(ThemedText).map(node => node.props.children);
  expect(texts()).toContain('My saved summary');
  // 카드 루틴 시간 UI는 featureFlags.cardRoutineTimeEdit 로 임시 보류
  expect(texts()).not.toContain('07:00');
  expect(texts()).not.toContain('Editable memo body');
  expect(texts()).not.toContain('common.complete');
  const card = () => tree.root.findAllByType(View).find(node => node.props.testID === 'rhythm-card-memo')!;
  const original = StyleSheet.flatten(card().props.style);
  const open = () => tree.root.findAll(node => node.props.accessibilityLabel === 'Memo' && node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function')[0];
  act(() => open().props.onPress());
  expect(texts()).toContain('Editable memo body');
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'todo.timeA11y' && typeof node.props.onPress === 'function')).toHaveLength(0);
  expect(editTime).not.toHaveBeenCalled();
  act(() => tree.update(render('Updated summary')));
  const close = tree.root.findAll(node => node.props.accessibilityLabel === 'common.close' && typeof node.props.onPress === 'function')[0];
  act(() => close.props.onPress());
  expect(texts()).not.toContain('Editable memo body');
  expect(texts()).toContain('Updated summary');
  expect(StyleSheet.flatten(card().props.style).left).toBe(original.left);
  expect(StyleSheet.flatten(card().props.style).top).toBe(original.top);
  act(() => tree.unmount());
});


it('loops past the last card in both directions with at most six mounted cards', () => {
  const items: CircularRoutineItem[] = Array.from({ length: 12 }, (_, index) => ({ key: `item-${index}`, label: `Item ${index}`, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const cards = () => tree.root.findAllByType(View).filter(node => /^rhythm-card-item-/.test(node.props.testID ?? ''));
  const active = () => cards().filter(node => node.props.pointerEvents === 'auto');
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-item-0', 'rhythm-card-item-1', 'rhythm-card-item-2']);
  expect(cards().length).toBeLessThanOrEqual(6);
  const scroll = tree.root.findAll(node => node.props.testID === 'rhythm-card-deck-scroll' && typeof node.props.onScroll === 'function')[0];
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: scroll.props.snapToInterval * 16 } } }));
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-item-4', 'rhythm-card-item-5', 'rhythm-card-item-6']);
  expect(cards().length).toBeLessThanOrEqual(6);
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: scroll.props.snapToInterval * 21 } } }));
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-item-9', 'rhythm-card-item-10', 'rhythm-card-item-11']);
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: scroll.props.snapToInterval * 24 } } }));
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-item-0', 'rhythm-card-item-1', 'rhythm-card-item-2']);
  const beforeRecenter = active()[0];
  act(() => scroll.props.onScroll.handlers.onMomentumEnd({ contentOffset: { y: scroll.props.snapToInterval * 24 } }));
  expect(active()[0]).toBe(beforeRecenter);
  expect(active()[0].props.testID).toBe('rhythm-card-item-0');
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: scroll.props.snapToInterval * 11 } } }));
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-item-11', 'rhythm-card-item-0', 'rhythm-card-item-1']);
  act(() => tree.unmount());
});

it('opens all cards in the overview, edits any item, and returns to the same stack position', () => {
  const items: CircularRoutineItem[] = Array.from({ length: 8 }, (_, index) => ({ key: `entry-${index}`, label: `Entry ${index}`, icon: 'note', timeLabel: '09:00', summary: `Summary ${index}`, completed: false }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={item => <ThemedText>{`Detail ${item.key}`}</ThemedText>} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const press = (testID: string) => tree.root.findAll(node => node.props.testID === testID && typeof node.props.onPress === 'function')[0];
  const scroll = tree.root.findAll(node => node.props.testID === 'rhythm-card-deck-scroll' && typeof node.props.onScroll === 'function')[0];
  act(() => scroll.props.onScroll({ nativeEvent: { contentOffset: { y: scroll.props.snapToInterval * 11 } } }));
  const first = () => tree.root.findAllByType(View).filter(node => /^rhythm-card-entry-/.test(node.props.testID ?? '') && node.props.pointerEvents === 'auto')[0];
  const before = first();
  act(() => press('rhythm-card-overview-toggle').props.onPress());
  expect(press('rhythm-card-overview-toggle').props.accessibilityState.expanded).toBe(true);
  expect(tree.root.findAll(node => /^rhythm-grid-card-entry-/.test(node.props.testID ?? '') && typeof node.props.onPress === 'function')).toHaveLength(8);
  const overviewView = tree.root.findAllByProps({ testID: 'rhythm-card-overview' })[0];
  act(() => press('rhythm-grid-card-entry-7').props.onPress());
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Detail entry-7')).toBe(true);
  const close = tree.root.findAll(node => node.props.accessibilityLabel === 'common.close' && typeof node.props.onPress === 'function')[0];
  act(() => close.props.onPress());
  expect(press('rhythm-card-overview-toggle').props.accessibilityState.expanded).toBe(true);
  act(() => press('rhythm-card-overview-toggle').props.onPress());
  expect(press('rhythm-card-overview-toggle').props.accessibilityState.expanded).toBe(false);
  expect(first()).toBe(before);
  expect(first().props.testID).toBe('rhythm-card-entry-3');
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-overview' })[0]).toBe(overviewView);
  expect(overviewView.props.scrollEnabled).toBe(false);
  act(() => tree.unmount());
});

it('keeps cards visible after a loop and viewport resize even when native scroll emits no event', () => {
  const items: CircularRoutineItem[] = Array.from({ length: 8 }, (_, index) => ({ key: `resize-${index}`, label: `Resize ${index}`, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  const render = (data: CircularRoutineItem[]) => <CircularRoutineTimetable presentation="cards" items={data} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />;
  act(() => { tree = create(render(items)); });
  const scroll = () => tree.root.findAll(node => node.props.testID === 'rhythm-card-deck-scroll' && typeof node.props.onScroll === 'function')[0];
  const swipe = (position: number) => act(() => scroll().props.onScroll({ nativeEvent: { contentOffset: { y: scroll().props.snapToInterval * position } } }));
  const active = () => tree.root.findAllByType(View).filter(node => /^rhythm-card-resize-/.test(node.props.testID ?? '') && node.props.pointerEvents === 'auto');
  swipe(24);
  swipe(12);
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-resize-4', 'rhythm-card-resize-5', 'rhythm-card-resize-6']);
  const root = tree.root.findAllByType(View).find(node => node.props.testID === 'circular-timetable-root')!;
  act(() => root.props.onLayout({ nativeEvent: { layout: { width: 390, height: 710 } } }));
  expect(active().map(node => node.props.testID)).toEqual(['rhythm-card-resize-4', 'rhythm-card-resize-5', 'rhythm-card-resize-6']);
  expect(active().every(node => StyleSheet.flatten(node.props.style).opacity > 0)).toBe(true);
  const scrollTo = jest.requireMock('react-native-reanimated').scrollTo;
  const calls = scrollTo.mock.calls.length;
  act(() => scroll().props.onScroll.handlers.onMomentumEnd({ contentOffset: { y: scroll().props.snapToInterval * 24 } }));
  expect(scrollTo).toHaveBeenCalledTimes(calls);
  act(() => tree.update(render(items.slice(0, 6))));
  expect(active()).toHaveLength(3);
  expect(active().every(node => StyleSheet.flatten(node.props.style).opacity > 0)).toBe(true);
  act(() => tree.unmount());
});

it('mounts a populated card window when data arrives after an empty first render', () => {
  let tree!: ReactTestRenderer;
  const render = (items: CircularRoutineItem[]) => <CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />;
  act(() => { tree = create(render([])); });
  const items = Array.from({ length: 8 }, (_, index) => ({ key: `load-${index}`, label: `Load ${index}`, icon: 'note', completed: false }));
  act(() => tree.update(render(items)));
  const active = tree.root.findAllByType(View).filter(node => /^rhythm-card-load-/.test(node.props.testID ?? '') && node.props.pointerEvents === 'auto');
  expect(active).toHaveLength(3);
  expect(active.every(node => StyleSheet.flatten(node.props.style).opacity > 0)).toBe(true);
  act(() => tree.unmount());
});


it('opens the front card through viewport hit testing and ignores a canceled scroll gesture', () => {
  const items: CircularRoutineItem[] = ['Read', 'Walk', 'Write', 'Rest'].map(key => ({ key, label: key, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={item => <ThemedText>{`Tapped ${item.key}`}</ThemedText>} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const detector = tree.root.findByType(jest.requireMock('react-native-gesture-handler').GestureDetector);
  const front = tree.root.findAllByProps({ testID: 'rhythm-card-Read' })[0];
  const style = StyleSheet.flatten(front.props.style);
  const point = { x: style.left + style.width / 2, y: style.top + style.height - 15 };
  act(() => detector.props.gesture.onEndValue(point, false));
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  act(() => detector.props.gesture.onEndValue(point, true));
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Tapped Read')).toBe(true);
  act(() => tree.unmount());
});


it('keeps the deck mounted and detail present until the closing animation completes', () => {
  const items: CircularRoutineItem[] = ['Read', 'Walk', 'Write', 'Rest'].map(key => ({ key, label: key, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable presentation="cards" items={items} ink="#222" muted="#888" isDark={false} renderDetail={() => <ThemedText>Settings</ThemedText>} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const deck = tree.root.findAllByProps({ testID: 'rhythm-card-deck-scroll' })[0];
  const open = tree.root.findAll(node => node.props.accessibilityLabel === 'Read' && typeof node.props.onPress === 'function')[0];
  act(() => open.props.onPress());
  const panel = tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })[0];
  act(() => panel.props.onLayout());
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-deck-scroll' })[0]).toBe(deck);
  expect(deck.props.scrollEnabled).toBe(true);
  expect(tree.root.findByProps({ testID: 'rhythm-card-background' }).props.pointerEvents).toBe('none');
  let finish!: (finished: boolean) => void;
  jest.requireMock('react-native-reanimated').withTiming.mockImplementationOnce((value: number, _config: unknown, done: (finished: boolean) => void) => { finish = done; return value; });
  const close = tree.root.findAll(node => node.props.accessibilityLabel === 'common.close' && typeof node.props.onPress === 'function')[0];
  act(() => close.props.onPress());
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })[0]).toBe(panel);
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-deck-scroll' })[0]).toBe(deck);
  act(() => finish(true));
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  expect(tree.root.findByProps({ testID: 'rhythm-card-background' }).props.pointerEvents).toBe('auto');
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-deck-scroll' })[0]).toBe(deck);
  act(() => tree.unmount());
});
