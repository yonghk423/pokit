import { AccessibilityInfo, LayoutAnimation } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { newComicScene } from '../lib/heroDayStorage';
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string, params?: { title?: string }) => params?.title ? `${key}:${params.title}` : key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
it('opens diaries, filters the library, renames with a nonempty title and offers deletion through the row menu', () => {
  const onOpen = jest.fn(), onRename = jest.fn(), onDelete = jest.fn(), onCreate = jest.fn();
  const diaries = ['First', 'Second'].map((title, index) => ({ id: String(index), title, characterId: 'protagonist-1', scenes: [newComicScene(title)], createdAt: 0, updatedAt: 0 }));
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDiaryLibrary diaries={diaries} activeId="0" onClose={jest.fn()} onCreate={onCreate} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  act(() => { button('comicDiary.open:First').props.onPress(); });
  expect(onOpen).toHaveBeenCalledWith('0');
  act(() => { button('comicDiary.manage:Second').props.onPress(); });
  act(() => { button('comicDiary.rename').props.onPress(); });
  const input = () => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDiary.rename')!;
  act(() => { input().props.onChangeText(' '); });
  expect(button('common.save').props.disabled).toBe(true);
  act(() => { input().props.onChangeText('Changed'); });
  act(() => { button('common.save').props.onPress(); });
  expect(onRename).toHaveBeenCalledWith('1', 'Changed');
  act(() => { button('comicDiary.delete').props.onPress(); });
  expect(onDelete).toHaveBeenCalledWith('1');
  const search = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDiary.search')!;
  act(() => { search.props.onChangeText('Second'); });
  expect(button('comicDiary.open:First')).toBeUndefined();
  expect(button('comicDiary.open:Second')).toBeDefined();
  act(() => { button('comicDiary.create').props.onPress(); });
  expect(onCreate).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

it('offers the comic-page illustration as the create action only for an empty unfiltered library', () => {
  const onCreate = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDiaryLibrary diaries={[]} activeId={null} onClose={jest.fn()} onCreate={onCreate} onOpen={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()} />); });
  const add = () => tree.root.findAllByProps({ testID: 'comic-empty-diary-create' })[0];
  expect(tree.root.findAllByProps({ testID: 'comic-empty-diary-icon' }).length).toBeGreaterThan(0);
  expect(add().props.accessibilityLabel).toBe('comicDiary.create');
  act(() => { add().props.onPress(); });
  expect(onCreate).toHaveBeenCalledTimes(1);
  const search = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDiary.search')!;
  act(() => { search.props.onChangeText('missing'); });
  expect(add()).toBeUndefined();
  act(() => { search.props.onChangeText(''); });
  expect(add()).toBeDefined();
  act(() => { tree.unmount(); });
});

it('shows each diary protagonist name and supports searching by that name', () => {
  const diaries = [
    { id: 'named-one', title: 'Morning', characterId: 'protagonist-1', characterName: '유리', scenes: [newComicScene('운동')], createdAt: 0, updatedAt: 0 },
    { id: 'named-two', title: 'Evening', characterId: 'protagonist-1', characterName: '민지', scenes: [], createdAt: 0, updatedAt: 0 },
  ];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDiaryLibrary diaries={diaries} activeId="named-one" onClose={jest.fn()} onCreate={jest.fn()} onOpen={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  expect(button('comicDiary.open:Morning').props.accessibilityHint).toBe('유리');
  expect(button('comicDiary.open:Evening').props.accessibilityHint).toBe('민지');
  expect(tree.root.findAll(node => node.props.children === '유리').length).toBeGreaterThan(0);
  expect(tree.root.findAll(node => node.props.children === '민지').length).toBeGreaterThan(0);
  const search = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDiary.search')!;
  act(() => search.props.onChangeText('민지'));
  expect(button('comicDiary.open:Morning')).toBeUndefined();
  expect(button('comicDiary.open:Evening')).toBeDefined();
  act(() => tree.unmount());
});

it('collapses dates, navigates months and automatically expands search matches across months', () => {
  const diaries = [
    { id: 'morning', title: '10/13 · Morning', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 13, 7).getTime(), updatedAt: 0 },
    { id: 'evening', title: '10/13 · Evening', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 13, 20).getTime(), updatedAt: 0 },
    { id: 'latest', title: 'Latest', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 14, 7).getTime(), updatedAt: 0 },
    { id: 'previous', title: 'Previous month', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 8, 30, 7).getTime(), updatedAt: 0 },
  ];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDiaryLibrary diaries={diaries} activeId="latest" onClose={jest.fn()} onCreate={jest.fn()} onOpen={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  const group = () => tree.root.findAllByProps({ testID: 'comic-diary-group-2026-10-13' })[0];
  expect(group().props.accessibilityState.expanded).toBe(false);
  expect(button('comicDiary.open:Morning')).toBeUndefined();
  act(() => group().props.onPress());
  expect(button('comicDiary.open:Morning')).toBeDefined();
  expect(button('comicDiary.open:Evening')).toBeDefined();
  act(() => group().props.onPress());
  const search = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDiary.search')!;
  act(() => search.props.onChangeText('Morning'));
  expect(group().props.accessibilityState.expanded).toBe(true);
  expect(button('comicDiary.open:Morning')).toBeDefined();
  act(() => search.props.onChangeText('Previous'));
  expect(button('comicDiary.open:Previous month')).toBeDefined();
  act(() => search.props.onChangeText(''));
  act(() => button('comicCalendar.previous').props.onPress());
  expect(button('comicDiary.open:Previous month')).toBeDefined();
  expect(button('comicDiary.open:Latest')).toBeUndefined();
  act(() => tree.unmount());
});


