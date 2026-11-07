import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Animated, useAnimatedValue } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

/** Keep one transform throughout a gesture and persistence; never hand off to layout on release. */
export function HeroDraggablePrint({ children, enabled, scrollGesture, dismissGesture, onActive, onDrop, onRotate, left, top, width, boardWidth, bottom, rotation, anchorLeft, anchorTop, anchorRotation }: {
  children: ReactNode; enabled: boolean;
  scrollGesture: ReturnType<typeof Gesture.Native>; dismissGesture: ReturnType<typeof Gesture.Pan>;
  onActive: (active: boolean) => void; onDrop: (x: number, y: number) => void; onRotate?: (angle: number) => void;
  left: number; top: number; width: number; boardWidth: number; bottom: number; rotation: number;
  anchorLeft?: number; anchorTop?: number; anchorRotation?: number;
}) {
  const initial = useRef({ left, top, rotation }).current;
  const base = { left: anchorLeft ?? initial.left, top: anchorTop ?? initial.top, rotation: anchorRotation ?? initial.rotation };
  const localOffset = (px: number, py: number) => {
    const angle = base.rotation * Math.PI / 180;
    const dx = px - base.left, dy = py - base.top;
    return { x: dx * Math.cos(angle) + dy * Math.sin(angle), y: -dx * Math.sin(angle) + dy * Math.cos(angle) };
  };
  const offset = localOffset(left, top);
  const x = useAnimatedValue(offset.x), y = useAnimatedValue(offset.y), lifted = useAnimatedValue(0);
  const angleValue = useAnimatedValue(rotation - base.rotation);
  const visual = useRef({ left, top, rotation, baseLeft: base.left, baseTop: base.top, baseRotation: base.rotation });
  const active = useRef<'pan' | 'rotation' | null>(null);
  const committed = useRef(false);
  const pending = useRef<{ left: number; top: number; rotation: number } | null>(null);
  const delta = useRef({ x: 0, y: 0, angle: 0 });
  const paint = (px: number, py: number, angle: number) => {
    const next = localOffset(px, py);
    x.setValue(next.x); y.setValue(next.y); angleValue.setValue(angle - base.rotation);
    visual.current = { left: px, top: py, rotation: angle, baseLeft: base.left, baseTop: base.top, baseRotation: base.rotation };
  };
  useLayoutEffect(() => {
    if (active.current) return;
    if (pending.current) {
      const target = pending.current;
      if (Math.abs(target.left - left) > 0.5 || Math.abs(target.top - top) > 0.5 || Math.abs(target.rotation - rotation) > 0.01) return;
      pending.current = null;
    }
    const previous = visual.current;
    if (previous.left === left && previous.top === top && previous.rotation === rotation && previous.baseLeft === base.left && previous.baseTop === base.top && previous.baseRotation === base.rotation) return;
    paint(left, top, rotation);
  });
  const start = (kind: 'pan' | 'rotation') => {
    active.current = kind; committed.current = false; pending.current = null; delta.current = { x: 0, y: 0, angle: 0 };
    tapHaptic('select'); onActive(true);
    Animated.timing(lifted, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  };
  const finish = (kind: 'pan' | 'rotation') => {
    if (active.current !== kind) return;
    if (!committed.current) paint(left, top, rotation);
    active.current = null; onActive(false);
    Animated.timing(lifted, { toValue: 0, duration: 150, useNativeDriver: true }).start();
  };
  const pan = Gesture.Pan().enabled(enabled).activateAfterLongPress(280).minDistance(3)
    .blocksExternalGesture(scrollGesture, dismissGesture).runOnJS(true)
    .onStart(() => start('pan'))
    .onUpdate(event => {
      delta.current.x = Math.max(-left + 4, Math.min(boardWidth - width - left - 4, event.translationX));
      delta.current.y = Math.max(-top + 8, Math.min(bottom - top, event.translationY));
      paint(left + delta.current.x, top + delta.current.y, rotation);
    })
    .onEnd((_event, success) => { if (success) { committed.current = true; pending.current = { left: left + delta.current.x, top: top + delta.current.y, rotation }; onDrop(left + delta.current.x, top + delta.current.y); } })
    .onFinalize(() => finish('pan'));
  const rotate = Gesture.Rotation().enabled(enabled && !!onRotate)
    .blocksExternalGesture(scrollGesture, dismissGesture).runOnJS(true)
    .onStart(() => start('rotation'))
    .onUpdate(event => { delta.current.angle = event.rotation * 180 / Math.PI; paint(left, top, rotation + delta.current.angle); })
    .onEnd((_event, success) => { if (success) { committed.current = true; pending.current = { left, top, rotation: rotation + delta.current.angle }; onRotate?.(rotation + delta.current.angle); } })
    .onFinalize(() => finish('rotation'));
  const style = { transform: [{ translateX: x }, { translateY: y }, { rotate: angleValue.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }, { scale: lifted.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }) }] };
  return <GestureDetector gesture={Gesture.Race(rotate, pan)}><Animated.View style={style}>{children}</Animated.View></GestureDetector>;
}
