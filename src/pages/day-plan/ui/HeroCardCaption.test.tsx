import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Keyboard, Modal } from 'react-native';
import { HeroCardCaption } from './HeroCardCaption';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/lib/ui-font', () => ({ ...jest.requireActual('@shared/lib/ui-font/diaryTypography'), useAppFontSizeScale: () => 1, scaleTypeSize: (size: number) => size }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));

it('edits title and memo together, validates the title, and saves only on explicit save', () => {
  const onSave = jest.fn();
  const onOpen = jest.fn();
  const onEditingChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardCaption title="운동하기" memo="기존 요약" number={1} ink="#222" muted="#777" onSave={onSave} onOpen={onOpen} onEditingChange={onEditingChange} />); });
  const button = (id: string) => tree.root.findAll(node => node.props.testID === id && typeof node.props.onPress === 'function')[0];
  const input = (label: string) => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === label)!;
  const action = (label: string) => tree.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label).at(-1)!;
  act(() => button('hero-card-edit').props.onPress());
  expect(onOpen).not.toHaveBeenCalled();
  expect(onEditingChange).toHaveBeenLastCalledWith(true);
  expect(input('comicDay.memo').props.value).toBe('기존 요약');
  act(() => input('comicDay.sceneTitle').props.onChangeText('   '));
  expect(action('common.save').props.disabled).toBe(true);
  act(() => input('comicDay.sceneTitle').props.onChangeText('  아침 운동  '));
  act(() => input('comicDay.memo').props.onChangeText('  몸을 가볍게 풀었다.  '));
  expect(onSave).not.toHaveBeenCalled();
  act(() => action('common.save').props.onPress());
  expect(onSave).toHaveBeenCalledWith({ title: '아침 운동', memo: '몸을 가볍게 풀었다.' });
  expect(onEditingChange).toHaveBeenLastCalledWith(false);
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  act(() => tree.unmount());
});

it('cancels drafts without changing saved text and permits clearing a memo', () => {
  const onSave = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardCaption title="운동하기" memo="기존 요약" number={1} ink="#222" muted="#777" onSave={onSave} />); });
  const edit = () => tree.root.findAll(node => node.props.testID === 'hero-card-edit' && typeof node.props.onPress === 'function')[0];
  const input = () => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.memo')!;
  const action = (label: string) => tree.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label).at(-1)!;
  act(() => edit().props.onPress());
  act(() => input().props.onChangeText('discard this'));
  act(() => action('common.cancel').props.onPress());
  expect(onSave).not.toHaveBeenCalled();
  act(() => edit().props.onPress());
  expect(input().props.value).toBe('기존 요약');
  act(() => input().props.onChangeText(''));
  act(() => action('common.save').props.onPress());
  expect(onSave).toHaveBeenCalledWith({ title: '운동하기', memo: '' });
  act(() => tree.unmount());
});


it('keeps the draft when dismissing the keyboard and focuses the summary from the title', () => {
  const onSave = jest.fn();
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardCaption title="운동하기" number={1} ink="#222" muted="#777" onSave={onSave} />); });
  act(() => tree.root.findAll(node => node.props.testID === 'hero-card-edit' && typeof node.props.onPress === 'function')[0].props.onPress());
  const input = (label: string) => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === label)!;
  const titleFocus = jest.spyOn(input('comicDay.sceneTitle').props.ref.current, 'focus');
  const memoFocus = jest.spyOn(input('comicDay.memo').props.ref.current, 'focus');
  act(() => tree.root.findByType(Modal).props.onShow());
  expect(titleFocus).toHaveBeenCalledTimes(1);
  memoFocus.mockClear();
  act(() => input('comicDay.sceneTitle').props.onSubmitEditing());
  expect(memoFocus).toHaveBeenCalledTimes(1);
  act(() => input('comicDay.memo').props.onChangeText('작성 중인 요약'));
  act(() => tree.root.findAll(node => node.props.testID === 'hero-card-dismiss-keyboard' && typeof node.props.onPress === 'function')[0].props.onPress());
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(onSave).not.toHaveBeenCalled();
  expect(input('comicDay.memo').props.value).toBe('작성 중인 요약');
  act(() => tree.root.findByType(Modal).props.onRequestClose());
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  expect(onSave).not.toHaveBeenCalled();
  act(() => tree.unmount());
  dismiss.mockRestore();
});

it('shows a live date and time only while both title and memo are empty', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 31, 13, 40, 59));
  let tree!: ReactTestRenderer;
  const render = (title = '', memo = '') => <HeroCardCaption title={title} memo={memo} number={1} ink="#222" muted="#777" />;
  act(() => { tree = create(render()); });
  const timestamp = () => tree.root.findAllByProps({ testID: 'hero-empty-card-timestamp' });
  expect(timestamp()[0].props.children.join('')).toBe('Oct 31 · 13:40');
  act(() => jest.advanceTimersByTime(1000));
  expect(timestamp()[0].props.children.join('')).toBe('Oct 31 · 13:41');
  act(() => tree.update(render('Title')));
  expect(timestamp()).toHaveLength(0);
  act(() => tree.update(render('', 'Memo only')));
  expect(timestamp()).toHaveLength(0);
  act(() => tree.update(render('  ', '  ')));
  expect(timestamp().length).toBeGreaterThan(0);
  act(() => tree.unmount());
  jest.useRealTimers();
});

