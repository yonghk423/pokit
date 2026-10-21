import { ComicDayBoard, ComicSceneDetail } from './ComicDayBoard';
import { useDayPlanChromeSettingsStore } from '@entities/day-plan/model/dayPlanChromeSettingsStore';
import { IconSymbol } from '@shared/ui/icon-symbol';
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

it('updates circular routine icons immediately when the hide-icons setting changes', () => {
  const initial = useDayPlanChromeSettingsStore.getState().settings;
  useDayPlanChromeSettingsStore.setState({ settings: { ...initial, hideLayoutIcons: false } });
  const item: CircularRoutineItem = { key: 'note', label: 'Memo', icon: 'note', completed: false };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CircularRoutineTimetable items={[item]} ink="#222" muted="#888" isDark={false} renderDetail={() => null} onComplete={jest.fn()} onFinish={jest.fn()} onAdd={jest.fn()} />); });
  const icons = () => tree.root.findAllByType(IconSymbol).filter(node => node.props.name === item.icon);
  expect(icons()).toHaveLength(1);
  act(() => { useDayPlanChromeSettingsStore.setState({ settings: { ...initial, hideLayoutIcons: true } }); });
  expect(icons()).toHaveLength(0);
  expect(tree.root.findAllByType(ThemedText).some(node => node.props.children === 'Memo')).toBe(true);
  act(() => { useDayPlanChromeSettingsStore.setState({ settings: { ...initial, hideLayoutIcons: false } }); });
  expect(icons()).toHaveLength(1);
  act(() => { tree.unmount(); });
  useDayPlanChromeSettingsStore.setState({ settings: initial });
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
