import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import { useSettledDeckLayout, type DeckSize } from './useSettledDeckLayout';

const initial = { width: 390, height: 650 };
const remember = jest.fn<void, [DeckSize]>();
function Probe() {
  const { size, updateSize } = useSettledDeckLayout(initial, remember);
  return <View onLayout={event => updateSize(event.nativeEvent.layout.width, event.nativeEvent.layout.height)}><Text>{`${size.width}:${size.height}`}</Text></View>;
}
let nextId = 0;
const frames = new Map<number, FrameRequestCallback>();
const frame = () => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); });
beforeEach(() => {
  frames.clear(); remember.mockClear();
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation(callback => { const id = ++nextId; frames.set(id, callback); return id; });
  jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(id => { if (id != null) frames.delete(id); });
});
afterEach(() => jest.restoreAllMocks());

it('keeps the last geometry through hidden and transient layouts when a tab returns', () => {
  let tree!: ReactTestRenderer;
  const render = (focused: boolean) => <DayPlanTabFocusContext.Provider value={focused}><Probe /></DayPlanTabFocusContext.Provider>;
  act(() => { tree = create(render(true)); });
  frame(); frame(); remember.mockClear();
  const layout = (width: number, height: number) => act(() => tree.root.findByType(View).props.onLayout({ nativeEvent: { layout: { width, height } } }));
  const visible = () => tree.root.findByType(Text).props.children;
  act(() => tree.update(render(false)));
  layout(0, 0); layout(390, 100);
  frame(); frame();
  expect(visible()).toBe('390:650');
  expect(remember).not.toHaveBeenCalled();
  act(() => tree.update(render(true)));
  frame();
  layout(390, 650);
  frame();
  expect(visible()).toBe('390:650');
  frame();
  expect(remember).toHaveBeenLastCalledWith(initial);
  expect(remember.mock.calls).not.toContainEqual([{ width: 390, height: 100 }]);
  act(() => tree.unmount());
});

it('commits a real resize after two stable frames and ignores zero-sized detach events', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<Probe />); });
  frame(); frame();
  act(() => tree.root.findByType(View).props.onLayout({ nativeEvent: { layout: { width: 650, height: 390 } } }));
  frame();
  expect(tree.root.findByType(Text).props.children).toBe('390:650');
  frame();
  expect(tree.root.findByType(Text).props.children).toBe('650:390');
  act(() => tree.root.findByType(View).props.onLayout({ nativeEvent: { layout: { width: 0, height: 0 } } }));
  frame(); frame();
  expect(tree.root.findByType(Text).props.children).toBe('650:390');
  act(() => tree.unmount());
});

it('keeps the visible geometry when a tab returns without emitting another layout event', () => {
  let tree!: ReactTestRenderer;
  const render = (focused: boolean) => <DayPlanTabFocusContext.Provider value={focused}><Probe /></DayPlanTabFocusContext.Provider>;
  act(() => { tree = create(render(true)); });
  frame(); frame();
  act(() => tree.update(render(false)));
  act(() => tree.root.findByType(View).props.onLayout({ nativeEvent: { layout: { width: 390, height: 1 } } }));
  act(() => tree.update(render(true)));
  frame(); frame();
  expect(tree.root.findByType(Text).props.children).toBe('390:650');
  expect(remember.mock.calls).not.toContainEqual([{ width: 390, height: 1 }]);
  act(() => tree.unmount());
});
