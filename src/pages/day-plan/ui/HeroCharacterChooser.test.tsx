import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import { FlatList, Keyboard, StyleSheet } from 'react-native';
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
  const select = tree.root.findAllByProps({ testID: `comic-character-select-${character.id}` })[0];
  act(() => { select.props.onPress(); });
  expect(tree.root.findAllByProps({ testID: `comic-character-select-${character.id}` })[0].props.accessibilityState.selected).toBe(true);
  const list = tree.root.findAllByProps({ testID: `comic-character-thumbnail-list-${character.id}` })[0];
  expect(list.props.data.map((image: { id: string }) => image.id)).toEqual(['cover', ...character.scenes.map(scene => scene.id)]);
  const main = tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` })[0];
  expect(main.findByType(ComicSceneImage).props.imageKey).toBe(`${character.id}:cover:960`);
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

it('starts each new diary with the default name and keeps edited names local to its draft', () => {
  const character = COMIC_CHARACTERS[0];
  const onStart = jest.fn();
  saveComicCharacterName(character.id, '이전 일기의 이름');
  let tree!: ReactTestRenderer;
  const render = () => <ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  const input = tree.root.findAllByType(ThemedTextInput)[0];
  expect(input.props.value).toBe(character.name);
  act(() => { input.props.onChangeText(''); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.disabled).toBe(true);
  act(() => { input.props.onChangeText('이번 일기의 이름'); });
  act(() => { tree.root.findAllByType(ThemedTextInput)[0].props.onSubmitEditing(); });
  const start = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0];
  act(() => { start().props.onPress(); jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenLastCalledWith(character, '이번 일기의 이름');
  expect(loadComicCharacterName(character.id)).toBe('이전 일기의 이름');
  act(() => { tree.unmount(); });
  act(() => { tree = create(render()); });
  act(() => { start().props.onPress(); jest.advanceTimersByTime(600); });
  expect(onStart).toHaveBeenLastCalledWith(character, character.name);
  act(() => { tree.unmount(); });
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
  act(() => { tree.root.findAllByProps({ testID: `comic-character-select-${COMIC_CHARACTERS[0].id}` })[0].props.onPress(); });
  act(() => { tree.root.findAllByType(ThemedTextInput)[0].props.onChangeText('123'); });
  expect(useServiceTutorial.getState().step).toBe('comicReady');
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0].props.onPress(); });
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

it('dismisses the keyboard on Done without starting or losing the typed name', () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser requireExplicitChoice onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  act(() => { tree.root.findAllByProps({ testID: 'comic-character-name' })[0].props.onChangeText('새 이름'); });
  act(() => { tree.root.findAllByProps({ testID: 'comic-character-name' })[0].props.onSubmitEditing(); });
  expect(dismiss).toHaveBeenCalled();
  expect(tree.root.findAllByProps({ testID: 'comic-character-name' })[0].props.value).toBe('새 이름');
  expect(onStart).not.toHaveBeenCalled();
  act(() => { tree.unmount(); });
  dismiss.mockRestore();
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
    expect(tree.root.findAllByProps({ testID: `comic-character-select-${character.id}` }).length).toBeGreaterThan(0);
  }
  expect(tree.root.findAllByProps({ testID: 'comic-character-inline-guide' }).length).toBeGreaterThan(0);
  act(() => { (callbacks.get('keyboardWillHide') ?? callbacks.get('keyboardDidHide'))!(); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-content' })[0].props.scrollEnabled).toBe(false);
  act(() => { tree.unmount(); });
  listen.mockRestore(); visible.mockRestore();
});

it('renders virtualized thumbnail rails outside the keyboard scroll container', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const content = tree.root.findAllByProps({ testID: 'comic-character-content' })[0];
  expect(content.findAllByType(FlatList)).toHaveLength(0);
  const viewport = tree.root.findAllByProps({ testID: 'comic-character-scroll-viewport' })[0];
  expect(StyleSheet.flatten(viewport.props.style).overflow).toBe('hidden');
  expect(viewport.findAllByProps({ testID: 'comic-character-content' }).length).toBeGreaterThan(0);
  const overlay = viewport.findAllByProps({ testID: 'comic-character-thumbnail-overlay' })[0];
  expect(overlay.findAllByType(FlatList)).toHaveLength(COMIC_CHARACTERS.length);
  act(() => { tree.unmount(); });
});


it('offers only protagonist 1 and hides all puppy artwork from new diary selection', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-select-puppy-companion' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-cover-puppy-companion' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-select-protagonist-1' }).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});


it('requires a name and start before opening personalization and preserves it on return', () => {
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-card' })[0].props.onPress());
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(0);
  expect(tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.disabled).toBe(true);
  act(() => tree.root.findAllByProps({ testID: 'hero-personal-name' })[0].props.onChangeText('서연'));
  act(() => tree.root.findAllByProps({ testID: 'comic-character-start' })[0].props.onPress());
  expect(tree.root.findByType(HeroPersonalizationFlow).props.characterName).toBe('서연');
  expect(tree.root.findAllByType(HeroPersonalizationFlow)).toHaveLength(1);
  act(() => tree.root.findByType(HeroPersonalizationFlow).props.onClose());
  expect(tree.root.findAllByProps({ testID: 'hero-personal-card' }).length).toBeGreaterThan(0);
  expect(onStart).not.toHaveBeenCalled();
  act(() => tree.unmount());
});


it('brings the personal card forward and switches the selected portrait to a photo invitation', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={jest.fn()} ink="#222" muted="#888" isDark={false} />); });
  const personal = () => tree.root.findAllByProps({ testID: 'hero-personal-card' })[0];
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(1);
  act(() => personal().props.onPress());
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(3);
  expect(personal().props.accessibilityState.selected).toBe(true);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-selected-icon' }).length).toBeGreaterThan(0);
  act(() => tree.root.findAllByProps({ testID: `comic-character-select-${COMIC_CHARACTERS[0].id}` })[0].props.onPress());
  expect(StyleSheet.flatten(personal().props.style).zIndex).toBe(1);
  expect(tree.root.findAllByProps({ testID: 'hero-personal-selected-icon' })).toHaveLength(0);
  act(() => tree.unmount());
});
