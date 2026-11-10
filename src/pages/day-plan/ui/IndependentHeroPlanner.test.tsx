jest.mock('./HeroPolaroidEditor', () => ({ HeroPolaroidEditor: jest.requireActual('react-native').View }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn(), UIImagePickerPresentationStyle: { FULL_SCREEN: 'fullScreen' } }));
import { launchImageLibraryAsync } from 'expo-image-picker';
jest.mock('../lib/heroPremiumPack', () => ({ PREMIUM_CHARACTER_ID: 'protagonist-7', premiumSceneTitle: () => '햇살 아래 버스 정류장', loadPremiumPack: jest.fn(async () => []), loadPremiumPackPreview: jest.fn(async () => ({ files: [{ url: 'https://example.com/cover.webp' }] })), downloadPremiumPack: jest.fn(async () => [{ id: 'p7-01', uri: 'file:///pack/p7-01.webp' }]) }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ selectIsPro: () => false, useSubscriptionStore: (selector: (state: object) => unknown) => selector({}) }));
jest.mock('../../settings/ui/ProPreviewPage', () => ({ ProPreviewPage: () => null }));
import * as heroAiClient from '../lib/heroAiClient';
import * as originalPhotoLibrary from '../lib/heroOriginalPhoto';
import { saveHeroCardLayout, loadHeroCardLayout } from '../model/heroCardLayout';
import { ComicSceneDeck } from './HeroSceneDeck';
import { HeroCardAppearanceControls } from './HeroCardAppearanceControls';
import * as heroAiLibrary from '../lib/heroAiLibrary';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { HeroGeneratedArtworkPicker } from './HeroGeneratedArtworkPicker';
import { ComicSceneImage } from './HeroSceneImage';
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
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { COMIC_SCENES } from '../lib/heroSceneImages';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { ComicScenePicker } from './HeroScenePicker';
import { createRef, useState } from 'react';
import { HeroCalendarBackground } from './HeroCalendarBackground';
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
    for (const name of ['manualActivation', 'shouldCancelWhenOutside', 'onTouchesDown', 'maxPointers', 'minDistance', 'blocksExternalGesture', 'onUpdate', 'onFinalize', 'enabled', 'activeOffsetY', 'failOffsetX', 'onEnd', 'onBegin', 'onStart', 'minDuration', 'maxDistance', 'activateAfterLongPress', 'runOnJS']) gesture[name] = (value: unknown) => { gesture[`${name}Value`] = value; return gesture; };
    return gesture;
  };
  return { ScrollView: jest.requireActual('react-native').ScrollView, GestureDetector: ({ children }: { children: unknown }) => children, Gesture: { Rotation: chain, Race: (...gestures: unknown[]) => ({ gestures }), Pan: chain, LongPress: chain, Native: chain, Simultaneous: (...gestures: unknown[]) => ({ gestures }) } };
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
  act(() => tree.root.findByType(ComicScenePicker).props.onSelectScene(COMIC_CHARACTERS.find(character => character.id === 'protagonist-6')!.scenes[1].id));
  const board = tree.root.findByType(ComicDayBoard);
  expect(board.props.items).toHaveLength(2);
  expect(board.props.items[0].memo).toBe('보존할 내용');
  expect(board.props.character.id).toBe('protagonist-6');
  expect(tree.root.findAllByType(ComicScenePicker)).toHaveLength(0);
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



it('returns from the camera to the diary without opening the photo upload form', async () => {
  const ref = createRef<ComicDiaryHandle>();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  await act(async () => ref.current!.openPhotoEntry());
  expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(true);
  act(() => ref.current!.openSceneEntry());
  expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(false);
  act(() => ref.current!.openSceneEntry());
  expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(false);
  act(() => tree.unmount());
});

it('lets the diary tab hide a recoverable AI workspace without discarding its job', async () => {
  const pending = { id: 'recoverable-tab-job', story: { source: 'character', text: 'Draft', title: 'Title' }, scenes: ['01-wakeup'], createdAt: Date.now() };
  const getPending = jest.spyOn(heroAiClient, 'getPendingHeroAiJob').mockResolvedValue(pending as never);
  const resume = jest.spyOn(heroAiClient, 'resumeHeroAiJob').mockImplementation(() => new Promise(() => {}));
  const ref = createRef<ComicDiaryHandle>();
  const change = jest.fn();
  let tree!: ReactTestRenderer;
  try {
    await act(async () => { tree = create(<IndependentComicPlanner ref={ref} onPhotoEntryChange={change} date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
    expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(true);
    act(() => ref.current!.openSceneEntry(true));
    expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(false);
    expect(change).toHaveBeenLastCalledWith(false);
    expect(tree.root.findAllByProps({ testID: 'hero-inline-workspace' })[0].props.pointerEvents).toBe('none');
    await act(async () => ref.current!.openPhotoEntry());
    expect(tree.root.findByType(HeroInlineComposer).props.visible).toBe(true);
    expect(tree.root.findByType(HeroInlineComposer).props.recoveryJob.id).toBe(pending.id);
  } finally { if (tree) act(() => tree.unmount()); getPending.mockRestore(); resume.mockRestore(); }
});

it('downloads protagonist 7 from the character overlay and opens its saved scenes', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterPickerOverlay isDark={false} onSelect={jest.fn()} onClose={jest.fn()} onChooseGenerated={jest.fn()} />); });
  const card = () => tree.root.findAllByProps({ testID: 'hero-character-picker-premium' })[0];
  expect(card().props.accessibilityLabel).toBe('주인공6 다운로드');
  await act(async () => { card().props.onPress(); });
  expect(require('../lib/heroPremiumPack').downloadPremiumPack).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByProps({ accessibilityLabel: '햇살 아래 버스 정류장 선택' }).length).toBeGreaterThan(0);
  expect(card().props.accessibilityLabel).toBe('주인공6 선택');
  act(() => tree.unmount());
});

