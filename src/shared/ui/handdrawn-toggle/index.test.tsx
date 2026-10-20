import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HanddrawnToggle } from './index';

it('exposes and toggles the enabled state as a switch', () => {
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HanddrawnToggle checked onChange={onChange} label="Routine enabled" />); });
  const control = () => tree.root.findAll((node) => node.props.accessibilityRole === 'switch' && typeof node.props.onPress === 'function')[0];
  expect(control().props.accessibilityState).toEqual({ checked: true });
  act(() => control().props.onPress());
  expect(onChange).toHaveBeenLastCalledWith(false);
  act(() => tree.update(<HanddrawnToggle checked={false} onChange={onChange} label="Routine disabled" />));
  act(() => control().props.onPress());
  expect(onChange).toHaveBeenLastCalledWith(true);
  act(() => tree.unmount());
});

it('prevents changes while disabled', () => {
  const onChange = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HanddrawnToggle checked disabled onChange={onChange} label="Routine enabled" />); });
  const control = tree.root.findAll((node) => node.props.accessibilityRole === 'switch' && typeof node.props.onPress === 'function')[0];
  expect(control.props.accessibilityState).toEqual({ checked: true, disabled: true });
  expect(control.props.disabled).toBe(true);
  act(() => control.props.onPress());
  expect(onChange).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
