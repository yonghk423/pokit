import { HeroInlineComposer } from './HeroInlineComposer';
import { HeroRandomDraftCard } from './HeroRandomDraftCard';
import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { COMIC_DIARY_HOME_DATE_KEY, COMIC_DIARY_HOME_SELECTION_KEY } from '../lib/heroDiaryHome';
import { Animated, Modal } from 'react-native';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary as DiaryState } from '../lib/heroDiaryStorage';
import { clearComicNavigation, saveComicNavigation } from '../lib/heroNavigation';
import { HeroCharacterList } from './HeroCharacterList';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { ComicScenePicker } from './HeroScenePicker';
import { createRef } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { IndependentComicPlanner, type ComicDiaryHandle } from './IndependentHeroPlanner';
import { ComicDayBoard } from './HeroDayBoard';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { newComicScene, saveComicDay } from '../lib/heroDayStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { initialServiceProgress, resetServiceTutorialSession, useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
jest.mock('@shared/ui/native-hhmm-wheel-picker', () => ({ NativeHhmmWheelPicker: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').Modal }));
jest.mock('@shared/ui/completion-radio-button', () => ({ CompletionRadioButton: jest.requireActual('react-native').Pressable }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const gesture: Record<string, unknown> = {};
    for (const name of ['enabled', 'activeOffsetY', 'failOffsetX', 'onEnd', 'onBegin', 'onStart', 'minDuration', 'maxDistance', 'activateAfterLongPress', 'runOnJS']) gesture[name] = (value: unknown) => { gesture[`${name}Value`] = value; return gesture; };
    return gesture;
  };
  return { ScrollView: jest.requireActual('react-native').ScrollView, GestureDetector: ({ children }: { children: unknown }) => children, Gesture: { Pan: chain, LongPress: chain, Native: chain, Simultaneous: (...gestures: unknown[]) => ({ gestures }) } };
});
jest.mock('react-native-reanimated', () => ({ runOnJS: (fn: (...args: unknown[]) => unknown) => fn }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
function loadComicDay(_date: string) {
  const library = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY);
  return library?.diaries.find(diary => diary.id === library.activeId)?.scenes ?? [];
}
function openCharacterChooser(tree: ReactTestRenderer) {
  return tree.root.findAllByType(ComicCharacterChooser)[0];
}
beforeEach(() => {
  localStorageClient.setJson(COMIC_DIARY_HOME_DATE_KEY, '2026-10-21');
  localStorageClient.removeItem(COMIC_DIARY_STORAGE_KEY);
  localStorageClient.removeItem('pokit:service-tutorial-v2');
  clearComicNavigation();
  resetServiceTutorialSession();
  useServiceTutorial.setState(initialServiceProgress);
});
afterEach(() => {
  localStorageClient.removeItem(COMIC_DIARY_HOME_DATE_KEY);
  localStorageClient.removeItem(COMIC_DIARY_HOME_SELECTION_KEY);
  localStorageClient.removeItem(COMIC_DIARY_STORAGE_KEY);
  localStorageClient.removeItem('pokit:comic-character-name:protagonist-1');
  localStorageClient.removeItem('pokit:service-tutorial-v2');
  clearComicNavigation();
  localStorageClient.removeItem('pokit:comic-day:2026-10-21');
  resetServiceTutorialSession();
  useServiceTutorial.setState(initialServiceProgress);
});
it('adds an independent scene, edits its memo and restores it after remounting', () => {
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.root.findByType(ComicDayBoard).props.onOpen(loadComicDay('2026-10-21')[0].id); });
  // Inputs now mount only once the card has finished its native rotation.
  const frames = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0; });
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({
    start: callback => callback?.({ finished: true }), stop: jest.fn(), reset: jest.fn(),
  }));
  act(() => tree.root.findAllByType(Modal).find(node => node.props.visible)?.props.onShow());
  frames.mockRestore(); timing.mockRestore();

  const memo = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.memo')!;
  act(() => { memo.props.onChangeText('My independent note'); });
  expect(loadComicDay('2026-10-21')[0].memo).toBe('My independent note');
  const entry = () => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.todoHint')!;
  act(() => { entry().props.onSubmitEditing(); });
  expect(loadComicDay('2026-10-21')[0].todos).toEqual([]);
  act(() => { entry().props.onChangeText('  Prepare a draft  '); });
  act(() => { entry().props.onSubmitEditing(); });
  expect(loadComicDay('2026-10-21')[0].todos[0].text).toBe('Prepare a draft');
  expect(entry().props.value).toBe('');
  expect(tree.root.findByType(ComicDayBoard).props.onComplete).toBeUndefined();
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(loadComicDay('2026-10-21')[0].memo).toBe('My independent note');
  expect(tree.root.findByType(ComicDayBoard).props.items[0].completed).toBeUndefined();
  act(() => { tree.unmount(); });
});

