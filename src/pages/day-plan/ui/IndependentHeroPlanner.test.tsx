import * as originalPhotoLibrary from '../lib/heroOriginalPhoto';
import { saveHeroCardLayout, loadHeroCardLayout } from '../model/heroCardLayout';
import { ComicSceneDeck } from './HeroSceneDeck';
import { HeroCardAppearanceControls } from './HeroCardAppearanceControls';
import * as heroAiLibrary from '../lib/heroAiLibrary';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { HeroGeneratedArtworkPicker } from './HeroGeneratedArtworkPicker';
import { HeroEmptyTodayChooser } from './HeroEmptyTodayChooser';
import { readHeroCharacterOrder } from '../lib/heroCharacterOrder';
import { HeroInlineComposer } from './HeroInlineComposer';
import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { COMIC_DIARY_HOME_DATE_KEY, COMIC_DIARY_HOME_SELECTION_KEY } from '../lib/heroDiaryHome';
import { Animated, Modal, PanResponder, type PanResponderCallbacks } from 'react-native';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary as DiaryState } from '../lib/heroDiaryStorage';
import { clearComicNavigation, saveComicNavigation } from '../lib/heroNavigation';
import { HeroCharacterList } from './HeroCharacterList';
import { HeroCharacterPickerOverlay } from './HeroCharacterPickerOverlay';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { COMIC_SCENES } from '../lib/heroSceneImages';
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
jest.mock('react-native-reanimated', () => {
  const fade = { duration: () => fade, delay: () => fade, reduceMotion: () => fade, easing: () => fade };
  const native = jest.requireActual('react-native');
  return { __esModule: true, default: { View: native.View, FlatList: native.FlatList, ScrollView: native.ScrollView }, Easing: native.Easing,
    useSharedValue: (value: number) => require('react').useRef({ value }).current,
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    interpolate: (value: number, input: number[], output: number[]) => {
      const index = Math.max(0, Math.min(input.length - 2, input.findIndex((stop, i) => i > 0 && value <= stop) - 1));
      return output[index] + (value - input[index]) / (input[index + 1] - input[index]) * (output[index + 1] - output[index]);
    },
    LinearTransition: fade, FadeIn: fade, FadeOut: fade, ReduceMotion: { System: 'system' }, runOnJS: (fn: (...args: unknown[]) => unknown) => fn };
});
jest.mock('../model/useHeroLoopingRail', () => ({ useHeroLoopingRail: (span: number) => ({
  ref: require('react').useRef(null), onScroll: jest.fn(), onTouchStart: jest.fn(), onTouchEnd: jest.fn(), initialOffset: { x: span, y: 0 }, autoPlaying: false,
}) }));
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
  localStorageClient.removeItem('pokit:hero-card-layout:v1');
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

  const originalPen = loadComicDay('2026-10-21')[0].pen;
  act(() => tree.root.findAllByProps({ accessibilityLabel: 'comicDay.paper #F5E8CF' })[0].props.onPress());
  expect(loadComicDay('2026-10-21')[0].paper).toBe('#F5E8CF');
  expect(loadComicDay('2026-10-21')[0].pen).toBe(originalPen);
  act(() => tree.root.findAllByProps({ accessibilityLabel: 'comicDay.pen #1565C0' })[0].props.onPress());
  expect(loadComicDay('2026-10-21')[0].paper).toBe('#F5E8CF');
  expect(loadComicDay('2026-10-21')[0].pen).toBe('#1565C0');
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

