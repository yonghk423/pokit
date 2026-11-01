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