it('adds a random scene without opening a picker or details', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  expect(loadComicDay('2026-10-21')).toHaveLength(2);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.unmount(); });
});

it('removes a scene from the day only after confirmation and persists the remaining scenes', () => {
  const first = newComicScene('First');
  const second = { ...newComicScene('Second'), memo: 'Keep me' };
  saveComicDay('2026-10-21', [first, second]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onRemove(first.id); });
  expect(loadComicDay('2026-10-21')).toEqual([first, second]);
  const buttons = alert.mock.calls[0][2]!;
  act(() => { buttons.find(button => button.style === 'destructive')!.onPress!(); });
  expect(loadComicDay('2026-10-21')).toEqual([second]);
  expect(tree.root.findByType(ComicDayBoard).props.items.map((item: { key: string }) => item.key)).toEqual([second.id]);
  act(() => { tree.unmount(); });
  alert.mockRestore();
});

it('restores the random card after remount without reopening a scene gallery', () => {
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onSelectCharacter(); });
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicDayBoard)).toHaveLength(1);
  act(() => { tree.unmount(); });
});

it('omits scene time controls from the board and detail while retaining existing saved data', () => {
  const scene = { ...newComicScene('Morning'), time: '08:15' };
  saveComicDay('2026-10-21', [scene]);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  const board = tree.root.findByType(ComicDayBoard);
  expect(board.props.onEditTime).toBeUndefined();
  expect(board.props.items[0].timeLabel).toBeUndefined();
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'dayPlan.timeUnsetA11y')).toHaveLength(0);
  act(() => { board.props.onOpen(scene.id); });
  expect(tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.time')).toHaveLength(0);
  expect(loadComicDay('2026-10-21')[0].time).toBe('08:15');
  act(() => { tree.unmount(); });
});

it('has no protagonist rename action or name editor', () => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  expect(ref.current).not.toHaveProperty('renameCharacter');
  act(() => ref.current!.openSceneEntry());
  expect(tree.root.findAllByProps({ testID: 'comic-character-name' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-name' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('creates, renames, switches and deletes separate diaries through the library while starting a new day empty and keeping history available', () => {
  const diaryRef = createRef<ComicDiaryHandle>();
  const onTitleChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={diaryRef} onTitleChange={onTitleChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  const first = loadComicDay('2026-10-21')[0];
  act(() => { tree.root.findByType(ComicDayBoard).props.onEditCard(first.id, { title: 'Keep first diary', memo: '' }); });
  const openLibrary = () => act(() => { diaryRef.current!.openLibrary(); });
  openLibrary();
  const firstId = tree.root.findByType(ComicDiaryLibrary).props.activeId;
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onRename(firstId, '나의 이야기'); });
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onCreate(); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  openLibrary();
  const secondId = tree.root.findByType(ComicDiaryLibrary).props.activeId;
  expect(secondId).not.toBe(firstId);
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onOpen(firstId); });
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('나의 이야기');
  expect(onTitleChange).toHaveBeenLastCalledWith('나의 이야기');
  act(() => { diaryRef.current!.renameDiary(); });
  expect(tree.root.findByType(ComicDiaryLibrary).props.initialRenameId).toBe(firstId);
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onClose(); });
  expect(tree.root.findByType(ComicDayBoard).props.items[0].key).toBe(first.id);
  act(() => { tree.unmount(); tree = create(<IndependentComicPlanner ref={diaryRef} onTitleChange={onTitleChange} date="2026-10-22" ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  expect(onTitleChange).toHaveBeenLastCalledWith(null);
  openLibrary();
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toHaveLength(2);
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onOpen(firstId); });
  expect(tree.root.findByType(ComicDayBoard).props.items[0].key).toBe(first.id);
  openLibrary();
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onDelete(firstId); });
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toHaveLength(2);
  act(() => { alert.mock.calls[0][2]!.find(button => button.style === 'destructive')!.onPress!(); });
  expect(tree.root.findByType(ComicDiaryLibrary).props.activeId).toBe(secondId);
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toHaveLength(1);
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onDelete(secondId); });
  act(() => { alert.mock.calls[1][2]!.find(button => button.style === 'destructive')!.onPress!(); });
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toEqual([]);
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => { tree.unmount(); });
  alert.mockRestore();
});

