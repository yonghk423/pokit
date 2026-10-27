import { Animated, Modal } from 'react-native';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary as DiaryState } from '../lib/heroDiaryStorage';
import { clearComicNavigation, saveComicNavigation } from '../lib/heroNavigation';
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
  localStorageClient.removeItem(COMIC_DIARY_STORAGE_KEY);
  localStorageClient.removeItem('pokit:service-tutorial-v2');
  clearComicNavigation();
  resetServiceTutorialSession();
  useServiceTutorial.setState(initialServiceProgress);
});
afterEach(() => {
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
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  expect(loadComicDay('2026-10-21')).toEqual([]);
  act(() => { tree.root.findByType(ComicScenePicker).props.onChange([{ ...newComicScene('Read'), image: '06-reading' }]); tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  expect(loadComicDay('2026-10-21')[0].image).toBe('06-reading');
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

it('cancels image picking without adding a scene or opening details', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  expect(loadComicDay('2026-10-21')).toEqual([]);
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

it('restores the open scene gallery after a tab remount instead of resetting character selection', () => {
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(1);
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(1);
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

it('renames the current protagonist without returning to character selection', () => {
  const diaryRef = createRef<ComicDiaryHandle>();
  const onCharacterNameChange = jest.fn();
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner ref={diaryRef} hideCharacterHeading onCharacterNameChange={onCharacterNameChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  act(() => { tree.root.findAllByType(ComicScenePicker)[0]?.props.onClose(); });
  act(() => { diaryRef.current!.renameCharacter(); });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  const input = () => tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.character.rename')!;
  act(() => { input().props.onChangeText('새 이름'); });
  act(() => { input().props.onSubmitEditing(); });
  expect(tree.root.findByType(ComicDayBoard).props.characterName).toBe('새 이름');
  expect(onCharacterNameChange).toHaveBeenLastCalledWith('새 이름');
  expect(tree.root.findByType(ComicDayBoard).props.hideCharacterHeading).toBe(true);
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.characterName).toBe('새 이름');
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => { tree.unmount(); });
});

it('creates, renames, switches and deletes separate diaries through the library without resetting on another day', () => {
  const diaryRef = createRef<ComicDiaryHandle>();
  const onTitleChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={diaryRef} onTitleChange={onTitleChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  const first = newComicScene('Keep first diary');
  act(() => { tree.root.findByType(ComicScenePicker).props.onChange([first]); });
  act(() => { tree.root.findByType(ComicScenePicker).props.onClose(); });
  const openLibrary = () => act(() => { diaryRef.current!.openLibrary(); });
  openLibrary();
  const firstId = tree.root.findByType(ComicDiaryLibrary).props.activeId;
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onRename(firstId, '나의 이야기'); });
  act(() => { tree.root.findByType(ComicDiaryLibrary).props.onCreate(); });
  if (!tree.root.findAllByType(ComicCharacterChooser).length && tree.root.findByType(ComicDayBoard).props.items.length === 0) act(() => { tree.root.findByType(ComicDayBoard).props.onAdd(); });
  act(() => { openCharacterChooser(tree)?.props.onStart(COMIC_CHARACTERS[0]); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
  act(() => { tree.root.findByType(ComicScenePicker).props.onClose(); });
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
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('나의 이야기');
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

it('keeps the tutorial active and opens scenes when a named puppy is started manually', () => {
  jest.useFakeTimers();
  const { initialServiceProgress, useServiceTutorial } = require('../../welcome-intro/model/serviceTutorial');
  useServiceTutorial.setState({ ...initialServiceProgress, active: true, mode: 'comic', step: 'comicCharacter', runId: 'manual-start' });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => { tree.root.findAllByProps({ testID: `comic-character-select-${COMIC_CHARACTERS[1].id}` })[0].props.onPress(); });
  const input = tree.root.findAllByType(ThemedTextInput).find(node => node.props.accessibilityLabel === 'comicDay.character.nameHint')!;
  act(() => { input.props.onChangeText('123'); });
  const chooser = tree.root.findByType(ComicCharacterChooser);
  const start = chooser.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0];
  // Start advances to comicPick; the chooser effect then saves and opens the diary.
  act(() => { start.props.onPress(); });
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, mode: 'comic', step: 'comicPick' });
  act(() => { jest.advanceTimersByTime(700); });
  let picker = tree.root.findByType(ComicScenePicker);
  expect(picker.props.embedded).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'comic-scene-picker-inline' }).length).toBeGreaterThan(0);
  expect(picker.findAllByType(Modal)).toHaveLength(0);
  expect(picker.props.library[0].id).toMatch(/^puppy-/);
  expect(loadComicDay('2026-10-21')).toEqual([]);
  // Even if the screen remounts with an old board route, the tutorial must
  // automatically display step 5 instead of the empty initial board.
  const startedDiary = useServiceTutorial.getState().diaryKey;
  act(() => { tree.unmount(); });
  saveComicNavigation(COMIC_CHARACTERS[1].id, 'board', startedDiary);
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  picker = tree.root.findByType(ComicScenePicker);
  expect(picker.props.embedded).toBe(true);
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicPick', diaryKey: startedDiary });
  const scene = { ...newComicScene('Puppy'), image: picker.props.library[0].id };
  act(() => { picker.props.onChange([scene]); });
  useServiceTutorial.getState().advance('comicPick', 'comicReturn', { sceneKey: scene.id });
  act(() => { picker.props.onClose(); });
  act(() => { tree.root.findByType(ComicDayBoard).props.onOpen(scene.id, { frame: { left: 30, top: 100, width: 300, height: 420 }, front: null }); });
  const { HeroCardFlip } = require('./HeroCardFlip');
  expect(tree.root.findByType(HeroCardFlip).props.transition).not.toBe('fade');
  expect(tree.root.findAllByProps({ testID: 'hero-card-flip-front' }).length).toBeGreaterThan(0);
  act(() => { tree.unmount(); useServiceTutorial.setState({ ...initialServiceProgress }); });
  jest.useRealTimers();
});

it.each([false, true])('returns to the library without creating a diary when selection is closed (existing diary: %s)', existing => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const first = { id: 'keep-diary', title: 'Keep my story', characterId: COMIC_CHARACTERS[0].id, scenes: [newComicScene('Keep this scene')], createdAt: 1, updatedAt: 1 };
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
  act(() => tree.root.findAllByProps({ testID: `comic-character-select-${COMIC_CHARACTERS[1].id}` })[0].props.onPress());
  act(() => tree.root.findAllByType(ThemedTextInput).find(node => node.props.testID === 'comic-character-name')!.props.onChangeText('함께'));
  if (action === 'start') {
    act(() => tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.onPress());
  } else {
    act(() => useServiceTutorial.getState().skipStep());
  }
  act(() => { jest.advanceTimersByTime(700); });
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicPick' });
  const picker = tree.root.findByType(ComicScenePicker);
  expect(picker.props.library[0].id).toMatch(/^puppy-/);
  const saved = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(saved.diaries.find(diary => diary.id === useServiceTutorial.getState().diaryKey)?.characterName).toBe('함께');
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
  act(() => first.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[1], 'Replay'));
  expect(first.root.findAllByType(ComicScenePicker)).toHaveLength(1);
  expect(second.root.findAllByType(ComicScenePicker)).toHaveLength(1);
  const diaryKey = useServiceTutorial.getState().diaryKey;
  act(() => { jest.advanceTimersByTime(1500); });
  expect(useServiceTutorial.getState().diaryKey).toBe(diaryKey);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toHaveLength(2);
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicPick' });
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries.find(diary => diary.id === original.id)).toEqual(original);
  act(() => { first.unmount(); second.unmount(); });
  jest.useRealTimers();
});
