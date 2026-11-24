import { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';

/** Quiet loading dots; opacity changes never move the editor's layout. */
export const HeroContentSkeleton = memo(function HeroContentSkeleton({ ink, testID = 'hero-content-skeleton' }: { ink: string; testID?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    if (reduceMotion) return;
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 3, duration: 1800, easing: Easing.linear, useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => { animation.stop(); };
  }, [progress, reduceMotion]);

  return <View testID={testID} accessible={false} pointerEvents="none" style={{ flexDirection: 'row', gap: 4, paddingTop: 10, height: 25 }}>
    {[0, 1, 2].map(index => <Animated.View key={index} style={{
      width: 3.5, height: 3.5, borderRadius: 1.75, backgroundColor: ink,
      opacity: reduceMotion ? 0.35 : progress.interpolate({
        inputRange: [index, index + 0.5, index + 1],
        outputRange: [0.22, 0.48, 0.22], extrapolate: 'clamp',
      }),
    }} />)}
  </View>;
});