it('confirms a batch deletion once and preserves unselected scenes and their notes after remount', () => {
  const first = newComicScene('First');
  const second = newComicScene('Second');
  const keep = { ...newComicScene('Keep'), memo: 'Keep this note', todos: [{ id: 'task', text: 'Keep task', completed: true }] };
  saveComicDay('2026-10-21', [first, second, keep]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onRemoveMany([first.id, second.id]); });
  expect(alert).toHaveBeenCalledTimes(1);
  expect(loadComicDay('2026-10-21')).toEqual([first, second, keep]);
  act(() => { alert.mock.calls[0][2]!.find(button => button.style === 'cancel')!.onPress?.(); });
  expect(loadComicDay('2026-10-21')).toEqual([first, second, keep]);
  act(() => { tree.root.findByType(ComicDayBoard).props.onRemoveMany([first.id, second.id]); });
  act(() => { alert.mock.calls[1][2]!.find(button => button.style === 'destructive')!.onPress!(); });
  expect(loadComicDay('2026-10-21')).toEqual([keep]);
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.items.map((item: { key: string }) => item.key)).toEqual([keep.id]);
  act(() => { tree.unmount(); });
  alert.mockRestore();
});


jest.mock('./HeroCardStack', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { HeroCardStack: React.forwardRef(function MockStack({ active, enabled, renderPage, onChange }: { active: number; enabled: boolean; renderPage: (index: number, interactive: boolean, focused: boolean) => unknown; onChange: (index: number) => void }, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ turnTo: onChange }));
    return <View testID="comic-card-stack">{renderPage(active, enabled, true)}</View>;
  }) };
});

it('starts the named protagonist directly with a random card and keeps tutorial guidance', () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: true, mode: 'comic', step: 'comicCharacter', runId: 'manual-start' });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], 'Name'));
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  expect(loadComicDay('2026-10-21')[0]).toMatchObject({ title: '', memo: '' });
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicOpen', sceneKey: loadComicDay('2026-10-21')[0].id });
  act(() => tree.unmount());
});

it.each([false, true])('returns to the library without creating a diary when selection is closed (existing diary: %s)', existing => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const first = { id: 'keep-diary', title: 'Keep my story', characterId: COMIC_CHARACTERS[0].id, scenes: [newComicScene('Keep this scene')], createdAt: new Date(2026, 9, 27, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: existing ? [first] : [], activeId: existing ? first.id : null, migratedLegacyKeys: [] });
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-27" ink="#222" muted="#888" isDark={false} />); });
  if (!existing) {
    expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
    expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  }
  act(() => { ref.current!.openLibrary(); });
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onCreate(); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(1);
  expect(tree.root.findAllByType(ComicDiaryLibrary)).toHaveLength(0);
  const close = tree.root.findAllByProps({ testID: 'comic-character-close' })[0];
  act(() => { close.props.onPress(); });
  const library = tree.root.findByType(ComicDiaryLibrary);
  expect(library.props.diaries).toHaveLength(existing ? 1 : 0);
  expect(library.props.activeId).toBe(existing ? first.id : null);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toHaveLength(existing ? 1 : 0);
  if (existing) {
    act(() => { library.props.onClose(); });
    expect(tree.root.findByType(ComicDayBoard).props.items[0].key).toBe(first.scenes[0].id);
  }
  act(() => { tree.unmount(); });
});