it('opens a scene choice on plus and adds only the explicitly selected illustration', () => {
  saveComicDay('2026-10-21', [newComicScene('Keep existing')]);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  try {
    const original = loadComicDay('2026-10-21');
    act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
    expect(loadComicDay('2026-10-21')).toEqual(original);
    expect(tree.root.findByType(ComicScenePicker).props.selectionPurpose).toBe('add');
    act(() => tree.root.findByType(ComicScenePicker).props.onClose());
    expect(loadComicDay('2026-10-21')).toEqual(original);
    act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
    act(() => tree.root.findByType(ComicScenePicker).props.onSelectScene('05-work'));
    expect(loadComicDay('2026-10-21')).toHaveLength(original.length + 1);
    expect(loadComicDay('2026-10-21').at(-1)).toMatchObject({ image: '05-work', title: '', memo: '' });
    expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
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
  act(() => { tree.root.findByType(ComicDayBoard).props.onOpen(first.id); });
  act(() => { tree.root.findAllByProps({ testID: 'hero-image-delete' })[0].props.onPress(); });
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

it('starts the named protagonist directly without activating a tutorial', () => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => ref.current!.openLibrary());
  act(() => tree.root.findByType(ComicDiaryLibrary).props.onCreate());
  expect(tree.root.findAllByProps({ testID: 'hero-personal-card' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' }).length).toBeGreaterThan(0);
  act(() => tree.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], 'Name'));
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  expect(loadComicDay('2026-10-21')[0]).toMatchObject({ title: '', memo: '' });
  expect(useServiceTutorial.getState()).toMatchObject({ active: false, step: 'finish' });
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

it('does not resume the retired tutorial after a screen remount', () => {
  useServiceTutorial.getState().start('comic');
  useServiceTutorial.getState().advance('comicStart', 'comicCharacter');
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-27" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { useServiceTutorial.getState().pause(); tree.unmount(); });
  act(() => { tree = create(render()); });
  expect(useServiceTutorial.getState()).toMatchObject({ active: false, step: 'finish' });
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  act(() => tree.unmount());
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

it('starts with a chosen protagonist and preserves its memo when adding another card', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-empty-character-protagonist-6' })[0].props.onPress());
  const first = tree.root.findByType(ComicDayBoard).props.items[0];
  act(() => tree.root.findByType(ComicDayBoard).props.onEditCard(first.key, { title: '내 기록', memo: '보존할 내용' }));
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  act(() => tree.root.findByType(ComicScenePicker).props.onSelectScene(COMIC_CHARACTERS[5].scenes[1].id));
  const board = tree.root.findByType(ComicDayBoard);
  expect(board.props.items).toHaveLength(2);
  expect(board.props.items[0].memo).toBe('보존할 내용');
  expect(board.props.character.id).toBe('protagonist-6');
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
  act(() => tree.unmount());
});

it.each(['scenes', 'cancel'])('opens a header list over the existing board and keeps additions in the same diary: %s', mode => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#69BFAE" muted="#888" isDark={false} />); });
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
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-list' })[0].props.style[0].left).toBe(24);
  expect(tree.root.findByProps({ testID: 'hero-header-character-scroll' }).props.contentContainerStyle.gap).toBe(2);
  expect(tree.root.findByProps({ testID: 'hero-header-character-protagonist-1' }).props.style.width).toBe(44);
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-ring-protagonist-1' })[0].props.stroke).toBe('#171510');
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(1);
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-upcoming' })).toHaveLength(0);
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

it('registers the protagonist choices in the shared header row beside the entry icons', () => {
  const onHeaderCharacterListChange = jest.fn();
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} onHeaderCharacterListChange={onHeaderCharacterListChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  onHeaderCharacterListChange.mockClear();
  act(() => ref.current!.openSceneEntry());
  const registeredList = onHeaderCharacterListChange.mock.calls.at(-1)?.[0];
  expect(registeredList.type).toBe(HeroCharacterList);
  expect(registeredList.props.inline).toBe(true);
  expect(registeredList.props.open).toBe(true);
  let listTree!: ReactTestRenderer;
  act(() => { listTree = create(registeredList); });
  expect(listTree.root.findByProps({ testID: 'hero-header-character-list' }).props.style[0].top).toBe(8);
  act(() => listTree.unmount());
  act(() => ref.current!.openSceneEntry());
  expect(onHeaderCharacterListChange).toHaveBeenLastCalledWith(null);
  act(() => tree.unmount());
});

it('opens a character overlay over the mounted board and changes character only after selection', () => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  act(() => tree.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], '서연'));
  const activeId = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!.activeId;
  const board = tree.root.findByType(ComicDayBoard);
  act(() => ref.current!.openCharacterPicker());
  expect(tree.root.findByType(ComicDayBoard)).toBe(board);
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  const picker = tree.root.findByType(HeroCharacterPickerOverlay);
  const scroll = picker.findAllByProps({ testID: 'hero-character-picker-scroll' })[0];
  expect(scroll.props.children.flat().some((child: { props?: { testID?: string } }) => child.props?.testID === 'hero-character-picker-upcoming')).toBe(false);
  const firstCard = picker.findAllByProps({ testID: 'hero-character-picker-protagonist-1' })[0];
  expect(firstCard.props.style.width).toBeLessThanOrEqual(124);
  expect(picker.findAllByProps({ testID: 'hero-character-picker-upcoming' })).toHaveLength(0);
  expect(firstCard.props.style.shadowOpacity).toBeGreaterThan(0);
  expect(picker.findAllByProps({ testID: 'hero-picker-skeleton-protagonist-1' }).length).toBeGreaterThan(0);
  const preview = picker.findAllByProps({ testID: 'hero-picker-image-protagonist-1' })[0];
  act(() => preview.props.onError());
  expect(picker.findAllByProps({ testID: 'hero-picker-image-protagonist-1' })[0].props.source).toBe(COMIC_CHARACTERS[0].cover);
  act(() => preview.props.onDisplay());
  expect(picker.findAllByProps({ testID: 'hero-picker-skeleton-protagonist-1' })).toHaveLength(0);
  expect(picker.findAllByProps({ testID: 'hero-picker-skeleton-protagonist-2' }).length).toBeGreaterThan(0);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!.activeId).toBe(activeId);
  act(() => tree.root.findByType(HeroCharacterPickerOverlay).props.onClose());
  expect(tree.root.findAllByType(HeroCharacterPickerOverlay)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard)).toBe(board);
  act(() => ref.current!.openCharacterPicker());
  act(() => tree.root.findByType(HeroCharacterPickerOverlay).props.onSelect(COMIC_CHARACTERS[1]));
  expect(tree.root.findAllByType(HeroCharacterPickerOverlay)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.character.id).toBe(COMIC_CHARACTERS[1].id);
  act(() => tree.unmount());
});

it('switches the active day to the selected protagonist from the header rail', () => {
  const ref = createRef<ComicDiaryHandle>();
  const nextCharacter = COMIC_CHARACTERS[1];
  const onCharacterChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner ref={ref} onCharacterChange={onCharacterChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  expect(onCharacterChange).toHaveBeenLastCalledWith(COMIC_CHARACTERS[0]);
  act(() => tree.root.findByType(ComicDayBoard).props.onAdd());
  act(() => tree.root.findByType(ComicCharacterChooser).props.onStart(COMIC_CHARACTERS[0], '서연'));
  const firstDiaryId = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!.activeId;
  act(() => ref.current!.openSceneEntry());
  act(() => tree.root.findByType(HeroCharacterList).props.onSelect(nextCharacter));

  const updated = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  const active = updated.diaries.find(item => item.id === updated.activeId)!;
  expect(updated.diaries).toHaveLength(2);
  expect(updated.activeId).not.toBe(firstDiaryId);
  expect(active.characterId).toBe(nextCharacter.id);
  expect(active.scenes[0].image).toMatch(/^p2-/);
  expect(tree.root.findByType(HeroCharacterList).props.selectedId).toBe(nextCharacter.id);
  expect(onCharacterChange).toHaveBeenLastCalledWith(nextCharacter);
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
  const onDateChange = jest.fn();
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner onDateChange={onDateChange} ref={ref} date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  act(() => ref.current!.openLibrary());
  act(() => tree.root.findByType(ComicDiaryLibrary).props.onOpen('yesterday'));
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('yesterday');
  expect(onDateChange).toHaveBeenLastCalledWith('2026-10-29');
  act(() => ref.current!.openToday());
  expect(tree.root.findAllByType(ComicDiaryLibrary)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.diaryTitle).toBe('evening');
  expect(onDateChange).toHaveBeenLastCalledWith('2026-10-30');
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
  act(() => tree.root.findAllByProps({ testID: 'hero-empty-character-protagonist-1' })[0].props.onPress());
  expect(tree.root.findAllByType(ComicCharacterChooser)).toHaveLength(0);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  act(() => tree.unmount());
});


it.each(['protagonist-1', 'protagonist-6'])('creates a diary by tapping %s directly, and restores it after remount', async characterId => {
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />;
  await act(async () => { tree = create(render()); });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-character-start' })).toHaveLength(0);
  expect(localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)?.diaries).toEqual([]);
  const choose = tree.root.findAllByProps({ testID: `hero-empty-character-${characterId}` })[0].props.onPress;
  act(() => { choose(); choose(); });
  const stored = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(stored.diaries).toHaveLength(1);
  expect(stored.diaries[0].characterId).toBe(characterId);
  expect(stored.diaries[0].scenes).toHaveLength(1);
  const sceneId = stored.diaries[0].scenes[0].id;
  act(() => tree.root.findByType(ComicDayBoard).props.onEditCard(sceneId, { title: '오늘의 기록', memo: '메모 유지' }));
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.items[0]).toMatchObject({ label: '오늘의 기록', memo: '메모 유지' });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-today-chooser' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('keeps source cards unchanged and saves generated writing only on a new focused card', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const first = { ...newComicScene(''), memo: '', todos: [{ id: 'keep-task', text: 'Existing task', completed: false }] };
  const second = newComicScene('Second');
  const diary = { id: 'inline-diary', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [first, second], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onActiveSceneChange(first.id));
  await act(async () => ref.current!.openPhotoEntry());
  const flow = tree.root.findByType(HeroInlineComposer);
  expect(flow.props.targetSceneId).toBe(first.id);
  await act(async () => flow.props.onApply({ title: 'New', memo: 'A new story', paper: '#F5E8CF', pen: '#222' }, 'file:///inline-result.png', 'hero-test'));
  const scenes = loadComicDay('2026-10-21');
  expect(scenes).toHaveLength(3);
  expect(scenes[0]).toEqual(first);
  expect(scenes[1]).toEqual(second);
  expect(scenes[2]).toMatchObject({ title: 'New', memo: 'A new story', artworkUri: 'file:///inline-result.png', todos: [] });
  expect(scenes[2].id).not.toBe(first.id);
  expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(3);
  expect(tree.root.findByType(ComicDayBoard).props.focusSceneId).toBe(scenes[2].id);
  act(() => tree.unmount());
});

