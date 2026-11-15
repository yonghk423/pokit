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

it('opens a square polaroid overlay above the panel and toggles it without removing settings', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidToolbox effects={{ film: 'warm' }} thumbnails={{ warm: 'data:image/jpeg;base64,warm' }} onChange={jest.fn()} />); });
  const field = (testID: string) => tree.root.findByProps({ testID });
  expect(field('polaroid-film-overlay').props.pointerEvents).toBe('none');
  act(() => field('polaroid-tool-film').props.onPress());
  expect(field('polaroid-film-overlay').props.pointerEvents).toBe('auto');
  expect(field('polaroid-film-overlay').props.style).toEqual(expect.objectContaining({ position: 'absolute', bottom: '100%' }));
  expect(field('polaroid-select-warm').props.style.borderRadius).toBe(0);
  for (const id of ['polaroid-tool-fade', 'polaroid-tool-grain', 'polaroid-reset-all']) expect(field(id)).toBeDefined();
  expect(field('polaroid-slider-space').props.style.height).toBe(44);
  act(() => field('polaroid-tool-film').props.onPress());
  expect(field('polaroid-film-overlay').props.pointerEvents).toBe('none');
  act(() => tree.unmount());
});
