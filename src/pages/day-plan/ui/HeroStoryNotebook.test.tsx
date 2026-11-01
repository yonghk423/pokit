import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroStoryNotebook } from './HeroStoryNotebook';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));

it('waits for layout before focusing and cancels pending focus when leaving the screen', () => {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  const request = jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++next, callback); return next; });
  const cancel = jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) frames.delete(id); });
  const flushFrame = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); };
  const props = { title: '', text: 'keep my draft', ink: '#222', onTitleChange: jest.fn(), onTextChange: jest.fn(), onFocus: jest.fn(), onBlur: jest.fn() };
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroStoryNotebook {...props} autoFocus />); });
  const input = tree.root.findAllByProps({ testID: 'hero-inline-story' })[0];
  const focus = jest.fn();
  input.instance.focus = focus;
  expect(input.props.autoFocus).toBeUndefined();
  act(flushFrame);
  expect(focus).not.toHaveBeenCalled();
  act(() => tree.root.findAllByProps({ testID: 'hero-inline-notebook' })[0].props.onLayout({ nativeEvent: { layout: { width: 300, height: 400 } } }));
  act(flushFrame);
  expect(focus).not.toHaveBeenCalled();
  act(() => tree.update(<HeroStoryNotebook {...props} autoFocus={false} />));
  act(flushFrame);
  expect(focus).not.toHaveBeenCalled();
  act(() => tree.update(<HeroStoryNotebook {...props} autoFocus />));
  act(flushFrame);
  act(flushFrame);
  expect(focus).toHaveBeenCalledTimes(1);
  expect(tree.root.findAllByProps({ testID: 'hero-inline-story' })[0].props.value).toBe('keep my draft');
  act(() => tree.unmount());
  request.mockRestore();
  cancel.mockRestore();
});