it('keeps generated variations with identical writing as separate cards and applies retries only once', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const original = { ...newComicScene('Same title'), memo: 'Same story', artworkUri: 'file:///hero-original-0.png', todos: [{ id: 'original-task', text: 'Keep task', completed: false }] };
  const diary = { id: 'variations-diary', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [original], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  const ref = createRef<ComicDiaryHandle>();
  const render = () => <IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(render()); });
  for (const index of [1, 2]) {
    await act(async () => ref.current!.openPhotoEntry());
    const apply = tree.root.findByType(HeroInlineComposer).props.onApply;
    const uri = `file:///hero-variation-${index}-0.png`;
    await act(async () => apply({ title: 'Same title', memo: 'Same story' }, uri, `hero-variation-${index}`));
    await act(async () => apply({ title: 'Same title', memo: 'Same story' }, uri, `hero-variation-${index}`));
  }
  const scenes = loadComicDay('2026-10-21');
  expect(scenes).toHaveLength(3);
  expect(scenes[0]).toEqual(original);
  expect(new Set(scenes.map(scene => scene.id)).size).toBe(3);
  expect(scenes.map(scene => scene.artworkUri)).toEqual(['file:///hero-original-0.png', 'file:///hero-variation-1-0.png', 'file:///hero-variation-2-0.png']);
  expect(scenes[1].todos).toEqual([]);
  act(() => tree.unmount());
  await act(async () => { tree = create(render()); });
  expect(tree.root.findByType(ComicDayBoard).props.items).toHaveLength(3);
  act(() => tree.unmount());
});

