import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { initialServiceProgress, useServiceTutorial } from '../../welcome-intro/model/serviceTutorial';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { loadComicCharacterName, saveComicCharacterName } from '../lib/heroCharacterName';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: () => null }));
jest.mock('../../welcome-intro/ui/ServiceTutorialTarget', () => ({ ServiceTutorialTarget: jest.requireActual('react-native').View }));

beforeEach(() => { jest.useFakeTimers(); useServiceTutorial.setState(initialServiceProgress); });
afterEach(() => { useServiceTutorial.setState(initialServiceProgress); jest.useRealTimers(); });

it('changes the main artwork from the vertical rail and starts the character being previewed', () => {
  const onStart = jest.fn();
  const character = COMIC_CHARACTERS[1];
  const scene = character.preview[0];
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<ComicCharacterChooser onStart={onStart} ink="#222" muted="#888" isDark={false} />); });
  const rail = tree.root.findAllByProps({ testID: `comic-character-thumbnails-${character.id}` })[0];
  expect(rail.props.showsVerticalScrollIndicator).toBe(false);
  const thumbnail = tree.root.findAllByProps({ testID: `comic-character-thumbnail-${character.id}-${scene.id}` })[0];
  act(() => { thumbnail.props.onPress(); });
  const main = tree.root.findAllByProps({ testID: `comic-character-cover-${character.id}` })[0];
  expect(main.findByType(ComicSceneImage).props.imageKey).toBe(`${character.id}:${scene.id}:960`);
  expect(onStart).not.toHaveBeenCalled();
  act(() => { tree.root.findAllByProps({ testID: `comic-character-thumbnail-${character.id}-cover` })[0].props.onPress(); });
  expect(main.findByType(ComicSceneImage).props.imageKey).toBe(`${character.id}:cover:960`);
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0].props.onPress(); });
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
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.rename' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  const input = tree.root.findAllByType(ThemedTextInput)[0];
  expect(input.props.value).toBe(character.name);
  act(() => { input.props.onChangeText('이번 일기의 이름'); });
  act(() => { tree.root.findAllByType(ThemedTextInput)[0].props.onSubmitEditing(); });
  const start = () => tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0];
  act(() => { start().props.onPress(); });
  expect(onStart).toHaveBeenLastCalledWith(character, '이번 일기의 이름');
  expect(loadComicCharacterName(character.id)).toBe('이전 일기의 이름');
  act(() => { tree.unmount(); });
  act(() => { tree = create(render()); });
  act(() => { start().props.onPress(); });
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
  act(() => { jest.advanceTimersByTime(32); });
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0][1]).toBeTruthy();
  expect(useServiceTutorial.getState()).toMatchObject({ active: true, step: 'comicPick', completed: [] });
  act(() => { tree.update(render()); });
  act(() => { jest.advanceTimersByTime(32); });
  expect(onStart).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});

it('manual start follows the Later path into comicPick and starts only once', () => {
  useServiceTutorial.setState({ active: true, mode: 'comic', step: 'comicCharacter', runId: 'manual' });
  const onStart = jest.fn();
  let tree!: ReactTestRenderer;
  const render = () => <ComicCharacterChooser requireExplicitChoice onStart={onStart} ink="#222" muted="#888" isDark={false} />;
  act(() => { tree = create(render()); });
  act(() => { tree.root.findAllByType(ThemedTextInput)[1].props.onChangeText('123'); });
  expect(useServiceTutorial.getState().step).toBe('comicReady');
  act(() => { tree.root.findAll(node => node.props.accessibilityLabel === 'comicDay.character.startWithName' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  expect(useServiceTutorial.getState().step).toBe('comicPick');
  expect(onStart).toHaveBeenCalledTimes(0);
  act(() => { jest.advanceTimersByTime(64); });
  expect(onStart).toHaveBeenCalledTimes(1);
  expect(onStart.mock.calls[0]).toHaveLength(2);
  act(() => { tree.update(render()); });
  act(() => { jest.advanceTimersByTime(64); });
  expect(onStart).toHaveBeenCalledTimes(1);
  act(() => { tree.unmount(); });
});
