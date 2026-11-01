import { useEffect, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing, useAnimatedValue } from 'react-native';
import { isHeroThumbnailStripCollapsed, subscribeHeroThumbnailStrip } from '@shared/lib/storage/heroThumbnailStripStorage';

export function useHeroThumbnailStrip() {
  const collapsed = useSyncExternalStore(subscribeHeroThumbnailStrip, isHeroThumbnailStripCollapsed, () => false);
  const progress = useAnimatedValue(collapsed ? 1 : 0);
  useEffect(() => {
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      if (!live) return;
      animation?.stop();
      animation = Animated.timing(progress, { toValue: collapsed ? 1 : 0, duration: reduced ? 0 : 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true, isInteraction: false });
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then(update, () => update(false));
    return () => { live = false; animation?.stop(); subscription.remove(); };
  }, [collapsed, progress]);
  return { collapsed, motionStyle: { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 58] }) }] } };
}
