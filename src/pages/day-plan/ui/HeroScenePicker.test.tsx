import { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlatList } from 'react-native';
import { ComicScenePicker } from './HeroScenePicker';
import { ComicSceneSequence, moveComicScene } from './HeroSceneSequence';
import { newComicScene, type ComicDayScene } from '../lib/heroDayStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/ui/completion-radio-button', () => ({ CompletionRadioButton: jest.requireActual('react-native').Pressable }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
afterEach(() => localStorageClient.removeItem('pokit:comic-picker-columns'));
it('connects images in tap order immediately and preserves selection across view changes', () => {
  let tree!: ReactTestRenderer;
  const onChange = jest.fn();
  function Harness() {
    const [scenes, setScenes] = useState<ComicDayScene[]>([]);
    return <ComicScenePicker scenes={scenes} onChange={next => { setScenes(next); onChange(next); }} onClose={jest.fn()} />;
  }
  act(() => { tree = create(<Harness />); });
  const gallery = () => tree.root.findAllByType(FlatList).find(node => node.props.numColumns != null)!;
  const button = (label: string) => tree.root.findAll(node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
  const card = (id: string) => {
    const list = gallery();
    const item = list.props.data.find((entry: { id: string }) => entry.id === id);
    const wrapped = list.props.renderItem({ item, index: list.props.data.indexOf(item) });
    return wrapped.props.children;
  };
  expect(gallery().props.numColumns).toBe(3);
  act(() => { card('23-morning-stretch').props.onToggle('23-morning-stretch'); });
  act(() => { card('05-work').props.onToggle('05-work'); });
  act(() => { card('10-park-walk').props.onToggle('10-park-walk'); });
  const sequence = () => tree.root.findByType(ComicSceneSequence).props.scenes as ComicDayScene[];
  expect(sequence().map(scene => scene.image)).toEqual(['23-morning-stretch', '05-work', '10-park-walk']);
  expect(onChange).toHaveBeenCalledTimes(3);
  for (const [label, columns] of [['comicDay.viewTwo', 2], ['comicDay.viewOne', 1]] as const) {
    act(() => { button(label).props.onPress(); });
    expect(gallery().props.numColumns).toBe(columns);
    expect(card('05-work').props.order).toBe(2);
    expect(sequence().map(scene => scene.image)).toEqual(['23-morning-stretch', '05-work', '10-park-walk']);
  }
  act(() => { card('05-work').props.onToggle('05-work'); });
  expect(sequence().map(scene => scene.image)).toEqual(['23-morning-stretch', '10-park-walk']);
  act(() => { tree.unmount(); tree = create(<Harness />); });
  expect(gallery().props.numColumns).toBe(1);
  act(() => { tree.unmount(); });
});
it('reorders complete scene objects and clamps movement to the sequence boundaries', () => {
  const scenes = [{ ...newComicScene('wake'), memo: 'Keep this note' }, newComicScene('work'), newComicScene('walk')];
  expect(moveComicScene(scenes, 0, 2)).toEqual([scenes[1], scenes[2], scenes[0]]);
  expect(moveComicScene(scenes, 1, -10)).toEqual([scenes[1], scenes[0], scenes[2]]);
  expect(moveComicScene(scenes, 0, 99)[2].memo).toBe('Keep this note');
});
