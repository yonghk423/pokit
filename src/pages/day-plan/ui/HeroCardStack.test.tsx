import { createRef } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { HeroCardStack, type HeroCardStackHandle } from './HeroCardStack';

const mockCompletions: ((finished: boolean) => void)[] = [];
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: { View }, runOnJS: (fn: unknown) => fn, runOnUI: (fn: unknown) => fn,
    useSharedValue: (initial: unknown) => React.useState(() => { let value = initial; return { get: () => value, set: (next: unknown) => { value = next; } }; })[0],
    useAnimatedStyle: (fn: () => unknown) => fn(), cancelAnimation: jest.fn(),
    Easing: { out: (fn: unknown) => fn, cubic: (value: number) => value },
    withTiming: (to: number, _config: unknown, callback: (finished: boolean) => void) => { mockCompletions.push(callback); return to; },
  };
});
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: unknown }) => children,
  Gesture: { Pan: () => {
    const gesture: Record<string, unknown> = {};
    for (const name of ['enabled', 'activeOffsetX', 'failOffsetY', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) gesture[name] = (value: unknown) => { gesture[name + 'Value'] = value; return gesture; };
    return gesture;
  } },
}));
beforeEach(() => { mockCompletions.length = 0; });
function setup(active = 1, count = 8) {
  let tree!: ReactTestRenderer;
  const ref = createRef<HeroCardStackHandle>();
  const onChange = jest.fn();
  const render = (current: number, enabled = true) => <HeroCardStack ref={ref} active={current} count={count} width={390} height={600} cardWidth={300} cardHeight={350} top={68}
    enabled={enabled} onChange={onChange} renderPage={index => <Text>{index}</Text>} />;
  act(() => { tree = create(render(active)); });
  return { tree, ref, onChange, gesture: () => tree.root.findByType(GestureDetector).props.gesture,
    update: (current: number, enabled = true) => act(() => tree.update(render(current, enabled))) };
}
it('publishes the destination without waiting for animation completion', () => {
  const { tree, gesture, onChange, update } = setup();
  act(() => { gesture().onStartValue({ translationX: 15 }); gesture().onUpdateValue({ translationX: 160 }); gesture().onEndValue({ velocityX: 600 }); });
  expect(onChange).toHaveBeenLastCalledWith(2);
  act(() => mockCompletions.shift()!(true));
  expect(onChange).toHaveBeenLastCalledWith(2);
  update(2);
  act(() => { gesture().onStartValue({ translationX: -15 }); gesture().onUpdateValue({ translationX: -160 }); gesture().onEndValue({ velocityX: -600 }); });
  act(() => mockCompletions.shift()!(true));
  expect(onChange).toHaveBeenLastCalledWith(1);
  act(() => tree.unmount());
});
it('keeps the mounted artwork bounded even for a large diary and supports thumbnail jumps', () => {
  const { tree, ref, onChange, update } = setup(50, 200);
  expect(tree.root.findAllByType(Text)).toHaveLength(6);
  act(() => ref.current!.turnTo(180));
  expect(onChange).toHaveBeenCalledWith(180);
  update(180);
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toContain(180);
  expect(tree.root.findAllByType(Text)).toHaveLength(6);
  act(() => tree.unmount());
});
it('accepts consecutive swipes before animations finish or thumbnails acknowledge the active card', () => {
  const { tree, gesture, onChange } = setup();
  for (let turn = 1; turn <= 4; turn++) {
    act(() => {
      gesture().onStartValue({ translationX: 15 });
      gesture().onUpdateValue({ translationX: 160 });
      gesture().onEndValue({ velocityX: 600 });
    });
    expect(onChange).toHaveBeenLastCalledWith(1 + turn);
  }
  // No completion callbacks and no parent active updates were needed.
  expect(onChange).toHaveBeenCalledTimes(4);
  act(() => tree.unmount());
});
it('deduplicates thumbnail targets and rejects callbacks after disabling the deck', () => {
  const { tree, ref, onChange, update } = setup();
  act(() => { for (let index = 0; index < 30; index++) ref.current!.turnTo(2); });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(mockCompletions).toHaveLength(1);
  const stale = mockCompletions.shift()!;
  update(2, false);
  act(() => stale(true));
  expect(onChange).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
it('wraps in both directions and keeps short drags on the current card', () => {
  const { tree, gesture, onChange, update } = setup(0, 3);
  act(() => { gesture().onStartValue({ translationX: -15 }); gesture().onUpdateValue({ translationX: -160 }); gesture().onEndValue({ velocityX: -600 }); });
  act(() => mockCompletions.shift()!(true));
  expect(onChange).toHaveBeenLastCalledWith(2);
  update(2);
  act(() => { gesture().onStartValue({ translationX: 15 }); gesture().onUpdateValue({ translationX: 160 }); gesture().onEndValue({ velocityX: 600 }); });
  act(() => mockCompletions.shift()!(true));
  expect(onChange).toHaveBeenLastCalledWith(0);
  update(0);
  onChange.mockClear();
  act(() => { gesture().onStartValue({ translationX: -15 }); gesture().onUpdateValue({ translationX: -20 }); gesture().onEndValue({ velocityX: 0 }); });
  act(() => mockCompletions.shift()!(true));
  expect(onChange).not.toHaveBeenCalled();
  act(() => tree.unmount());
});

it('keeps every front live through repeated cycles, with only one focused card', () => {
  const { tree, gesture, onChange, update } = setup(0, 3);
  for (let turn = 1; turn <= 30; turn++) {
    act(() => { gesture().onStartValue({ translationX: 15 }); gesture().onUpdateValue({ translationX: 160 }); gesture().onEndValue({ velocityX: 600 }); });
    act(() => mockCompletions.shift()!(true));
    expect(onChange).toHaveBeenLastCalledWith(turn % 3);
    update(turn % 3);
    const fronts = tree.root.findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('comic-stack-card-') && node.props.pointerEvents === 'auto');
    // The component and host node both expose the wrapper props in this renderer.
    expect(fronts.length).toBeGreaterThan(0);
    expect(new Set(fronts.map(node => node.props.testID)).size).toBe(1);
    expect(tree.root.findAllByType(Text)).toHaveLength(6);
  }
  act(() => tree.unmount());
});
