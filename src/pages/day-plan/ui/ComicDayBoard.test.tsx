import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ComicDayBoard } from './ComicDayBoard';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/completion-radio-button', () => ({ CompletionRadioButton: () => null }));
jest.mock('./ComicSceneImage', () => ({ ComicSceneImage: () => null }));
jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const gesture: Record<string, () => unknown> = {};
    for (const name of ['enabled', 'activeOffsetY', 'failOffsetX', 'onEnd']) gesture[name] = () => gesture;
    return gesture;
  };
  return { GestureDetector: ({ children }: { children: unknown }) => children, Gesture: { Pan: chain } };
});
jest.mock('react-native-reanimated', () => ({ runOnJS: (fn: (...args: unknown[]) => unknown) => fn }));

it('selects multiple cards without opening them, supports select all and clears selection on cancel', () => {
  const onOpen = jest.fn();
  const onRemoveMany = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard items={[{ key: 'one', label: 'First', icon: '' }, { key: 'two', label: 'Second', icon: '' }, { key: 'three', label: 'Third', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onAdd={jest.fn()} onRemoveMany={onRemoveMany} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  act(() => { button('comicDay.toggleDelete').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { button('First').props.onPress(); });
  act(() => { button('Second').props.onPress(); });
  expect(onOpen).not.toHaveBeenCalled();
  expect(onRemoveMany).not.toHaveBeenCalled();
  act(() => { button('comicDay.deleteSelected').props.onPress(); });
  expect(onRemoveMany).toHaveBeenLastCalledWith(['one', 'two']);
  act(() => { button('comicDay.selectAll').props.onPress(); });
  act(() => { button('comicDay.deleteSelected').props.onPress(); });
  expect(onRemoveMany).toHaveBeenLastCalledWith(['one', 'two', 'three']);
  act(() => { button('comicDay.clearSelection').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { button('First').props.onPress(); });
  act(() => { button('common.cancel').props.onPress(); });
  act(() => { button('comicDay.toggleDelete').props.onPress(); });
  expect(button('comicDay.deleteSelected').props.disabled).toBe(true);
  act(() => { tree.unmount(); });
});

it('opens a diary as a card deck and shows the comic grid only from the layout button', () => {
  const onOpen = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={onOpen} onAdd={jest.fn()} />); });
  const byId = (id: string) => tree.root.findAll(node => node.props.testID === id);
  const deck = () => byId('comic-scene-deck');
  expect(deck().length).toBeGreaterThan(0);
  expect(byId('comic-show-cards')).toHaveLength(0);
  act(() => { byId('comic-board-view')[0].props.onPress(); });
  expect(deck()).toHaveLength(0);
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.boardView' && node.props.accessibilityState?.expanded === true)).toHaveLength(0);
  act(() => { byId('comic-board-view')[0].props.onPress(); });
  expect(byId('comic-board-view')[0].props.accessibilityState.expanded).toBe(true);
  act(() => { byId('comic-show-cards')[0].props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});

it('returns to the card deck when delete mode started there is turned off', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDayBoard diaryTitle="Diary" items={[{ key: 'one', label: 'First', icon: '' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} onAdd={jest.fn()} onRemoveMany={jest.fn()} />); });
  const deck = () => tree.root.findAll(node => node.props.testID === 'comic-scene-deck');
  const trash = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.toggleDelete' && typeof node.props.onPress === 'function')[0];
  act(() => { trash().props.onPress(); });
  expect(deck()).toHaveLength(0);
  act(() => { trash().props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { trash().props.onPress(); });
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'common.cancel' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  expect(deck().length).toBeGreaterThan(0);
  act(() => { tree.unmount(); });
});