it('opens character selection from the empty home add button and closes back to home', () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-27" ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(1);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.root.findByType(ComicCharacterChooser).props.onClose(); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => { tree.unmount(); });
});

it('restores the committed resume behavior after a paused tutorial screen remounts', () => {
  useServiceTutorial.getState().start('comic');
  useServiceTutorial.getState().advance('comicStart', 'comicCharacter');
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-27" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { useServiceTutorial.getState().pause(); tree.unmount(); });
  act(() => { tree = create(render()); });
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicCharacter' });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(1);
  act(() => tree.unmount());
});

it.each(['start', 'later'])('continues from the main + at comicStart through %s into scene guidance', action => {
  jest.useFakeTimers();
  useServiceTutorial.setState({ ...initialServiceProgress, active: true, mode: 'comic', step: 'comicStart', runId: `home-${action}` });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  act(() => tree.root.findAllByProps({ testID: `comic-character-cover-${COMIC_CHARACTERS[0].id}` })[0].props.onPress());
  if (action === 'start') {
    act(() => tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.onPress());
  } else {
    act(() => useServiceTutorial.getState().skipStep());
  }
  act(() => { jest.advanceTimersByTime(700); });
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicOpen' });
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  const saved = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(saved.diaries.find(diary => diary.id === useServiceTutorial.getState().diaryKey)?.characterName).toBe(COMIC_CHARACTERS[0].name);
  act(() => tree.unmount());
  jest.useRealTimers();
});

it('keeps already mounted diary surfaces in sync when a replay creates its tutorial diary', () => {
  jest.useFakeTimers();
  const original = { id: 'personal-before-replay', title: 'My diary', characterId: COMIC_CHARACTERS[0].id, characterName: 'Original', scenes: [{ ...newComicScene('Personal'), image: COMIC_CHARACTERS[0].scenes[0].id }], createdAt: 1, updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [original], activeId: original.id, migratedLegacyKeys: [] });
  let first!: ReactTestRenderer;
  let second!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-27" ink="#222" muted="#888" isDark={false} />;
  act(() => { first = create(render()); second = create(render()); });
  act(() => useServiceTutorial.getState().start('comic'));
  act(() => first.root.findByType(ComicDayBoard).props.onAdd());
  act(() => first.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], 'Replay'));
  expect(first.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(second.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  const diaryKey = useServiceTutorial.getState().diaryKey;
  act(() => { jest.advanceTimersByTime(1500); });
  expect(useServiceTutorial.getState().diaryKey).toBe(diaryKey);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toHaveLength(2);
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicOpen' });
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries.find(diary => diary.id === original.id)).toEqual(original);
  act(() => { first.unmount(); second.unmount(); });
  jest.useRealTimers();
});

it('persists inline card edits without changing the image, tasks or other scenes', () => {
  const scene = { ...newComicScene('운동하기'), memo: '이전 메모', todos: [{ id: 'todo-1', text: '스트레칭', completed: true }] };
  const other = newComicScene('독서');
  saveComicDay('2026-10-21', [scene, other]);
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onEditCard(scene.id, { title: '아침 운동', memo: '몸을 가볍게 풀었다.' }); });
  expect(loadComicDay('2026-10-21')).toEqual([{ ...scene, title: '아침 운동', memo: '몸을 가볍게 풀었다.' }, other]);
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.items[0]).toEqual(expect.objectContaining({ label: '아침 운동', memo: '몸을 가볍게 풀었다.' }));
  act(() => tree.unmount());
});

