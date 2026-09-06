import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const FADE_IN_MS = 480;
const EASE_OUT = Easing.out(Easing.cubic);

type Props = {
  ready: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** 준비되면 컨테이너 opacity만 0→1로 페이드인 (자식은 한꺼번에). */
export function AtmosphereFadeIn({ ready, style, children }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!ready) {
      opacity.value = 0;
      return;
    }
    opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: EASE_OUT });
  }, [opacity, ready]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!ready) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, animatedStyle]}
      accessibilityElementsHidden>
      {children}
    </Animated.View>
  );
}
