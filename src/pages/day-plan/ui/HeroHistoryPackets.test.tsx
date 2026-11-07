jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppAlert } from '@shared/lib/app-alert';
import { HeroHistoryPackets } from './HeroHistoryPackets';
jest.mock('./HeroDayBoard', () => ({ ComicDayBoard: 'SceneDeck' }));
jest.mock('./HeroHistorySceneDetail', () => ({ HeroHistorySceneDetail: () => <>{require('react').createElement(require('react-native').View, { testID: 'history-scene-detail' })}</> }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
it('keeps a day intact until deletion is confirmed and deletes only its records', () => {
  const alert = jest.spyOn(AppAlert, 'alert').mockImplementation(() => {});
  const remove = jest.fn();
  const diaries = ['one', 'two'].map(id => ({ id, title: id, characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 10, 6, 12).getTime(), updatedAt: 0 }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroHistoryPackets diaries={diaries} onCreate={jest.fn()} onDeleteMany={remove} onUpdateScene={jest.fn()} />); });
  try {
    act(() => tree.root.findAllByProps({ testID: 'history-selection-toggle' })[0].props.onPress());
    act(() => tree.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('NOV 06, 2026,') && typeof node.props.onPress === 'function')[0].props.onPress());
    act(() => tree.root.findAllByProps({ testID: 'history-delete-selected' })[0].props.onPress());
    expect(remove).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2]!;
    act(() => buttons.find(b => b.style === 'cancel')?.onPress?.());
    expect(remove).not.toHaveBeenCalled();
    act(() => buttons.find(b => b.style === 'destructive')?.onPress?.());
    expect(remove).toHaveBeenCalledWith(['one', 'two']);
  } finally { act(() => tree.unmount()); alert.mockRestore(); }
});

it('opens scene detail inside history and keeps its card browser mounted', () => {
  const { newComicScene } = require('../lib/heroDayStorage');
  const scene = { ...newComicScene(''), title: '기록', memo: '메모', image: '01-wakeup' };
  const diary = { id: 'past', title: '지난 기록', characterId: 'protagonist-1', scenes: [scene], createdAt: new Date(2026, 10, 6, 12).getTime(), updatedAt: 0 };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroHistoryPackets diaries={[diary]} onCreate={jest.fn()} onDeleteMany={jest.fn()} onUpdateScene={jest.fn()} />); });
  try {
    act(() => tree.root.findAll(node => typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('NOV 06, 2026,') && typeof node.props.onPress === 'function')[0].props.onPress());
    const deck = tree.root.findByType('SceneDeck' as never);
    expect(deck.props.syncMainState).toBe(false);
    expect(deck.props.presentationOverride).toBeUndefined();
    act(() => deck.props.onOpen(`past:${scene.id}`));
    expect(tree.root.findAllByProps({ testID: 'history-scene-detail' }).length).toBeGreaterThan(0);
    expect(tree.root.findByType('SceneDeck' as never)).toBeTruthy();
  } finally { act(() => tree.unmount()); }
});

it('combines different protagonists into one photo list for the date', () => {
  const { newComicScene } = require('../lib/heroDayStorage');
  const createdAt = new Date(2026, 10, 10, 12).getTime();
  const diaries = ['protagonist-1', 'protagonist-2', 'protagonist-3'].map((characterId, index) => ({ id: `diary-${index}`, title: `Record ${index}`, characterId, scenes: [{ ...newComicScene(`Photo ${index}`), image: '01-wakeup' }], createdAt, updatedAt: createdAt }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroHistoryPackets diaries={diaries} onCreate={jest.fn()} onDeleteMany={jest.fn()} onUpdateScene={jest.fn()} />); });
  try {
    act(() => tree.root.findAll(node => node.props.accessibilityLabel === 'NOV 10, 2026, 3 entries' && typeof node.props.onPress === 'function')[0].props.onPress());
    const deck = tree.root.findByType('SceneDeck' as never);
    expect(deck.props.items).toHaveLength(3);
    expect(deck.props.overviewOpen).toBe(true);
    expect(deck.props.items.map((item: { key: string }) => item.key)).toEqual(diaries.map(diary => `${diary.id}:${diary.scenes[0].id}`));
    expect(tree.root.findAllByProps({ accessibilityLabel: 'Record 1' })).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});
