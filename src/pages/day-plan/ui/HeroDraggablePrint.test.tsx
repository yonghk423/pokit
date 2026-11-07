import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { HeroDraggablePrint } from './HeroDraggablePrint';
jest.mock('react-native-gesture-handler', () => {
  const gesture = () => {
    const result: Record<string, any> = {};
    for (const name of ['manualActivation', 'shouldCancelWhenOutside', 'onTouchesDown', 'maxPointers', 'enabled', 'activateAfterLongPress', 'minDistance', 'blocksExternalGesture', 'runOnJS', 'onStart', 'onUpdate', 'onEnd', 'onFinalize']) result[name] = (value: unknown) => { result[`${name}Value`] = value; return result; };
    return result;
  };
  return { Gesture: { Pan: gesture, Native: gesture, Rotation: gesture, Simultaneous: (...gestures: unknown[]) => ({ gestures }) }, GestureDetector: ({ children }: any) => children };
});
it('keeps the same transform before and after a delayed position save', () => {
  const drop = jest.fn();
  const render = (left: number, top: number) => <HeroDraggablePrint left={left} top={top} width={80} boardWidth={400} bottom={800} rotation={0} enabled scrollGesture={Gesture.Native()} dismissGesture={Gesture.Pan()} onActive={jest.fn()} onDrop={drop}><View /></HeroDraggablePrint>;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render(20, 30)); });
  try {
    const handlers = tree.root.findByType(GestureDetector).props.gesture.gestures[1];
    const translation = () => tree.root.findByType(Animated.View).props.style[1].transform.slice(0, 2).map((value: any) => Object.values(value)[0]).map((value: any) => value.__getValue());
    act(() => { handlers.onStartValue(); handlers.onUpdateValue({ translationX: 60, translationY: 90 }); });
    expect(translation()).toEqual([60, 90]);
    act(() => { handlers.onEndValue({}, true); handlers.onFinalizeValue(); });
    expect(drop).toHaveBeenCalledWith(80, 120);
    expect(translation()).toEqual([60, 90]);
    act(() => { tree.update(render(20, 30)); });
    expect(translation()).toEqual([60, 90]);
    act(() => { tree.update(render(80, 120)); });
    expect(translation()).toEqual([60, 90]);
  } finally { act(() => tree.unmount()); }
});

it('rotates with two fingers and holds the angle until the saved rotation commits', () => {
  const rotate = jest.fn();
  const render = (rotation: number) => <HeroDraggablePrint left={20} top={30} width={80} boardWidth={400} bottom={800} rotation={rotation} enabled scrollGesture={Gesture.Native()} dismissGesture={Gesture.Pan()} onActive={jest.fn()} onDrop={jest.fn()} onRotate={rotate}><View /></HeroDraggablePrint>;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render(10)); });
  try {
    const handlers = tree.root.findByType(GestureDetector).props.gesture.gestures[0];
    const angle = () => tree.root.findByType(Animated.View).props.style[1].transform[2].rotate.__getValue();
    act(() => { handlers.onStartValue(); handlers.onUpdateValue({ rotation: Math.PI / 4 }); });
    act(() => { handlers.onEndValue({}, true); handlers.onFinalizeValue(); });
    expect(rotate).toHaveBeenCalledWith(55);
    expect(parseFloat(angle())).toBeCloseTo(45);
    act(() => tree.update(render(55)));
    expect(parseFloat(angle())).toBeCloseTo(45);
  } finally { act(() => tree.unmount()); }
});

it('allows rotation to take over an active drag without the pan finalizer resetting it', () => {
  const drop = jest.fn(), rotate = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroDraggablePrint left={20} top={30} width={80} boardWidth={400} bottom={800} rotation={10} enabled scrollGesture={Gesture.Native()} dismissGesture={Gesture.Pan()} onActive={jest.fn()} onDrop={drop} onRotate={rotate}><View /></HeroDraggablePrint>); });
  try {
    const [rotation, pan] = tree.root.findByType(GestureDetector).props.gesture.gestures;
    act(() => {
      pan.onStartValue();
      pan.onUpdateValue({ translationX: 40, translationY: 50, numberOfPointers: 1 });
      rotation.onStartValue();
      pan.onEndValue({}, true);
      pan.onFinalizeValue();
      pan.onUpdateValue({ translationX: 100, translationY: 100, numberOfPointers: 2 });
      rotation.onUpdateValue({ rotation: Math.PI / 6 });
      rotation.onEndValue({}, true);
      rotation.onFinalizeValue();
    });
    expect(drop).toHaveBeenCalledTimes(1);
    expect(drop).toHaveBeenCalledWith(60, 80);
    expect(rotate.mock.calls[0][0]).toBeCloseTo(40);
  } finally { act(() => tree.unmount()); }
});