it.each([false, true])('keeps one preview host underneath the native album through selection; cancelled=%s', async (cancelled) => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const scene = newComicScene('내 사진');
  const diary = { id: 'camera-album-diary', title: 'Diary', characterId: COMIC_CHARACTERS[0].id, scenes: [scene], createdAt: new Date(2026, 9, 21, 8).getTime(), updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [diary], activeId: diary.id, migratedLegacyKeys: [] });
  saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', diary.id);
  let finish!: (value: any) => void;
  jest.mocked(launchImageLibraryAsync).mockReset().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} overviewOpen />); });
  const before = tree.root.findByType(ComicDayBoard).props.items;
  let pending!: Promise<void>;
  act(() => { tree.root.findByType(ComicDayBoard).props.onAddPhoto(); });
  const host = tree.root.findAllByProps({ testID: 'hero-camera-import-host' })[0];
  expect(host.props.animationType).toBe('none');
  expect(host.props.transparent).toBe(true);
  expect(host.props.presentationStyle).toBe('overFullScreen');
  expect(tree.root.findAllByProps({ testID: 'hero-camera-import-pending' })[0].props.style.backgroundColor).toBe('#F8F8F4');
  expect(launchImageLibraryAsync).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'hero-camera-import-pending' }).length).toBeGreaterThan(0);
  act(() => { pending = host.props.onShow(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({ mediaTypes: ['images'], allowsEditing: false, presentationStyle: 'fullScreen' }));
  expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
  await act(async () => { tree.root.findByType(ComicDayBoard).props.onAddPhoto(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(cancelled ? { canceled: true, assets: null } : { canceled: false, assets: [{ uri: 'file:///selected.jpg', fileName: 'selected.jpg' }] });
    await pending;
  });
  expect(tree.root.findAllByProps({ testID: 'hero-photo-entry-modal' })).toHaveLength(0);
  if (cancelled) {
    expect(tree.root.findAllByProps({ testID: 'hero-camera-import-host' })).toHaveLength(0);
    expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
  } else {
    expect(tree.root.findByType(HeroInlineComposer).props.initialOriginalPhoto).toEqual({ uri: 'file:///selected.jpg', fileName: 'selected.jpg' });
    expect(tree.root.findByType(HeroInlineComposer).props.initialMode).toBe('original');
    expect(tree.root.findByType(HeroInlineComposer).props.importedPhotoEmbedded).toBe(true);
    expect(tree.root.findAll(node => node.props.embedded === true && node.props.uri === 'file:///selected.jpg').length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: 'hero-camera-import-host' })[0]).toBe(host);
    expect(tree.root.findAllByProps({ testID: 'hero-inline-workspace' })).toHaveLength(0);
    act(() => tree.root.findByType(HeroInlineComposer).props.onClose());
  }
  expect(tree.root.findByType(ComicDayBoard).props.items).toEqual(before);
  act(() => tree.unmount());
});


it('shows the empty main board and camera instead of the retired blank photo composer', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [], activeId: null, migratedLegacyKeys: [] });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} overviewOpen />); });
  try {
    expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
    expect(tree.root.findByType(ComicDayBoard).props.items).toEqual([]);
    expect(tree.root.findAllByProps({ testID: 'hero-duvet-camera' }).length).toBeGreaterThan(0);
    act(() => tree.root.findByType(ComicDayBoard).props.onAddPhoto());
    expect(tree.root.findAllByProps({ testID: 'hero-camera-import-host' }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByType(HeroInlineComposer)).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});

it('renders the interactive home calendar instead of a photo board when supplied', () => {
  const renderCalendar = jest.fn(() => <ThemedTextInput testID="home-calendar-host" />);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-11-09" ink="#222" muted="#888" isDark={false} homeCalendar={renderCalendar} />); });
  expect(renderCalendar).toHaveBeenCalledWith(expect.any(Array));
  expect(tree.root.findAllByType(ComicDayBoard)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'home-calendar-host' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'hero-home-calendar-surface' }).length).toBeGreaterThan(0);
  expect(tree.root.findAllByProps({ testID: 'comic-board-transition' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-calendar-camera' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-duvet-camera' })).toHaveLength(0);
  act(() => tree.unmount());
});

