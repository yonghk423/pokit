import { useState, type ReactNode } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { DECK_OVERVIEW_MOTION } from '../lib/deckOverviewMotion';
import { loopDeckIndex, overlayCardPose } from '../lib/overlayCardDeck';

export type HeroDeckFrame = { active: number; width: number; height: number; top?: number };

/** The same delayed position/scale/rotation interpolation used by the mate overview. */
export function HeroOverviewCardMotion({ children, progress, index, count, source, stageWidth, sourceTop, parentTop, style, enabled }: {
  children: ReactNode; progress: Animated.Value; index: number; count: number;
  source: HeroDeckFrame; stageWidth: number; sourceTop: number; parentTop: number;
  style: ViewStyle; enabled: boolean;
}) {
  const [frame, setFrame] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const depth = loopDeckIndex(index - source.active, count);
  const pose = overlayCardPose(Math.min(2, depth));
  const delay = Math.min(DECK_OVERVIEW_MOTION.maxDelay, depth * DECK_OVERVIEW_MOTION.delayPerCard);
  const range = [delay, 1];
  const interpolate = (from: number, to: number) => progress.interpolate({ inputRange: range, outputRange: [from, to], extrapolate: 'clamp' });
  const motion = enabled && frame.width > 0 && frame.height > 0 ? {
    opacity: depth < 3 ? 1 : progress.interpolate({ inputRange: [delay, delay + (1 - delay) * 0.3], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateX: interpolate(stageWidth / 2 + pose.x * source.width - (16 + frame.x + frame.width / 2), 0) },
      { translateY: interpolate(sourceTop + source.height / 2 + pose.y - (parentTop + frame.y + frame.height / 2), 0) },
      { scaleX: interpolate(source.width * pose.scale / frame.width, 1) },
      { scaleY: interpolate(source.height * pose.scale / frame.height, 1) },
      { rotate: progress.interpolate({ inputRange: range, outputRange: [`${pose.rotate}deg`, '0deg'], extrapolate: 'clamp' }) },
    ],
  } : undefined;
  return <Animated.View testID={`comic-overview-motion-${index}`} pointerEvents="box-none" onLayout={({ nativeEvent: { layout } }) => {
    setFrame(previous => previous.x === layout.x && previous.y === layout.y && previous.width === layout.width && previous.height === layout.height ? previous : layout);
  }} style={[style, { zIndex: count - depth }, motion]}>{children}</Animated.View>;
}