it('remaps a saved retired scene id to a kept scene when opening diary detail', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const remappedImage = 'p3-46-cook-ramen' as const;
  const card = { ...newComicScene('Saved night market'), image: remappedImage };
  // Persist the retired id the way older installs stored it; load path remaps via canonicalComicSceneId.
  const diary = {
    id: 'retired-scene-diary', title: 'Diary', characterId: 'protagonist-3',
    scenes: [{ ...card, image: 'p3-10-night-food-stall' }],
    createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1,
  };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation('protagonist-3', 'board', diary.id);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onOpen(card.id));
  const artwork = tree.root.findAllByProps({ imageKey: `${remappedImage}:original` })[0];
  expect(artwork.props.source).toBe(COMIC_SCENES.find(scene => scene.id === remappedImage)!.source);
  expect(loadComicDay('2026-10-21')[0]).toMatchObject({ id: card.id, image: remappedImage });
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

it('starts new AI entries empty instead of copying the viewed card or a previously closed entry', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const card = { ...newComicScene('Previous Halloween title'), memo: 'Previous card story', artworkUri: 'file:///old-card.png' };
  const diary = { id: 'empty-composer-diary', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [card], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  await act(async () => ref.current!.openPhotoEntry());
  const title = () => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0];
  const story = () => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0];
  expect(title().props.value).toBe('');
  expect(story().props.value).toBe('');
  act(() => title().props.onChangeText('Closed draft title'));
  act(() => story().props.onChangeText('Closed draft story'));
  act(() => tree.root.findByType(HeroInlineComposer).props.onClose());
  await act(async () => ref.current!.openPhotoEntry());
  expect(title().props.value).toBe('');
  expect(story().props.value).toBe('');
  expect(loadComicDay('2026-10-21')).toEqual([card]);
  act(() => tree.unmount());
});

