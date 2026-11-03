import { useContext } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroCharacterPickerActionContext, HeroCharacterPickerActionProvider } from './heroCharacterPickerAction';

it('keeps the camera action separate and preserves it when the selected mode changes', () => {
  let actions!: NonNullable<React.ContextType<typeof HeroCharacterPickerActionContext>>;
  function Consumer() { actions = useContext(HeroCharacterPickerActionContext)!; return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCharacterPickerActionProvider><Consumer /></HeroCharacterPickerActionProvider>); });
  const character = jest.fn();
  const camera = jest.fn();
  act(() => { actions.register(character); actions.registerPhoto(camera); actions.openPhoto(); });
  expect(camera).toHaveBeenCalledTimes(1);
  expect(character).not.toHaveBeenCalled();
  act(() => { actions.setPhotoActive(true); });
  expect(actions.photoActive).toBe(true);
  act(() => { actions.open(); actions.openPhoto(); });
  expect(character).toHaveBeenCalledTimes(1);
  expect(camera).toHaveBeenCalledTimes(2);
  act(() => { actions.registerPhoto(null); actions.openPhoto(); tree.unmount(); });
  expect(camera).toHaveBeenCalledTimes(2);
});

it('queues camera entry from another tab until the destination registers after focus', () => {
  let actions!: NonNullable<React.ContextType<typeof HeroCharacterPickerActionContext>>;
  function Consumer() { actions = useContext(HeroCharacterPickerActionContext)!; return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCharacterPickerActionProvider><Consumer /></HeroCharacterPickerActionProvider>); });
  const inactiveCamera = jest.fn(), focusedCamera = jest.fn();
  act(() => { actions.registerPhoto(inactiveCamera); actions.openPhoto(true); });
  expect(inactiveCamera).not.toHaveBeenCalled();
  act(() => { actions.registerPhoto(null); actions.registerPhoto(focusedCamera); });
  expect(focusedCamera).toHaveBeenCalledTimes(1);
  act(() => { actions.registerPhoto(focusedCamera); });
  expect(focusedCamera).toHaveBeenCalledTimes(1);
  act(() => { actions.openPhoto(); });
  expect(focusedCamera).toHaveBeenCalledTimes(2);
  act(() => tree.unmount());
});

it('retains a camera request made before the lazy main tab mounts', () => {
  let actions!: NonNullable<React.ContextType<typeof HeroCharacterPickerActionContext>>;
  function Consumer() { actions = useContext(HeroCharacterPickerActionContext)!; return null; }
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCharacterPickerActionProvider><Consumer /></HeroCharacterPickerActionProvider>); });
  const camera = jest.fn();
  act(() => { actions.openPhoto(); actions.registerPhoto(camera); });
  expect(camera).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});