it('confirms bulk diary deletion once, preserves other diaries and persists the active replacement', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const diaries = ['one', 'two', 'keep'].map(id => ({ id, title: id, characterId: COMIC_CHARACTERS[0].id, scenes: [newComicScene(id)], createdAt: new Date(2026, 9, 29, 8).getTime(), updatedAt: 1 }));
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries, activeId: 'one', migratedLegacyKeys: [] });
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-29" ink="#222" muted="#888" isDark={false} />); });
    act(() => ref.current!.openLibrary());
    act(() => tree.root.findByType(ComicDiaryLibrary).props.onDeleteMany(['one', 'two']));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][1]).toBe('comicDiary.deleteManyMessage');
    expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toHaveLength(3);
    act(() => alert.mock.calls[0][2]!.find(button => button.style === 'cancel')!.onPress?.());
    expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toHaveLength(3);
    act(() => tree.root.findByType(ComicDiaryLibrary).props.onDeleteMany(['one', 'two']));
    act(() => alert.mock.calls[1][2]!.find(button => button.style === 'destructive')!.onPress!());
    expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)).toMatchObject({ diaries: [diaries[2]], activeId: 'keep' });
    act(() => { tree.unmount(); tree = create(<IndependentComicPlanner ref={ref} date="2026-10-29" ink="#222" muted="#888" isDark={false} />); });
    act(() => ref.current!.openLibrary());
    expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toEqual([diaries[2]]);
    act(() => tree.root.findByType(ComicDiaryLibrary).props.onDeleteMany(['keep']));
    act(() => alert.mock.calls[2][2]!.find(button => button.style === 'destructive')!.onPress!());
    expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)).toMatchObject({ diaries: [], activeId: null });
    act(() => tree.unmount());
  } finally { alert.mockRestore(); }
});

it('preserves the initial draft and stacks a second random card on plus', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  const draft = tree.root.findByType(HeroRandomDraftCard);
  const image = draft.props.scene.id;
  act(() => tree.root.findAllByProps({ testID: 'hero-random-memo' })[0].props.onChangeText('보존할 내용'));
  act(() => tree.root.findByType(ComicDayBoard).props.onCreateRandom(image, { title: '보존할 내용', memo: '보존할 내용' }, true));
  const board = tree.root.findByType(ComicDayBoard);
  expect(board.props.items).toHaveLength(2);
  expect(board.props.items[0].memo).toBe('보존할 내용');
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  act(() => board.props.onAdd());
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(3);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => tree.unmount());
});

it.each(['scenes', 'cancel'])('opens a header list over the existing board and keeps additions in the same diary: %s', mode => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  act(() => tree.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], '서연'));
  const initial = loadComicDay('2026-10-21')[0];
  act(() => tree.root.findByType(ComicDayBoard).props.onEditCard(initial.id, { title: '기존 장면', memo: '지켜야 할 메모' }));
  const existing = loadComicDay('2026-10-21')[0];
  const before = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  act(() => ref.current!.openSceneEntry());
  const chooser = tree.root.findByType(HeroCharacterList);
  expect(chooser.props.open).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-list' })[0].props.style[0].position).toBe('absolute');
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-upcoming' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  if (mode === 'cancel') {
    act(() => ref.current!.openSceneEntry());
    expect(tree.root.findByType(HeroCharacterList).props.open).toBe(false);
  } else {
    act(() => chooser.props.onSelect(COMIC_CHARACTERS[0]));
    expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  }
  const after = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(after.activeId).toBe(before.activeId);
  expect(after.diaries).toHaveLength(1);
  expect(after.diaries[0].title).toBe(before.diaries[0].title);
  expect(after.diaries[0].characterName).toBe('서연');
  expect(after.diaries[0].scenes[0]).toEqual(existing);
  expect(after.diaries[0].scenes).toHaveLength(1);
  act(() => tree.unmount());
});

