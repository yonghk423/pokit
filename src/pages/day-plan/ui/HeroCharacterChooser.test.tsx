import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { type PanResponderCallbacks, type GestureResponderEvent, type PanResponderGestureState, PanResponder, Animated, FlatList, Keyboard, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroSceneThumbnail } from './HeroSceneThumbnail';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { initialServiceProgress, useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ComicSceneImage } from './HeroSceneImage';
import { SELECTABLE_COMIC_CHARACTERS as COMIC_CHARACTERS } from '../lib/heroCharacters';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HERO_CHARACTER_ORDER_KEY, readHeroCharacterOrder } from '../lib/heroCharacterOrder';
import { loadComicCharacterName, saveComicCharacterName } from '../lib/heroCharacterName';

jest.mock('@shared/ui/completion-radio-button', () => ({ CompletionRadioButton: jest.requireActual('react-native').Pressable }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: () => null }));
jest.mock('../../welcome-intro/ui/ServiceTutorialTarget', () => ({ ServiceTutorialTarget: jest.requireActual('react-native').View }));

beforeEach(() => { jest.useFakeTimers(); useServiceTutorial.setState(initialServiceProgress); });
afterEach(() => { useServiceTutorial.setState(initialServiceProgress); jest.useRealTimers(); });

it('casts the chosen character, previews its scenes and starts it once after the transition', () => {
  const onStart = jest.fn();
  const character = COMIC_CHARACTERS[0];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  const select = tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` })[0];
  act(() => { select.props.onPress(); });
  expect(tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` })[0].props.accessibilityState.selected).toBe(true);
  const list = tree.root.findAllByProps({ testID: `comic-character-thumbnail-list-${character.id}` })[0];
  expect(list.props.data.map((image: { id: string }) => image.id)).toEqual(['cover', ...character.scenes.map(scene => scene.id)]);
  const main = tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` })[0];
  expect(main.findByType(ComicSceneImage).props.imageKey).toMatch(new RegExp(`^${character.id}:.*:960$`));
  act(() => { tree.root.findAllByProps({ testID: `comic-character-thumbnail-${character.id}-${character.scenes[0].id}` })[0].props.onPress(); });
  expect(main.findByType(ComicSceneImage).props.imageKey).toBe(`${character.id}:${character.scenes[0].id}:960`);
  expect(tree.root.findAllByProps({ testID: 'comic-character-confirm-check' })[0].props.fill).toBe('#69BFA9');
  const start = tree.root.findAllByProps({ testID: 'comic-character-start' })[0];
  act(() => { start.props.onPress(); start.props.onPress(); });
  expect(onStart).not.toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.disabled).toBe(true);
  act(() => { jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart).toHaveBeenCalledWith(character, character.name);
  act(() => { tree.unmount(); });
});

it('starts without a name input and preserves historical names in storage', () => {
  const character = COMIC_CHARACTERS[0]; const onStart = jest.fn();
  saveComicCharacterName(character.id, '이전 이름');
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  const start = tree.root.findAllByProps({ testID: 'comic-character-start' })[0];
  expect(start.props.disabled).toBe(false);
  act(() => { start.props.onPress(); jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenCalledWith(character, '이전 이름');
  expect(loadComicCharacterName(character.id)).toBe('이전 이름');
  act(() => tree.unmount());
  localStorageClient.removeItem(`pokit:comic-character-name:${character.id}`);
});

it('cancels an unfinished start when the chooser unmounts', () => {
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  act(() => { tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.onPress(); });
  act(() => { tree.unmount(); });
  act(() => { jest.advanceTimersByTime(1000); });
  expect(onStart).not.toHaveBeenCalled();
});

it('does not render the retired tutorial guide in character selection', () => {
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicCharacter', runId: 'inline-choice-guide' });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser requireExplicitChoice onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-inline-guide' })).toHaveLength(0);
  const stage = tree.root.findAllByProps({ testID: 'comic-character-casting' })[0];
  expect(stage.findAllByProps({ testID: 'comic-character-inline-guide' })).toHaveLength(0);
  act(() => { tree.unmount(); });
});

it('keeps artwork and character choices mounted when the keyboard opens', () => {
  const callbacks = new Map<string, () => void>();
  const addListener = Keyboard.addListener.bind(Keyboard);
  const listen = jest.spyOn(Keyboard, 'addListener').mockImplementation((event, callback) => {
    callbacks.set(event, callback as () => void);
    return addListener(event, callback);
  });
  const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(false);
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicCharacter', runId: 'keyboard-preserves-ui' });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser requireExplicitChoice onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  act(() => { (callbacks.get('keyboardWillShow') ?? callbacks.get('keyboardDidShow'))!(); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-content' })[0].props.scrollEnabled).toBe(true);
  for (const character of COMIC_CHARACTERS) {
    expect(tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` }).length).toBeGreaterThan(0);
    expect(tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` }).length).toBeGreaterThan(0);
  }
  expect(tree.root.findAllByProps({ testID: 'comic-character-inline-guide' })).toHaveLength(0);
  act(() => { (callbacks.get('keyboardWillHide') ?? callbacks.get('keyboardDidHide'))!(); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-content' })[0].props.scrollEnabled).toBe(false);
  act(() => { tree.unmount(); });
  listen.mockRestore(); visible.mockRestore();
});

it('loads a horizontal thumbnail strip beneath its corresponding character card after selection', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const content = tree.root.findAllByProps({ testID: 'comic-character-content' })[0];
  expect(content.findAllByType(FlatList)).toHaveLength(0);
  const viewport = tree.root.findAllByProps({ testID: 'comic-character-scroll-viewport' })[0];
  expect(StyleSheet.flatten(viewport.props.style).overflow).toBe('hidden');
  expect(viewport.findAllByProps({ testID: 'comic-character-content' }).length).toBeGreaterThan(0);
  const column = tree.root.findAllByProps({ testID: 'comic-character-column-protagonist-1' })[0];
  expect(column.findAllByType(FlatList)).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: `comic-character-cover-${COMIC_CHARACTERS[0].id}` })[0].props.onPress());
  expect(column.findAllByType(FlatList)).toHaveLength(0);
  const mainCards = tree.root.findAllByProps({ testID: 'comic-character-horizontal-list' })[0];
  expect(mainCards.findAllByType(FlatList)).toHaveLength(0);
  const lane = tree.root.findAllByProps({ testID: 'comic-character-thumbnail-lane' })[0];
  expect(lane.findByType(FlatList).props.horizontal).toBe(true);
  const strip = lane.findAllByProps({ testID: 'comic-character-thumbnails-protagonist-1' })[0];
  expect(StyleSheet.flatten(strip.props.style).position).toBeUndefined();
  expect(StyleSheet.flatten(strip.props.style).width).toBe(5 * 44 + 4 * 8 + 2 * 8);
  expect(StyleSheet.flatten(strip.props.style).alignSelf).toBe('center');
  const thumbnail = lane.findByType(FlatList).props.renderItem({ item: lane.findByType(FlatList).props.data[0], index: 0 });
  expect(thumbnail.type).toBe(HeroSceneThumbnail);
  expect(thumbnail.props.children.props.contentFit).toBe('cover');
  act(() => { tree.unmount(); });
});


it('offers only protagonist 1 and hides all puppy artwork from new diary selection', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-puppy-companion' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-puppy-companion' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});


it('opens personalization without requesting a protagonist name', () => {
  const onStart = jest.fn(), onPersonalize = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} onPersonalize={onPersonalize} ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-card' })[0].props.onPress());
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.disabled).toBe(false);
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.onPress());
  expect(onPersonalize).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-card' }).length).toBeGreaterThan(0);
  expect(onStart).not.toHaveBeenCalled();
  act(() => tree.unmount());
});


it('brings the personal card forward without an extra portrait selector', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const personal = () => tree.root.findAllByProps({ testID: 'hero-personal-card' })[0];
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(1);
  act(() => personal().props.onPress());
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(3);
  expect(personal().props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-selected-icon' })).toHaveLength(0);
  act(() => tree.root.findAllByProps({ testID: `comic-character-cover-${COMIC_CHARACTERS[0].id}` })[0].props.onPress());
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(1);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-selected-icon' })).toHaveLength(0);
  act(() => tree.unmount());
});


it('reveals the chooser only after its measured layout settles', () => {
  const timing = jest.spyOn(Animated, 'timing');
  const entrances = () => timing.mock.calls.filter(([, config]) => config.duration === 180);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const layout = () => tree.root.findAllByProps({ testID: 'comic-character-layout' })[0];
  const opacity = () => StyleSheet.flatten(layout().props.style).opacity.__getValue();
  expect(opacity()).toBe(0);
  act(() => { layout().props.onLayout({ nativeEvent: { layout: { width: 390, height: 600 } } }); });
  act(() => { jest.advanceTimersByTime(100); });
  expect(opacity()).toBe(0);
  act(() => { tree.root.findAllByProps({ testID: 'comic-character-casting' })[0].props.onLayout({ nativeEvent: { layout: { width: 342, height: 300 } } }); });
  act(() => { jest.advanceTimersByTime(300); });
  expect(entrances()).toHaveLength(1);
  // Keyboard/rotation measurements must not restart the entrance.
  act(() => { layout().props.onLayout({ nativeEvent: { layout: { width: 390, height: 450 } } }); });
  expect(entrances()).toHaveLength(1);
  act(() => tree.unmount());
  timing.mockRestore();
});

it('does not show a placeholder protagonist in the horizontal list', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-coming-soon' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-horizontal-list' })[0].props.horizontal).toBe(true);
  act(() => tree.unmount());
});


it('changes the opening artwork between visits without changing it during selection', () => {
  let tree!: ReactTestRenderer;
  const render = () => create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />);
  const artwork = () => tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' })[0].findByType(ComicSceneImage).props.imageKey;
  act(() => { tree = render(); });
  const first = artwork();
  act(() => tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' })[0].props.onPress());
  expect(artwork()).toBe(first);
  act(() => tree.unmount());
  act(() => { tree = render(); });
  expect(artwork()).not.toBe(first);
  act(() => tree.unmount());
});

it('keeps existing diary metadata without displaying a name field', () => {
  const onPersonalize = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onPersonalize={onPersonalize} lockedCharacterName="서연" targetDiaryId="existing" onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const field = (id: string) => tree.root.findAllByProps({ testID: id })[0];
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  act(() => field('hero-personal-card').props.onPress());
  expect(tree.root.findAllByType(ThemedTextInput)).toHaveLength(0);
  act(() => field('comic-character-start').props.onPress());
  expect(onPersonalize).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  act(() => tree.unmount());
});

it('reorders character cards after a hold and drag, saves the order, and suppresses selection', () => {
  localStorageClient.removeItem(HERO_CHARACTER_ORDER_KEY);
  let handlers!: PanResponderCallbacks;
  const pan = jest.spyOn(PanResponder, 'create').mockImplementation(config => {
    handlers = config;
    return { panHandlers: {} };
  });
  let tree!: ReactTestRenderer;
  const render = () => <ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />;
  try {
    act(() => { tree = create(render()); });
    const first = COMIC_CHARACTERS[0];
    const second = COMIC_CHARACTERS[1];
    const column = tree.root.findAllByProps({ testID: `comic-character-column-${first.id}` })[0];
    const { width, height } = StyleSheet.flatten(column.props.style);
    const stride = width + 14;
    const item = () => tree.root.findAllByProps({ testID: `comic-character-horizontal-list-item-${first.id}` })[0];
    const card = () => tree.root.findAllByProps({ testID: `comic-character-cover-${first.id}` })[0];
    act(() => { card().props.onLongPress({ nativeEvent: { pageX: 100 } }); });
    expect(StyleSheet.flatten(item().props.style).transform.at(-1)).toEqual({ scale: 1 });
    expect(tree.root.findAllByProps({ testID: 'comic-character-horizontal-list' })[0].props.scrollEnabled).toBe(false);
    act(() => {
      handlers.onPanResponderGrant?.({} as GestureResponderEvent, {} as PanResponderGestureState);
      handlers.onPanResponderMove?.({} as GestureResponderEvent, { moveX: 100 + stride } as PanResponderGestureState);
    });
    act(() => { handlers.onPanResponderRelease?.({} as GestureResponderEvent, {} as PanResponderGestureState); });
    expect(StyleSheet.flatten(item().props.style).transform).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
    expect(StyleSheet.flatten(tree.root.findAllByProps({ testID: `comic-character-column-${first.id}` })[0].props.style)).toMatchObject({ width, height });
    act(() => { card().props.onPress(); });
    expect(readHeroCharacterOrder().slice(0, 2)).toEqual([second.id, first.id]);
    expect(tree.root.findAllByType(FlatList)).toHaveLength(0);
    act(() => { tree.unmount(); tree = create(render()); });
    const columns = tree.root.findAll(node => typeof node.props.testID === 'string' && node.props.testID.startsWith('comic-character-column-'));
    expect([...new Set(columns.map(node => node.props.testID))].slice(0, 2)).toEqual([`comic-character-column-${second.id}`, `comic-character-column-${first.id}`]);
  } finally {
    act(() => { tree?.unmount(); });
    pan.mockRestore();
    localStorageClient.removeItem(HERO_CHARACTER_ORDER_KEY);
  }
});
