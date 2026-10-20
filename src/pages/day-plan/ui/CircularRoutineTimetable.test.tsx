import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
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
  Gesture: { Pan: () => {
    const chain: Record<string, unknown> = {};
    for (const name of ['enabled', 'minDistance', 'onStart', 'onUpdate', 'onEnd', 'runOnJS', 'activeOffsetX', 'failOffsetY']) chain[name] = () => chain;
    return chain;
  } },
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View },
  useSharedValue: (value: number) => ({ value, set: jest.fn() }),
  useAnimatedStyle: (fn: () => unknown) => fn(),
  cancelAnimation: jest.fn(), withDecay: jest.fn(), withTiming: (value: number) => value,
  Easing: { bezier: jest.fn(), cubic: jest.fn(), out: jest.fn() },
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
  act(() => { tree.root.findAllByType(Path).find(node => node.props.accessibilityLabel === 'Memo')!.props.onPress(); });
  const button = tree.root.findAll(node => node.props.accessibilityLabel === 'dayPlan.endTodayA11y' && typeof node.props.onPress === 'function')[0];
  act(() => { button.props.onPress(); });
  expect(onFinish).toHaveBeenCalledWith('note', 'Memo');
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
});
