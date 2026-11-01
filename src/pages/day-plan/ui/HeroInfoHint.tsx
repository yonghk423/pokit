import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, useAnimatedValue } from 'react-native';
import { isHeroInfoHintPending, subscribeHeroInfoHint, type HeroInfoHintKind } from '@shared/lib/storage/heroInfoHintStorage';

/** Attract attention without changing the icon's layout or touch target. */
export function HeroInfoHint({ kind, enabled = true, children }: { kind: HeroInfoHintKind; enabled?: boolean; children: ReactNode }) {
  const pending = useSyncExternalStore(subscribeHeroInfoHint, () => isHeroInfoHintPending(kind), () => false);
  const motion = useAnimatedValue(0);
  useEffect(() => {
    if (!pending || !enabled) return;
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    const update = (reduced: boolean) => {
      if (!live) return;
      animation?.stop(); motion.setValue(0);
      if (reduced) return;
      animation = Animated.loop(Animated.sequence([
        Animated.delay(1600),
        Animated.timing(motion, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
        Animated.timing(motion, { toValue: 0, duration: 450, easing: Easing.inOut(Easing.quad), useNativeDriver: true, isInteraction: false }),
      ]));
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then(update, () => undefined);
    return () => { live = false; subscription.remove(); animation?.stop(); motion.setValue(0); };
  }, [enabled, pending, motion]);
  return <Animated.View pointerEvents="none" style={{ transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }] }}>{children}</Animated.View>;
}