it('saves camera writing to the selected calendar day without mixing another day’s photos', async () => {
  useServiceTutorial.setState({ ...initialServiceProgress, active: false, step: 'finish', completed: ['comic', 'rhythm'] });
  const old = { id: 'older-photo-diary', date: '2026-11-01', title: 'Older', artworkCollection: 'original', characterId: COMIC_CHARACTERS[0].id, scenes: [{ ...newComicScene('Older photo'), artworkUri: 'file:///Documents/hero-photos/photo-old.jpg' }], createdAt: 1, updatedAt: 1 };
  localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { version: 1, diaries: [old], activeId: null, migratedLegacyKeys: [] });
  const ref = createRef<ComicDiaryHandle>();
  const saved = jest.fn();
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<IndependentComicPlanner ref={ref} date="2026-11-02" ink="#222" muted="#888" isDark={false} onDiarySaved={saved} homeCalendar={() => null} />); });
  await act(async () => ref.current!.openPhotoEntry());
  await act(async () => tree.root.findByType(HeroInlineComposer).props.onApply({ title: 'November memory', memo: 'Writing for November 2' }, 'file:///Documents/hero-photos/photo-new.jpg'));
  const library = localStorageClient.getJson<DiaryState>(COMIC_DIARY_STORAGE_KEY)!;
  const created = library.diaries.find(diary => diary.id !== old.id)!;
  expect(created.date).toBe('2026-11-02');
  expect(created.scenes[0]).toMatchObject({ title: 'November memory', memo: 'Writing for November 2', artworkUri: 'file:///Documents/hero-photos/photo-new.jpg' });
  expect(library.diaries.find(diary => diary.id === old.id)?.scenes).toEqual(old.scenes);
  expect(saved).toHaveBeenCalledTimes(1);
  const uri = 'file:///Documents/hero-photos/photo-new.jpg';
  const imageSize = jest.spyOn(require('react-native').Image, 'getSize').mockImplementation((_uri: unknown, success: unknown) => {
    if (typeof success === 'function') success(320, 240);
    return Promise.resolve({ width: 320, height: 240 });
  });
  await act(async () => tree.update(<IndependentComicPlanner ref={ref} date="2026-11-02" ink="#222" muted="#888" isDark={false} pendingPrintUri={uri} />));
  expect(tree.root.findAllByType(ComicDayBoard).every(board => board.props.items.every((item: { artworkUri?: string }) => item.artworkUri !== uri))).toBe(true);
  await act(async () => tree.update(<IndependentComicPlanner ref={ref} date="2026-11-02" ink="#222" muted="#888" isDark={false} />));
  expect(tree.root.findAllByType(ComicDayBoard).some(board => board.props.items.some((item: { artworkUri?: string }) => item.artworkUri === uri))).toBe(true);
  act(() => tree.unmount());
  imageSize.mockRestore();
});

it('opens a calendar date on the first tap without a card transition intercepting it', () => {
  function CalendarHome() {
    const [day, setDay] = useState('2026-11-09');
    const [calendar, setCalendar] = useState(true);
    return <IndependentComicPlanner date={day} ink="#222" muted="#888" isDark={false} homeCalendar={calendar ? diaries => <HeroCalendarBackground date={new Date(2026, 10, 9, 12)} month={new Date(2026, 10, 1, 12)} diaries={diaries} isDark={false} onSelectDate={value => { setDay(value); setCalendar(false); }} /> : undefined} onDateChange={changed} />;
  }
  const changed = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarHome />); });
  try {
    const surface = tree.root.findAllByProps({ testID: 'hero-home-calendar-surface' })[0];
    expect(surface.props.pointerEvents).toBe('auto');
    act(() => tree.root.findAllByProps({ testID: 'home-calendar-day-2026-11-02' })[0].props.onPress());
    expect(changed).toHaveBeenLastCalledWith('2026-11-02');
    expect(tree.root.findAllByProps({ testID: 'hero-home-calendar-surface' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'comic-board-transition' }).length).toBeGreaterThan(0);
  } finally { act(() => tree.unmount()); }
});

it('passes deletion to the main card editor and waits for confirmation', () => {
  const target = { ...newComicScene('Delete me') };
  saveComicDay('2026-10-21', [target]);
  const alert = jest.spyOn(Alert, 'alert');
  const Actions = require('./HeroImageActions').HeroImageActions;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<IndependentComicPlanner date="2026-10-21" ink="#222" muted="#888" isDark={false} />); });
  try {
    act(() => tree.root.findByType(ComicDayBoard).props.onOpen(target.id));
    const editor = tree.root.findAllByType(Actions).find(node => node.props.editorOnly)!;
    expect(typeof editor.props.onDelete).toBe('function');
    act(() => editor.props.onDelete());
    expect(alert).toHaveBeenCalled();
    expect(tree.root.findByType(ComicDayBoard).props.items.some((item: { key: string }) => item.key === target.id)).toBe(true);
  } finally { act(() => tree.unmount()); alert.mockRestore(); }
});
