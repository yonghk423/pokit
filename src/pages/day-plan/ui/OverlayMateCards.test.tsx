import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { OverlayRhythmCards } from './OverlayMateCards';
import { AppAlert } from '@shared/lib/app-alert';

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
  useAnimatedReaction: () => undefined,
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


jest.mock('../lib/captureMateCardFront', () => ({ captureMateCardFront: jest.fn(async () => null) }));
jest.mock('./HeroCardFlip', () => {
  const React = jest.requireActual('react');
  const { View, Pressable } = jest.requireActual('react-native');
  return { HeroCardFlip: React.forwardRef(function Flip({ children, onClosed }: { children: unknown; onClosed: () => void }, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ close: onClosed }));
    return <View><Pressable testID="test-close-flip" onPress={onClosed} />{children}</View>;
  }) };
});

it('opens details and can reopen them when the native front snapshot is unavailable', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(<OverlayRhythmCards items={[{ key: 'vitamins', label: 'Vitamins', icon: 'pills.fill', completed: false }]} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onAdd={jest.fn()} />);
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const card = tree.root.findAll(node => node.props.testID === 'mate-overview-vitamins' && typeof node.props.onPress === 'function')[0];
    await act(async () => { card.props.onPress(); });
    expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' }).length).toBeGreaterThan(0);
    await act(async () => { tree.root.findAllByProps({ testID: 'test-close-flip' })[0].props.onPress(); });
    expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  }
  act(() => tree.unmount());
});

it('offers the add action even with an empty shelf', async () => {
  const add = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<OverlayRhythmCards items={[]} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onAdd={add} />); });
  act(() => tree.root.findAll(node => node.props.testID === 'mate-shelf-add' && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(add).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('keeps the grid and source card fixed when the editor changes viewport size', async () => {
  const item = { key: 'weight', label: '체중 관리', icon: 'figure.stand', completed: false };
  const render = (height: number) => <OverlayRhythmCards items={[item]} width={390} height={height} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onAdd={jest.fn()} />;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(render(700)); });
  const book = () => tree.root.findAll(node => node.props.testID === 'mate-overview-weight' && typeof node.props.onPress === 'function')[0];
  const beforeStyle = book().props.style;
  await act(async () => { book().props.onPress(); });
  await act(async () => { tree.update(render(420)); });
  expect(book().props.style).toEqual(beforeStyle);
  act(() => tree.unmount());
});

it('confirms bulk deletion of selected cards and preserves the grid after canceling', async () => {
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => {});
  const remove = jest.fn();
  const items = ['a', 'b', 'c'].map(key => ({ key, label: key, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<OverlayRhythmCards items={items} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onRemoveMany={remove} onAdd={jest.fn()} />); });
  const press = (id: string) => tree.root.findAll(node => node.props.testID === id && typeof node.props.onPress === 'function')[0];
  const frame = () => tree.root.findAll(node => node.props.testID === 'mate-overview-a' && typeof node.props.onPress === 'function')[0].props.style;
  const before = frame();
  act(() => { press('rhythm-card-tools-fab').props.onPress(); });
  act(() => { press('rhythm-card-delete-mode').props.onPress(); });
  act(() => { press('mate-overview-a').props.onPress(); press('mate-overview-b').props.onPress(); });
  expect(press('mate-overview-a').props.accessibilityState.checked).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  expect(frame()).toEqual(before);
  act(() => tree.root.findAll(node => node.props.accessibilityLabel === 'common.cancel' && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(frame()).toEqual(before);
  expect(press('mate-overview-a').props.accessibilityRole).toBe('button');
  act(() => { press('rhythm-card-tools-fab').props.onPress(); });
  act(() => { press('rhythm-card-delete-mode').props.onPress(); });
  act(() => { press('mate-overview-b').props.onPress(); press('mate-overview-c').props.onPress(); });
  act(() => { press('rhythm-cards-delete-selected').props.onPress(); });
  expect(remove).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2] as { style?: string; onPress?: () => void }[];
  act(() => buttons.find(button => button.style === 'destructive')!.onPress!());
  expect(remove).toHaveBeenCalledWith(['b', 'c']);
  act(() => tree.unmount());
  alert.mockRestore();
});

it('ignores another card while the first card is opening', async () => {
  const items = ['a', 'b'].map(key => ({ key, label: key, icon: 'note', completed: false }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<OverlayRhythmCards items={items} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={item => <>{`record-${item.key}`}</>} onComplete={jest.fn()} onAdd={jest.fn()} />); });
  const press = (key: string) => tree.root.findAll(node => node.props.testID === `mate-overview-${key}` && typeof node.props.onPress === 'function')[0];
  await act(async () => { press('a').props.onPress(); press('b').props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('record-a');
  expect(JSON.stringify(tree.toJSON())).not.toContain('record-b');
  act(() => tree.unmount());
});

it('opens an item from the restored overview and returns to that list', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<OverlayRhythmCards items={[{ key: 'book', label: 'Reading', icon: 'book.fill', completed: false }]} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onAdd={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'mate-overview' }).length).toBeGreaterThan(0);
  await act(async () => { tree.root.findAllByProps({ testID: 'mate-overview-book' })[0].props.onPress(); });
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: 'test-close-flip' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'mate-overview' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('opens the tutorial mate after skipping step 14, then closes it before completing step 15', async () => {
  const { useServiceTutorial, initialServiceProgress } = require('../../welcome-intro/model/serviceTutorial');
  const { ServiceTutorialCoach } = require('../../welcome-intro/ui/ServiceTutorialCoach');
  useServiceTutorial.setState({ ...initialServiceProgress, active: true, mode: 'rhythm', step: 'rhythmOpen', routineKey: 'tutorial-mate' });
  const item = { key: 'tutorial-mate::instance:today', label: 'My mate', icon: 'note', completed: false };
  const render = (items: typeof item[]) => <OverlayRhythmCards items={items} width={390} height={700} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onAdd={jest.fn()} />;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(render([])); });
  act(() => { useServiceTutorial.getState().skipStep(); });
  expect(useServiceTutorial.getState().step).toBe('rhythmRecord');
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  // The new mate may appear after the step changes, when creation finishes.
  await act(async () => { tree.update(render([item])); });
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' }).length).toBeGreaterThan(0);
  const coach = tree.root.findAllByType(ServiceTutorialCoach).find(node => node.props.onSkip);
  expect(coach).toBeDefined();
  act(() => { coach!.props.onSkip(); });
  expect(tree.root.findAllByProps({ testID: 'rhythm-card-detail-panel' })).toHaveLength(0);
  expect(useServiceTutorial.getState().step).toBe('rhythmSuccess');
  act(() => { tree.unmount(); useServiceTutorial.setState({ ...initialServiceProgress }); });
});