it('starts AI generation empty instead of copying the board draft', async () => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(ComicDayBoard).props.onDraftChange('05-work', { title: 'Board draft title', memo: 'Board draft story' }));
  await act(async () => ref.current!.openPhotoEntry());
  expect(tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.value).toBe('');
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('');
  act(() => tree.unmount());
});

it('retains the AI mode, title and writing when switching header entries', async () => {
  const ref = createRef<ComicDiaryHandle>();
  const onPhotoEntryChange = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} onPhotoEntryChange={onPhotoEntryChange} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  await act(async () => ref.current!.openPhotoEntry());
  expect(onPhotoEntryChange).toHaveBeenLastCalledWith(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-mode-photo' })[0].props.onPress());
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.onChangeText('Keep title'));
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.onChangeText('Keep story'));
  act(() => ref.current!.openSceneEntry());
  expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(false);
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-list' })[0].props.pointerEvents).toBe('none');
  act(() => ref.current!.openSceneEntry());
  expect(tree.root.findAllByProps({ testID: 'hero-header-character-list' })[0].props.pointerEvents).toBe('auto');
  expect(onPhotoEntryChange).toHaveBeenLastCalledWith(false);
  await act(async () => ref.current!.openPhotoEntry());
  expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-mode-photo' })[0].props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-title' })[0].props.value).toBe('Keep title');
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('Keep story');
  act(() => tree.root.findByType(HeroInlineComposer).props.onClose());
  expect(onPhotoEntryChange).toHaveBeenLastCalledWith(false);
  act(() => tree.unmount());
});


it('reorders a long-pressed character without selecting it and restores order after reopening', () => {
  let handlers!: PanResponderCallbacks;
  const original = PanResponder.create;
  const spy = jest.spyOn(PanResponder, 'create').mockImplementation(config => { handlers = config; return original(config); });
  const onSelect = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCharacterPickerOverlay isDark={false} onSelect={onSelect} onClose={jest.fn()} />); });
  const first = tree.root.findAllByProps({ testID: 'hero-character-picker-protagonist-1' })[0];
  const { width, height } = first.props.style;
  const preview = () => tree.root.findAllByProps({ testID: 'hero-picker-preview-frame-protagonist-1' })[0];
  const previewSize = { ...preview().props.style };
  const source = tree.root.findAllByProps({ testID: 'hero-picker-image-protagonist-1' })[0].props.source;
  const position = () => tree.root.findAllByProps({ testID: 'hero-picker-position-protagonist-1' })[0].props.style;
  const expectOriginalSize = () => {
    expect(tree.root.findAllByProps({ testID: 'hero-character-picker-protagonist-1' })[0].props.style).toMatchObject({ width, height });
    expect(position()).toMatchObject({ width, height, flexShrink: 0 });
    expect(position().transform.map((value: object) => Object.keys(value))).toEqual([['translateX']]);
    expect(preview().props.style).toEqual(previewSize);
    expect(tree.root.findAllByProps({ testID: 'hero-picker-image-protagonist-1' })[0].props.source).toBe(source);
  };
  act(() => first.props.onLongPress({ nativeEvent: { pageX: 100 } }));
  act(() => { handlers.onPanResponderGrant?.({} as never, {} as never); });
  act(() => { handlers.onPanResponderMove?.({} as never, { moveX: 100 + (first.props.style.width + 10) * 2 } as never); });
  expectOriginalSize();
  act(() => { handlers.onPanResponderRelease?.({} as never, {} as never); });
  expectOriginalSize();
  expect(position().transform[0].translateX.__getValue()).toBe(0);
  act(() => first.props.onPress());
  expect(onSelect).not.toHaveBeenCalled();
  expect(readHeroCharacterOrder().slice(0, 3)).toEqual(['protagonist-2', 'protagonist-3', 'protagonist-1']);
  for (const cancel of [true, false]) {
    const card = tree.root.findAllByProps({ testID: 'hero-character-picker-protagonist-1' })[0];
    act(() => card.props.onLongPress({ nativeEvent: { pageX: 100 } }));
    act(() => handlers.onPanResponderGrant?.({} as never, {} as never));
    act(() => handlers.onPanResponderMove?.({} as never, { moveX: cancel ? 100 - width - 10 : 100 } as never));
    expectOriginalSize();
    act(() => (cancel ? handlers.onPanResponderTerminate : handlers.onPanResponderRelease)?.({} as never, {} as never));
    expectOriginalSize();
    expect(position().transform[0].translateX.__getValue()).toBe(0);
  }
  act(() => tree.unmount());
  act(() => { tree = create(<HeroCharacterPickerOverlay isDark={false} onSelect={onSelect} onClose={jest.fn()} />); });
  const scroll = tree.root.findAllByProps({ testID: 'hero-character-picker-scroll' })[0];
  const cards = scroll.props.children.flat();
  expect(cards[0].key).toBe('protagonist-2');
  expect(cards.some((card: { props?: { testID?: string } }) => card.props?.testID === 'hero-character-picker-upcoming')).toBe(false);
  act(() => tree.unmount());
  spy.mockRestore();
});