it.each([true, false])('starts the new day empty even when yesterday has an unfinished tutorial (active=%s)', active => {
  const yesterday = { id: 'yesterday-tutorial', title: 'Yesterday', characterId: COMIC_CHARACTERS[0].id, scenes: [newComicScene('Keep yesterday')], createdAt: new Date(2026, 9, 29, 20).getTime(), updatedAt: 0 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [yesterday], activeId: yesterday.id, migratedLegacyKeys: [] });
  localStorageClient.setJson(COMIC_DIARY_HOME_DATE_KEY, '2026-10-29');
  const progress = { ...initialServiceProgress, active, mode: 'comic' as const, step: 'comicOpen' as const, runId: 'unfinished-yesterday', diaryKey: yesterday.id, sceneKey: yesterday.scenes[0].id };
  localStorageClient.setJson('pokit:service-tutorial-v2', progress);
  useServiceTutorial.setState(progress);
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => ref.current!.openLibrary());
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toEqual([yesterday]);
  act(() => tree.root.findByType(ComicDiaryLibrary).props.onOpen(yesterday.id));
  expect(tree.root.findByType(ComicDayBoard).props.items[0].key).toBe(yesterday.scenes[0].id);
  act(() => tree.unmount());
});

it('returns to the empty home when its date changes without unmounting the parent', () => {
  saveComicDay('2026-10-21', [newComicScene('Yesterday')]);
  let tree!: ReactTestRenderer;
  const render = (date: string) => <IndependentComicPlanner date={date} ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render('2026-10-21')); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  act(() => tree.update(render('2026-10-22')));
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => tree.unmount());
});

it('Today exits past history and returns to today without automatically opening the library', () => {
  const entries = [
    { id: 'yesterday', createdAt: new Date(2026, 9, 29, 20).getTime() },
    { id: 'morning', createdAt: new Date(2026, 9, 30, 8).getTime() },
    { id: 'evening', createdAt: new Date(2026, 9, 30, 18).getTime() },
  ].map(entry => ({ ...entry, title: entry.id, characterId: COMIC_CHARACTERS[0].id, scenes: [newComicScene(entry.id)], updatedAt: 0 }));
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: entries, activeId: 'yesterday', migratedLegacyKeys: [] });
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  act(() => ref.current!.openLibrary());
  act(() => tree.root.findByType(ComicDiaryLibrary).props.onOpen('yesterday'));
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('yesterday');
  act(() => ref.current!.openToday());
  expect(tree.root.findAllByType(ComicDiaryLibrary)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('evening');
  act(() => ref.current!.openLibrary());
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toHaveLength(3);
  act(() => tree.unmount());
});

it('Today shows the empty home without a library popup when only past records exist', () => {
  saveComicDay('2026-10-21', [newComicScene('Keep history')]);
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  act(() => ref.current!.openToday());
  expect(tree.root.findAllByType(ComicDiaryLibrary)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => ref.current!.openLibrary());
  expect(tree.root.findByType(ComicDiaryLibrary).props.diaries).toHaveLength(1);
  act(() => tree.unmount());
});


it('opens photo selection from the empty-home camera icon without creating a diary', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  const before = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY);
  const photo = tree.root.findAllByProps({ testID: 'comic-empty-photo-add' })[0];
  await act(async () => photo.props.onPress());
  const flow = tree.root.findByType(HeroInlineComposer);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-workspace' }).length).toBeGreaterThan(0);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toEqual(before?.diaries);
  act(() => flow.props.onClose());
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => tree.root.findAllByProps({ testID: 'comic-empty-scene-add' })[0].props.onPress());
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(1);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  act(() => tree.unmount());
});


