import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Animated } from 'react-native';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HERO_CHARACTER_NAME_HINT_KEY, isHeroCharacterNameHintPending } from '@shared/lib/storage/heroCharacterNameHintStorage';
import { HeroCharacterNameButton } from './HeroCharacterNameButton';

jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
const loop = { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
beforeEach(() => {
  jest.clearAllMocks();
  localStorageClient.setItemRaw(HERO_CHARACTER_NAME_HINT_KEY, 'pending');
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(Animated, 'loop').mockReturnValue(loop);
});
afterEach(() => {
  jest.restoreAllMocks();
  localStorageClient.removeItem(HERO_CHARACTER_NAME_HINT_KEY);
});
it('repeats until the name is pressed, opens editing, and stays stopped after remount', async () => {
  let tree!: ReactTestRenderer;
  const onPress = jest.fn();
  await act(async () => { tree = create(<HeroCharacterNameButton name="Mia" ink="#202020" onPress={onPress} />); });
  expect(loop.start).toHaveBeenCalledTimes(1);
  act(() => tree.root.findAllByProps({ testID: 'comic-character-name-button' })[0].props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(loop.stop).toHaveBeenCalled();
  expect(isHeroCharacterNameHintPending()).toBe(false);
  act(() => tree.unmount());
  await act(async () => { tree = create(<HeroCharacterNameButton name="서연" ink="#202020" onPress={onPress} />); });
  expect(loop.start).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
it('stops on hidden tabs and resumes only while the name is still undiscovered', async () => {
  let tree!: ReactTestRenderer;
  const render = (enabled: boolean) => <HeroCharacterNameButton name="Mia" ink="#202020" onPress={() => undefined} enabled={enabled} />;
  await act(async () => { tree = create(render(false)); });
  expect(loop.start).not.toHaveBeenCalled();
  await act(async () => tree.update(render(true)));
  expect(loop.start).toHaveBeenCalledTimes(1);
  act(() => tree.update(render(false)));
  expect(loop.stop).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
it('keeps the underline still when the system requests reduced motion', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroCharacterNameButton name="Mia" ink="#202020" onPress={() => undefined} />); });
  expect(loop.start).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