it('preserves the home card frame while the AI workspace changes the parent height', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const scene = newComicScene('Stable card');
  const diary = { id: 'stable-workspace-frame', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [scene], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  const request = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next; });
  const cancel = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) frames.delete(id); });
  const flush = () => act(() => { for (let i = 0; i < 4; i++) { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); } });
  const { HeroCardStack } = require('./HeroCardStack');
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
    const layout = (height: number) => act(() => tree.root.findAllByProps({ testID: 'comic-scene-deck' })[0].props.onLayout({ nativeEvent: { layout: { width: 390, height } } }));
    layout(650); flush();
    const original = tree.root.findByType(HeroCardStack).props.cardHeight;
    await act(async () => ref.current!.openPhotoEntry());
    layout(800); flush();
    expect(tree.root.findByType(HeroCardStack).props.cardHeight).toBe(original);
    expect(tree.root.findByType(HeroCardStack).props.enabled).toBe(false);
    act(() => ref.current!.openSceneEntry()); flush();
    expect(tree.root.findByType(HeroCardStack).props.cardHeight).toBe(original);
    expect(tree.root.findByType(HeroCardStack).props.enabled).toBe(true);
  } finally {
    act(() => tree?.unmount()); request.mockRestore(); cancel.mockRestore();
  }
});

