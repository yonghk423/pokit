import { forwardRef, useImperativeHandle, useLayoutEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, runOnJS, runOnUI, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { loopDeckIndex, overlayCardPose } from '../lib/overlayCardDeck';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

export type HeroCardStackHandle = { turnTo: (index: number) => void };
type Props = {
  active: number; count: number; width: number; height: number; cardWidth: number; cardHeight: number; top: number; enabled: boolean;
  overviewGesture?: PanGesture;
  onCardHold?: (x: number, y: number) => void;
  swipeEnabled?: boolean;
  renderPage: (index: number, interactive: boolean, focused: boolean) => ReactNode; onChange: (index: number) => void;
};
function StackCard({ index, position, direction, width, cardWidth, cardHeight, top, children, interactive }: {
  index: number; position: SharedValue<number>; direction: SharedValue<number>; width: number; cardWidth: number; cardHeight: number; top: number;
  children: ReactNode; interactive: boolean;
}) {
  const motion = useAnimatedStyle(() => {
    const pose = overlayCardPose(index - position.get(), direction.get());
    return { opacity: pose.opacity, zIndex: pose.zIndex, transform: [
      { translateX: pose.x * cardWidth }, { translateY: pose.y }, { scale: pose.scale }, { rotate: `${pose.rotate}deg` },
    ] };
  });
  return <Animated.View testID={`comic-stack-card-${index}`} pointerEvents={interactive ? 'auto' : 'none'} accessibilityElementsHidden={!interactive}
    importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
    style={[{ position: 'absolute', left: (width - cardWidth) / 2, top, width: cardWidth, height: cardHeight }, motion]}>{children}</Animated.View>;
}

/** Intact live cards use the mate deck's pose; no snapshots, image slicing or decode gate. */
export const HeroCardStack = forwardRef<HeroCardStackHandle, Props>(function HeroCardStack({ active, count, width, height, cardWidth, cardHeight, top, enabled, swipeEnabled = true, overviewGesture, onCardHold, renderPage, onChange }, ref) {
  const [cursor, setCursor] = useState(() => active + count);
  const base = count > 1 ? cursor : 0;
  const reported = useSharedValue(active);
  const step = Math.max(150, width * 0.42);
  const position = useSharedValue(base);
  const direction = useSharedValue(1);
  const destination = useSharedValue(base);
  const dragOrigin = useSharedValue(base);
  const settling = useSharedValue(false);
  const tracking = useSharedValue(false);
  const generation = useSharedValue(0);
  useLayoutEffect(() => {
    generation.set(generation.get() + 1);
    cancelAnimation(position); position.set(base); destination.set(base); settling.set(false); tracking.set(false);
    return () => { generation.set(generation.get() + 1); cancelAnimation(position); };
  // React/thumbnail updates must not cancel a gesture already running on the UI thread.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, count]);
  useLayoutEffect(() => {
    if (active === reported.get()) return;
    reported.set(active);
    const next = active + count;
    cancelAnimation(position); destination.set(next); position.set(next);
    settling.set(false); tracking.set(false);
    // External selection must move the mounted card window with the native position.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCursor(next);
  }, [active, count, position, destination, settling, tracking, reported]);
  const commit = (next: number, token: number) => {
    if (generation.get() !== token) return;
    reported.set(loopDeckIndex(next, count));
    setCursor(next); onChange(loopDeckIndex(next, count)); tapHaptic('select');
  };
  const settle = (next: number) => {
    'worklet';
    const token = generation.get();
    const changed = next !== destination.get();
    destination.set(next);
    settling.set(true); tracking.set(false);
    // Publish independently of animation completion; thumbnail rendering is only a follower.
    if (changed) runOnJS(commit)(next, token);
    position.set(withTiming(next, { duration: 240, easing: Easing.out(Easing.cubic) }, finished => {
      if (generation.get() !== token || !finished) return;
      settling.set(false);
    }));
  };
  useImperativeHandle(ref, () => ({ turnTo(next) {
    if (!enabled || !swipeEnabled || next < 0 || next >= count) return;
    runOnUI(() => {
      'worklet';
      if (tracking.get()) return;
      const current = destination.get();
      const forward = loopDeckIndex(next - loopDeckIndex(current, count), count);
      const backward = forward - count;
      const delta = forward <= Math.abs(backward) ? forward : backward;
      if (!delta) return;
      cancelAnimation(position);
      direction.set(delta > 0 ? 1 : -1);
      if (Math.abs(delta) > 1) position.set(current + delta);
      settle(current + delta);
    })();
  } }));
  // A thumb sweeps in an arc from the lower corners. Allow that initial vertical
  // drift before claiming a horizontal turn, and keep tracking past the edge.
  const gesture = Gesture.Pan().enabled(enabled && swipeEnabled && count > 1)
    .activeOffsetX([-8, 8]).failOffsetY([-40, 40]).shouldCancelWhenOutside(false)
    .onStart(event => {
      cancelAnimation(position);
      dragOrigin.set(position.get());
      settling.set(false);
      direction.set(event.translationX > 0 ? 1 : -1); tracking.set(true);
    })
    .onUpdate(event => {
      if (!tracking.get()) return;
      const delta = Math.max(-1, Math.min(1, event.translationX / step));
      if (Math.abs(delta) > 0.001) direction.set(delta > 0 ? 1 : -1);
      position.set(dragOrigin.get() + delta);
    })
    .onEnd(event => {
      if (!tracking.get()) return;
      const delta = position.get() - dragOrigin.get();
      const advance = Math.abs(delta) > 0.25 || (Math.abs(delta) > 0.04 && event.velocityX * Math.sign(delta) > 450);
      settle(destination.get() + (advance ? (delta > 0 ? 1 : -1) : 0));
    })
    .onFinalize((_event, success) => { if (!success && tracking.get()) settle(destination.get()); });
  // Like the mate deck, virtual copies keep three layers visible through either boundary.
  const indices = count > 1 ? Array.from({ length: 6 }, (_, offset) => base - 1 + offset) : count === 1 ? [0] : [];
  // Both gestures share one native surface. A held thumb sweep must get a chance
  // to turn before the long-press overview gesture can claim the same touch.
  const movement = overviewGesture ? Gesture.Exclusive(gesture, overviewGesture) : gesture;
  // The overview pan activates after 350ms, before a deletion hold's 500ms.
  // Give a stationary hold priority instead of racing those timers. Moving more
  // than 12pt fails the hold and releases the same touch to the swipe gestures.
  const deckGesture = onCardHold
    ? Gesture.Exclusive(
      Gesture.LongPress().enabled(enabled && swipeEnabled && count > 0).minDuration(500).maxDistance(12)
        .onStart(event => { runOnJS(onCardHold)(event.x, event.y); }),
      movement,
    )
    : movement;
  return <GestureDetector gesture={deckGesture}><View testID="comic-card-stack" collapsable={false} style={[s.root, { width, height }]}>
    {indices.map(index => <StackCard key={index} index={index} position={position} direction={direction} width={width} cardWidth={cardWidth} cardHeight={cardHeight} top={top}
      interactive={enabled && index === base}>{renderPage(loopDeckIndex(index, count), enabled && index === base, index === base)}</StackCard>)}
  </View></GestureDetector>;
});
const s = StyleSheet.create({ root: { overflow: 'hidden' } });
