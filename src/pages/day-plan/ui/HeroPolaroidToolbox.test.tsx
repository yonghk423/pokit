import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPolaroidToolbox } from './HeroPolaroidToolbox';

it('opens the adjustment panel on touch down before release', () => {
  let tree!: ReactTestRenderer;
  const onChange = jest.fn();
  act(() => { tree = create(<HeroPolaroidToolbox effects={{}} onChange={onChange} />); });
  act(() => tree.root.findByProps({ testID: 'polaroid-tool-brightness' }).props.onPressIn());
  expect(tree.root.findAllByProps({ testID: 'polaroid-adjustment-panel' }).length).toBeGreaterThan(0);
  expect(tree.root.findByProps({ testID: 'polaroid-tool-brightness' }).props.accessibilityState.selected).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  act(() => tree.root.findByProps({ testID: 'polaroid-tool-contrast' }).props.onPressIn());
  expect(tree.root.findByProps({ testID: 'polaroid-tool-contrast' }).props.accessibilityState.selected).toBe(true);
  act(() => tree.unmount());
});