it('fills the remaining caption height with as many memo lines as fit', () => {
 let tree!: ReactTestRenderer;
 act(()=>{tree=create(<HeroCardCaption title="My day" memo="A long diary entry that should fill all available space." number={1} ink="#222" muted="#777"/>);});
 const memo=()=>tree.root.findAllByProps({testID:'hero-card-memo'})[0];
 const space=()=>tree.root.findAllByProps({testID:'hero-card-memo-space'})[0];
 act(()=>space().props.onLayout({nativeEvent:{layout:{height:90}}}));
 expect(memo().props.numberOfLines).toBe(5);
 act(()=>memo().props.onTextLayout({nativeEvent:{lines:[{height:24}]}}));
 expect(memo().props.numberOfLines).toBe(3);
 act(()=>space().props.onLayout({nativeEvent:{layout:{height:144}}}));
 expect(memo().props.numberOfLines).toBe(6);
 act(()=>tree.unmount());
});

it('opens the same editor from the empty-day prompt as from the pencil', () => {
  const onSave = jest.fn();
  const onOpen = jest.fn();
  const onEditingChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardCaption title="" number={1} ink="#222" muted="#777" onSave={onSave} onOpen={onOpen} onEditingChange={onEditingChange} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-card-empty-write' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-card-editor' }).length).toBeGreaterThan(0);
  expect(onEditingChange).toHaveBeenLastCalledWith(true);
  expect(onOpen).not.toHaveBeenCalled();
  expect(onSave).not.toHaveBeenCalled();
  expect(tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.sceneTitle')!.props.value).toBe('');
  act(() => tree.unmount());
});

it('keeps color controls removed while previewing and saving font changes', async () => {
  const onSave = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCardCaption title="My day" memo="Memo" number={1} paper="#F5E8CF" fontId="hiMelody" ink="#202020" muted="#777777" onSave={onSave} />); });
  const press = (id: string) => tree.root.findAll(node => node.props.testID === id && typeof node.props.onPress === 'function')[0].props.onPress();
  const action = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function').at(-1)!;
  const title = () => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.sceneTitle')!;
  await act(async () => press('hero-card-edit'));
  expect(tree.root.findAllByProps({ testID: 'hero-card-paper-trigger' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-card-pen-trigger' })).toHaveLength(0);
  await act(async () => press('hero-card-font-trigger'));
  await act(async () => press('hero-card-font-cafe24ShiningStar'));
  expect(title().props.fontId).toBe('cafe24ShiningStar');
  expect(tree.root.findAllByProps({ testID: 'hero-card-font-underline-cafe24ShiningStar' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-card-font-underline-hiMelody' })).toHaveLength(0);
  expect(onSave).not.toHaveBeenCalled();
  await act(async () => action('common.cancel').props.onPress());
  await act(async () => press('hero-card-edit'));
  expect(title().props.fontId).toBe('hiMelody');
  await act(async () => press('hero-card-font-trigger'));
  await act(async () => press('hero-card-font-cafe24ShiningStar'));
  await act(async () => action('common.save').props.onPress());
  expect(onSave).toHaveBeenLastCalledWith({ title: 'My day', memo: 'Memo', fontId: 'cafe24ShiningStar' });
  await act(async () => press('hero-card-edit'));
  expect(tree.root.findAllByProps({ testID: 'hero-card-paper-trigger' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-card-pen-trigger' })).toHaveLength(0);
  await act(async () => press('hero-card-font-trigger'));
  await act(async () => press('hero-card-font-default'));
  await act(async () => action('common.save').props.onPress());
  expect(onSave).toHaveBeenLastCalledWith({ title: 'My day', memo: 'Memo', fontId: undefined });
  await act(async () => tree.unmount());
});

it('opens writing from the whole non-photo area without showing card action icons', async () => {
  const onSave = jest.fn(), onOpen = jest.fn(); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCardCaption tapToEdit title="오늘" memo="기록" number={1} ink="#222" muted="#777" onSave={onSave} onOpen={onOpen} />); });
  try {
    expect(tree.root.findAllByProps({ testID: 'hero-card-edit' })).toHaveLength(0);
    act(() => tree.root.findAllByProps({ testID: 'hero-card-caption-write' })[0].props.onPress());
    expect(tree.root.findAllByProps({ testID: 'hero-card-editor' }).length).toBeGreaterThan(0);
    expect(onOpen).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  } finally { act(() => tree.unmount()); }
});

it('keeps the front caption free of body text while retaining the story for editing', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCardCaption tapToEdit showMemo={false} title="오늘" memo="뒷면에만 남길 이야기" number={1} ink="#222" muted="#777" onSave={jest.fn()} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-card-memo' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'hero-card-caption-write' })[0].props.onPress());
  expect(tree.root.findAll(node => node.props.value === '뒷면에만 남길 이야기').length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
