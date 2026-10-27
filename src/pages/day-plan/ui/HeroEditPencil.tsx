import { useEffect, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, View, useAnimatedValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { isHeroCardEditHintPending, subscribeHeroCardEditHint } from '@shared/lib/storage/heroCardEditHintStorage';

/** Draw a short underline with the live pencil; card geometry stays fixed. */
export function HeroEditPencil({ ink, enabled }: { ink: string; enabled: boolean }) {
  const pending = useSyncExternalStore(subscribeHeroCardEditHint, isHeroCardEditHintPending, () => false);
  const motion = useAnimatedValue(0);
  useEffect(() => {
    if (!enabled || !pending) return;
    let live = true;
    let animation: Animated.CompositeAnimation | null = null;
    const update = (reduced: boolean) => {
      if (!live) return;
      animation?.stop();
      motion.setValue(0);
      if (reduced) return;
      // Include the pause in one native timeline so every cycle repeats reliably.
      animation = Animated.loop(Animated.timing(motion, {
        toValue: 1, duration: 3800,
        easing: value => Math.max(0, (value * 3800 - 1400) / 2400),
        useNativeDriver: true, isInteraction: false,
      }), { iterations: -1 });
      animation.start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    void AccessibilityInfo.isReduceMotionEnabled().then(update, () => undefined);
    return () => { live = false; subscription.remove(); animation?.stop(); motion.setValue(0); };
  }, [enabled, pending, motion]);
  const phases = [0, 0.12, 0.22, 0.75, 0.88, 1];
  return <View pointerEvents="none" style={{ width: 22, height: 22 }}>
    <View style={{ position: 'absolute', left: -19, top: 25, width: 40, height: 6, overflow: 'hidden' }}>
      <Animated.View style={{ width: 40, height: 6, overflow: 'hidden',
        opacity: motion.interpolate({ inputRange: phases, outputRange: [0, 0, 1, 1, 1, 0] }),
        transform: [{ translateX: motion.interpolate({ inputRange: [0, 0.22, 0.75, 1], outputRange: [-40, -40, 0, 0] }) }],
      }}>
        <Animated.View style={{ width: 40, height: 6,
          transform: [{ translateX: motion.interpolate({ inputRange: [0, 0.22, 0.75, 1], outputRange: [40, 40, 0, 0] }) }],
        }}>
          <Svg width={40} height={6} viewBox="0 0 40 6" accessible={false}>
            <Path d="M1 3.8C9 2.3 18 4.1 26 2.8Q32.6 2.2 39 2.9" stroke={ink} strokeWidth={1.5} strokeLinecap="round" fill="none" />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
    <Animated.View style={{ width: 22, height: 22, transform: [
      { translateX: motion.interpolate({ inputRange: phases, outputRange: [0, -22, -22, 18, 18, 0] }) },
      { translateY: motion.interpolate({ inputRange: phases, outputRange: [0, 6, 6, 6, 0, 0] }) },
      { rotate: motion.interpolate({ inputRange: phases, outputRange: ['0deg', '-12deg', '-12deg', '-12deg', '0deg', '0deg'] }) },
    ] }}>
    <Svg width={22} height={22} viewBox="0 0 32 32" accessible={false} pointerEvents="none">
      <Path d="M6.1 21.8L22.5 4.6Q23.4 3.5 24.6 4.6L28 8Q29 9 27.9 10.2L11.5 26.8L4.6 28.1Z" fill={ink} fillOpacity={0.08} stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 7.4L25.1 12.3M6.4 21.7L11.5 26.6M9.3 21.2L22.2 8.1" fill="none" stroke={ink} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M5.1 25L4.6 28.1L8 27.5Z" fill={ink} />
    </Svg>
    </Animated.View>
  </View>;
}