it.each(['protagonist-1', 'protagonist-6'])('shows the new chooser for an existing zero-card diary and reuses it for %s', async characterId => {
  const empty = { id: 'existing-empty-today', title: '내가 지은 제목', characterId: COMIC_CHARACTERS[0].id, characterName: '기존 이름', scenes: [], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 0 };
  const history = { ...empty, id: 'history-to-keep', createdAt: new Date(2026, 9, 20, 8).getTime(), scenes: [newComicScene('이전 기록')] };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [empty, history], activeId: empty.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', empty.id);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-today-chooser' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-random-title' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: `hero-empty-character-${characterId}` })[0].props.onPress());
  const stored = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(stored.diaries).toHaveLength(2);
  const diary = stored.diaries.find(item => item.id === empty.id)!;
  expect(diary).toMatchObject({ id: empty.id, title: empty.title, createdAt: empty.createdAt, characterId });
  expect(diary.scenes).toHaveLength(1);
  expect(stored.diaries.find(item => item.id === history.id)).toEqual(history);
  expect(tree.root.findAllByProps({ testID: 'hero-empty-today-chooser' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('always shows plain guidance even after the previous tutorial was dismissed', async () => {
  localStorageClient.setItemRaw('pokit:hero-info-hint:character:v1', 'done');
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />;
  await act(async () => { tree = create(render()); });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-intro' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-empty-first-use-hint-close' })).toHaveLength(0);
  act(() => tree.unmount());
  await act(async () => { tree = create(render()); });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-intro' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
it('shows plain guidance to a returning user whose Today is empty', async () => {
  saveComicDay('2026-10-21', [newComicScene('이전 기록')]);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-30" ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'hero-empty-intro' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('reuses generated artwork as a fresh blank entry while preserving its original writing and date', async () => {
  const original = { id: 'original-generated', characterId: 'protagonist-6', title: '원본 일기', createdAt: 100000, updatedAt: 100000, scenes: [{ ...newComicScene('원본 제목'), memo: '원본 글', artworkUri: 'file:///Documents/hero-ai/hero-reuse-0.png' }] };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, activeId: null, diaries: [original], migratedLegacyKeys: [] });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findByType(HeroEmptyTodayChooser).props.onChooseGenerated({ uri: original.scenes[0].artworkUri, title: '원본 제목', memo: '원본 글', createdAt: original.createdAt }));
  const stored = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  expect(stored.diaries.find(item => item.id === original.id)).toMatchObject(original);
  const fresh = stored.diaries.find(item => item.id === stored.activeId)!;
  expect(fresh.id).not.toBe(original.id);
  expect(fresh.createdAt).not.toBe(original.createdAt);
  expect(fresh.scenes[0]).toMatchObject({ artworkUri: original.scenes[0].artworkUri, title: '', memo: '' });
  expect(fresh.scenes[0].id).not.toBe(original.scenes[0].id);
  expect(fresh.artworkCollection).toBe('generated');
  expect(useHeroTabArtwork.getState().source).toEqual({ uri: original.scenes[0].artworkUri });
  const loadImages = jest.spyOn(heroAiLibrary, 'loadHeroAiLibrary').mockResolvedValue([{ uri: original.scenes[0].artworkUri }, { uri: 'file:///Documents/hero-ai/hero-next-0.png' }]);
  await act(async () => tree.root.findByType(ComicDayBoard).props.onAdd());
  expect(tree.root.findAllByType(HeroGeneratedArtworkPicker)).toHaveLength(1);
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  act(() => tree.root.findByType(HeroGeneratedArtworkPicker).props.onClose());
  expect(loadComicDay('2026-10-21')).toHaveLength(1);
  await act(async () => tree.root.findByType(ComicDayBoard).props.onAdd());
  act(() => tree.root.findByType(HeroGeneratedArtworkPicker).props.onChoose({ uri: 'file:///Documents/hero-ai/hero-next-0.png' }));
  const added = loadComicDay('2026-10-21');
  expect(added).toHaveLength(2);
  expect(added[1]).toMatchObject({ artworkUri: 'file:///Documents/hero-ai/hero-next-0.png', title: '', memo: '' });
  expect(tree.root.findAllByType(HeroGeneratedArtworkPicker)).toHaveLength(0);
  loadImages.mockRestore();
  expect(tree.root.findAllByProps({ testID: 'hero-detail-change-scene' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});

it('updates and reloads only the selected card font from the scene detail', () => {
  const target = { ...newComicScene('First'), memo: 'Keep memo' };
  const other = { ...newComicScene('Second'), fontId: 'hiMelody' as const };
  saveComicDay('2026-10-21', [target, other]);
  let tree!: ReactTestRenderer;
  const render = () => <IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => tree.root.findByType(ComicDayBoard).props.onOpen(target.id));
  const controls = tree.root.findByType(HeroCardAppearanceControls);
  expect(controls.props.fontsOnly).toBe(true);
  act(() => controls.props.onChange({ fontId: 'cafe24Syongsyong' }));
  const items = tree.root.findByType(ComicDayBoard).props.items;
  expect(items.find((item: { key: string }) => item.key === target.id).fontId).toBe('cafe24Syongsyong');
  expect(items.find((item: { key: string }) => item.key === other.id).fontId).toBe('hiMelody');
  act(() => tree.unmount());
  act(() => { tree = create(render()); });
  const restored = tree.root.findByType(ComicDayBoard).props.items;
  expect(restored.find((item: { key: string }) => item.key === target.id)).toMatchObject({ fontId: 'cafe24Syongsyong', memo: 'Keep memo' });
  expect(restored.find((item: { key: string }) => item.key === other.id).fontId).toBe('hiMelody');
  act(() => tree.unmount());
});


it('persists carousel layout, synchronizes swipes and thumbnails, and switches back to the stack', () => {
  const callbacks = new Map<number, FrameRequestCallback>(); let nextFrame = 0;
  const request = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { const id = ++nextFrame; callbacks.set(id, callback); return id; });
  const cancel = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) callbacks.delete(id); });
  const flush = () => act(() => { for (let i = 0; i < 8 && callbacks.size; i++) { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(callback => callback(0)); } });
  let tree!: ReactTestRenderer;
  try {
    saveHeroCardLayout('carousel');
    expect(loadHeroCardLayout()).toBe('carousel');
    const render = () => <ComicSceneDeck items={[{ key: 'one', label: 'First' }, { key: 'two', label: 'Second' }]} ink="#222" muted="#888" isDark={false} choices={{}} onOpen={jest.fn()} />;
    act(() => { tree = create(render()); });
    act(() => tree.root.findByProps({ testID: 'comic-scene-deck' }).props.onLayout({ nativeEvent: { layout: { width: 390, height: 650 } } }));
    flush();
    expect(tree.root.findAllByProps({ testID: 'comic-card-stack' })).toHaveLength(0);
    const carousel = tree.root.findAllByProps({ testID: 'comic-scene-carousel' })[0];
    act(() => carousel.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: carousel.props.snapToInterval } } }));
    const selectedSecond = () => tree.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Second' && node.props.accessibilityState?.selected === true);
    expect(selectedSecond().length).toBeGreaterThan(0);
    const first = tree.root.findAll(node => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'First' && node.props.accessibilityState?.selected === false)[0];
    act(() => first.props.onPress());
    expect(selectedSecond()).toHaveLength(0);
    act(() => { tree.unmount(); tree = create(render()); });
    flush();
    expect(tree.root.findAllByProps({ testID: 'comic-scene-carousel' }).length).toBeGreaterThan(0);
    act(() => saveHeroCardLayout('stack'));
    expect(tree.root.findAllByProps({ testID: 'comic-scene-carousel' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'comic-card-stack' }).length).toBeGreaterThan(0);
  } finally {
    act(() => tree?.unmount());
    saveHeroCardLayout('stack');
    request.mockRestore(); cancel.mockRestore();
  }
});

