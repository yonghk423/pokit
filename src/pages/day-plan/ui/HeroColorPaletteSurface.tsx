import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, useAnimatedValue, type StyleProp, type ViewStyle } from 'react-native';

export function HeroColorPaletteSurface({ open, style, children }: { open: boolean; style: StyleProp<ViewStyle>; children: ReactNode }) {
  const progress = useAnimatedValue(0);
  useEffect(() => {
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    const animate = (reduced: boolean) => {
      if (!live) return;
      animation?.stop();
      animation = Animated.timing(progress, { toValue: open ? 1 : 0, duration: reduced ? 0 : open ? 240 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', animate);
    void AccessibilityInfo.isReduceMotionEnabled().then(animate, () => animate(false));
    return () => { live = false; animation?.stop(); subscription.remove(); };
  }, [open, progress]);
  return <Animated.View testID={open ? 'hero-inline-color-palette' : undefined} pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>{children}</Animated.View>;
}