it.each([false, true])('renders reopened rows at their natural height without waiting for measurement (reduced motion: %s)', async reduceMotion => {
  const motion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduceMotion);
  const animation = jest.spyOn(LayoutAnimation, 'configureNext');
  const diaries = [{ id: 'dated', title: 'Morning', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 29, 7).getTime(), updatedAt: 0 }];
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<ComicDiaryLibrary diaries={diaries} activeId="dated" onClose={jest.fn()} onCreate={jest.fn()} onOpen={jest.fn()} onRename={jest.fn()} onDelete={jest.fn()} />); });
    const group = () => tree.root.findAllByProps({ testID: 'comic-diary-group-2026-10-29' })[0];
    const content = () => tree.root.findAllByProps({ testID: 'comic-diary-accordion-content' })[0];
    const panel = () => tree.root.findAllByProps({ testID: 'comic-diary-accordion-panel' })[0];
    expect(content()).toBeDefined();
    expect(content().props.style.position).toBeUndefined();
    expect(panel().props.style?.height).toBeUndefined();
    for (let cycle = 0; cycle < 3; cycle++) {
      act(() => group().props.onPress());
      expect(panel().props.pointerEvents).toBe('none');
      expect(content()).toBeUndefined();
      act(() => group().props.onPress());
      expect(content()).toBeDefined();
      expect(group().props.accessibilityState.expanded).toBe(true);
      expect(content().findAll(node => node.props.accessibilityLabel === 'comicDiary.open:Morning').length).toBeGreaterThan(0);
    }
    if (reduceMotion) expect(animation).not.toHaveBeenCalled();
    else expect(animation).toHaveBeenCalledTimes(6);
    act(() => tree.unmount());
  } finally { motion.mockRestore(); animation.mockRestore(); }
});

it('selects multiple diaries or an entire date without opening them, and clears selection on cancel', () => {
  const onOpen = jest.fn(), onDeleteMany = jest.fn();
  const diaries = [
    { id: 'one', title: 'First', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 29, 7).getTime(), updatedAt: 0 },
    { id: 'two', title: 'Second', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 29, 9).getTime(), updatedAt: 0 },
    { id: 'keep', title: 'Keep', characterId: 'protagonist-1', scenes: [], createdAt: new Date(2026, 9, 28, 9).getTime(), updatedAt: 0 },
  ];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicDiaryLibrary diaries={diaries} activeId="one" onClose={jest.fn()} onCreate={jest.fn()} onOpen={onOpen} onRename={jest.fn()} onDelete={jest.fn()} onDeleteMany={onDeleteMany} />); });
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  act(() => button('comicDiary.select').props.onPress());
  expect(button('comicDiary.deleteSelected').props.disabled).toBe(true);
  act(() => button('comicDiary.selectItem:First').props.onPress());
  expect(onOpen).not.toHaveBeenCalled();
  const date = () => tree.root.findAllByProps({ testID: 'comic-diary-select-date-2026-10-29' })[0];
  expect(date().props.accessibilityState.checked).toBe('mixed');
  act(() => date().props.onPress());
  expect(date().props.accessibilityState.checked).toBe(true);
  act(() => button('comicDiary.deleteSelected').props.onPress());
  expect(onDeleteMany).toHaveBeenLastCalledWith(['one', 'two']);
  act(() => date().props.onPress());
  expect(button('comicDiary.deleteSelected').props.disabled).toBe(true);
  act(() => button('comicDiary.selectItem:First').props.onPress());
  act(() => button('common.cancel').props.onPress());
  expect(button('comicDiary.open:First')).toBeDefined();
  act(() => button('comicDiary.select').props.onPress());
  expect(button('comicDiary.deleteSelected').props.disabled).toBe(true);
  act(() => tree.unmount());
});