it.each([1, 2])('lets the user choose among %s saved original photos without auto-adding any', async count => {
  const images = Array.from({ length: count }, (_, i) => ({ uri: `file:///Documents/hero-photos/photo-${i}-saved.jpg` }));
  const createdAt = new Date(2026, 9, 21, 12).getTime();
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, migratedLegacyKeys: [], activeId: 'photos', diaries: [{ id: 'photos', title: '내 사진', characterId: 'protagonist-1', artworkCollection: 'original', createdAt, updatedAt: createdAt, scenes: [{ ...newComicScene('보존'), artworkUri: images[0].uri }] }] });
  const loadImages = jest.spyOn(originalPhotoLibrary, 'loadHeroOriginalPhotoLibrary').mockResolvedValue(images);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  try {
    await act(async () => tree.root.findByType(ComicDayBoard).props.onAdd());
    expect(tree.root.findByType(HeroGeneratedArtworkPicker).props.images).toEqual(images);
    expect(loadComicDay('2026-10-21')).toHaveLength(1);
    act(() => tree.root.findByType(HeroGeneratedArtworkPicker).props.onClose());
    expect(loadComicDay('2026-10-21')).toHaveLength(1);
    await act(async () => tree.root.findByType(ComicDayBoard).props.onAdd());
    act(() => tree.root.findByType(HeroGeneratedArtworkPicker).props.onChoose(images.at(-1)));
    expect(loadComicDay('2026-10-21')).toHaveLength(2);
    expect(loadComicDay('2026-10-21').at(-1)?.artworkUri).toBe(images.at(-1)!.uri);
  } finally { act(() => tree.unmount()); loadImages.mockRestore(); }
});

it('switches the empty chooser between carousel and grid on repeated taps', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroEmptyTodayChooser ink="#222" muted="#888" isDark={false} onStart={jest.fn()} onPersonalize={jest.fn()} />); });
  const visible = (testID: string) => tree.root.findAllByProps({ testID }).length > 0;
  const toggle = () => tree.root.findAllByProps({ testID: 'hero-empty-layout-toggle' })[0];
  expect(visible('hero-empty-character-rail')).toBe(true);
  expect(visible('hero-empty-character-grid')).toBe(false);
  act(() => toggle().props.onPress());
  expect(toggle().props.accessibilityState.expanded).toBe(true);
  expect(visible('hero-empty-character-grid')).toBe(true);
  expect(visible('hero-empty-character-rail')).toBe(false);
  act(() => toggle().props.onPress());
  expect(visible('hero-empty-character-rail')).toBe(true);
  expect(visible('hero-empty-character-grid')).toBe(false);
  act(() => tree.unmount());
});