it.each(['', '바로 쓴 제목'])('writes directly on the random card and saves that exact picture only once (title=%s)', async title => {
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />;
  await act(async () => { tree = create(render()); });
  const image = tree.root.findByType(HeroRandomDraftCard).props.scene.id;
  const save = () => tree.root.findAllByProps({ testID: 'hero-random-save' })[0];
  expect(save()).toBeUndefined();
  act(() => tree.root.findAllByProps({ testID: 'hero-random-memo' })[0].props.onFocus());
  expect(save().props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-random-memo' })[0].props.onChangeText('취소할 내용'));
  act(() => tree.root.findAllByProps({ testID: 'hero-random-cancel' })[0].props.onPress());
  expect(save()).toBeUndefined();
  expect(tree.root.findAllByProps({ testID: 'hero-random-memo' })[0].props.value).toBe('');
  act(() => tree.root.findAllByProps({ testID: 'hero-random-title' })[0].props.onFocus());
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toEqual([]);
  act(() => tree.root.findAllByProps({ testID: 'hero-random-title' })[0].props.onChangeText(title));
  act(() => tree.root.findAllByProps({ testID: 'hero-random-memo' })[0].props.onChangeText('오늘의 기록\n두 번째 줄'));
  const draft = tree.root.findByType(HeroRandomDraftCard);
  act(() => draft.findAllByProps({ testID: 'hero-random-paper-color' })[0].props.onPress());
  act(() => draft.findAll(node => node.props.accessibilityLabel?.endsWith(' #C8EBDD') && node.props.onPress)[0].props.onPress());
  act(() => draft.findAllByProps({ testID: 'hero-random-pen-color' })[0].props.onPress());
  act(() => draft.findAll(node => node.props.accessibilityLabel?.endsWith(' #693B48') && node.props.onPress)[0].props.onPress());
  const press = save().props.onPress;
  act(() => { press(); press(); });
  const stored = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(stored.diaries).toHaveLength(1);
  expect(stored.diaries[0].scenes[0]).toMatchObject({ image, title: title || '오늘의 기록', memo: '오늘의 기록\n두 번째 줄', paper: '#C8EBDD', pen: '#693B48' });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items[0].label).toBe(title || '오늘의 기록');
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.items[0].memo).toBe('오늘의 기록\n두 번째 줄');
  act(() => tree.unmount());
});

it('replaces the active card with the inline result and keeps other cards intact', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const first = newComicScene('First');
  const second = newComicScene('Second');
  const diary = { id: 'inline-diary', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [first, second], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onActiveSceneChange(second.id));
  await act(async () => ref.current!.openPhotoEntry());
  const flow = tree.root.findByType(HeroInlineComposer);
  expect(flow.props.targetSceneId).toBe(second.id);
  await act(async () => flow.props.onApply({ title: 'New', memo: 'A new story', paper: '#F5E8CF', pen: '#222' }, 'file:///inline-result.png', 'hero-test'));
  const scenes = loadComicDay('2026-10-21');
  expect(scenes).toHaveLength(2);
  expect(scenes[0]).toEqual(first);
  expect(scenes[1]).toMatchObject({ id: second.id, memo: 'A new story', artworkUri: 'file:///inline-result.png' });
  expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(2);
  act(() => tree.unmount());
});

it('replaces only the selected card artwork from the detail gallery and preserves its writing and tasks', () => {
  const target = { ...newComicScene('Keep title'), image: '05-work' as const, artworkUri: 'file:///generated.png', memo: 'Keep memo', todos: [{ id: 'keep-task', text: 'Keep task', completed: true }] };
  const other = newComicScene('Other');
  saveComicDay('2026-10-21', [target, other]);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onOpen(target.id));
  const frames = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0; });
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(() => ({ start: callback => callback?.({ finished: true }), stop: jest.fn(), reset: jest.fn() }));
  act(() => tree.root.findAllByType(Modal).find(node => node.props.visible)?.props.onShow());
  frames.mockRestore(); timing.mockRestore();
  const change = () => tree.root.findAllByProps({ testID: 'hero-detail-change-scene' })[0];
  act(() => change().props.onPress());
  let picker = tree.root.findByType(ComicScenePicker);
  expect(picker.props.embedded).toBe(true);
  act(() => picker.props.onClose());
  expect(loadComicDay('2026-10-21')).toEqual([target, other]);
  act(() => change().props.onPress());
  picker = tree.root.findByType(ComicScenePicker);
  act(() => picker.props.onSelectScene('06-reading'));
  expect(loadComicDay('2026-10-21')).toEqual([{ ...target, image: '06-reading', artworkUri: undefined }, other]);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => tree.unmount());
});

it('opens the new inline composer from the chooser personalization entry', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  await act(async () => tree.root.findByType(ComicCharacterChooser).props.onPersonalize());
  expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(1);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  act(() => tree.unmount());
});
