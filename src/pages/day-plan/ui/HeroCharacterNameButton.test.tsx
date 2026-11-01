import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated } from 'react-native';
import { HeroCharacterNameButton } from './HeroCharacterNameButton';

it('keeps the name action available without the retired tutorial animation', () => {
  const onPress = jest.fn();
  const loop = jest.spyOn(Animated, 'loop');
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCharacterNameButton name="Mia" ink="#202020" onPress={onPress} />); });
  expect(tree.root.findAllByProps({ testID: 'comic-character-name-underline' })).toHaveLength(0);
  expect(loop).not.toHaveBeenCalled();
  act(() => tree.root.findAllByProps({ testID: 'comic-character-name-button' })[0].props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  loop.mockRestore();
});
