import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { Animated, FlatList, Keyboard, StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { initialServiceProgress, useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ComicSceneImage } from './HeroSceneImage';
import { SELECTABLE_COMIC_CHARACTERS as COMIC_CHARACTERS } from '../lib/heroCharacters';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
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
  expect(onStart).toHaveBeenCalledWith(character, character.name);
  expect(loadComicCharacterName(character.id)).toBe('이전 이름');
  act(() => tree.unmount());
  localStorageClient.removeItem(`pokit:comic-character-name:${character.id}`);
});

it.each([null, 'previous-diary'])('Later starts the next screen once with diary key %s', diaryKey => {
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicReady', diaryKey, runId: null });
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  const render = () => <ComicCharacterChooser requireExplicitChoice onStart={onStart} ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { jest.advanceTimersByTime(32); });
  act(() => { useServiceTutorial.getState().skipStep(); });
  act(() => { jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0][1]).toBeTruthy();
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicPick', completed: [] });
  act(() => { tree.update(render()); });
  act(() => { jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

it('manual start follows the Later path into comicPick and starts only once', () => {
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicCharacter', runId: 'manual' });
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  const render = () => <ComicCharacterChooser requireExplicitChoice onStart={onStart} ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { tree.root.findAllByProps({ testID: `comic-character-cover-${COMIC_CHARACTERS[0].id}` })[0].props.onPress(); });
  act(() => { jest.advanceTimersByTime(32); });
  expect(useServiceTutorial.getState().step).toBe('comicReady');
  act(() => { tree.root.findAll(node => node.props.testID === 'comic-character-start' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  expect(useServiceTutorial.getState().step).toBe('comicPick');
  expect(onStart).toHaveBeenCalledTimes(0);
  act(() => { jest.advanceTimersByTime(700); });
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0]).toHaveLength(2);
  act(() => { tree.update(render()); });
  act(() => { jest.advanceTimersByTime(700); });
  expect(onStart).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
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

it('reserves inline tutorial space below the cards instead of covering them', () => {
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicCharacter', runId: 'inline-choice-guide' });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser requireExplicitChoice onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-inline-guide' }).length).toBeGreaterThan(0);
  const stage = tree.root.findAllByProps({ testID: 'comic-character-casting' })[0];
  expect(stage.findAllByProps({ testID: 'comic-character-inline-guide' })).toHaveLength(0);
  act(() => { tree.unmount(); });
});

it('keeps artwork, character choices and guidance mounted when the keyboard opens', () => {
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
  expect(tree.root.findAllByProps({ testID: 'comic-character-inline-guide' }).length).toBeGreaterThan(0);
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
  expect(StyleSheet.flatten(strip.props.style).width).toBe('100%');
  const thumbnail = lane.findByType(FlatList).props.renderItem({ item: lane.findByType(FlatList).props.data[0], index: 0 });
  expect(StyleSheet.flatten(thumbnail.props.style).padding).toBe(0);
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

it('places the upcoming protagonist in a non-overlapping horizontal list and gives feedback without selecting it', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const stage = tree.root.findAllByProps({ testID: 'comic-character-casting' })[0];
  const upcoming = stage.findAllByProps({ testID: 'comic-character-coming-soon' })[0];
  expect(tree.root.findAllByProps({ testID: 'comic-character-coming-soon' }).filter(node => node.type === upcoming.type)).toHaveLength(1);
  expect(upcoming.props.accessibilityState.disabled).toBe(true);
  const selectedBefore = tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' })[0].props.accessibilityState.selected;
  act(() => upcoming.props.onPress());
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-protagonist-1' })[0].props.accessibilityState.selected).toBe(selectedBefore);
  expect(upcoming.findByType(ComicSceneImage).props.imageKey).toBe('upcoming:coffee-walk');
  expect(StyleSheet.flatten(upcoming.props.style).position).not.toBe('absolute');
  expect(StyleSheet.flatten(upcoming.props.style).transform).toBeUndefined();
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
