import { useEffect, useId } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useAnimatedValue } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/** A single watercolor bloom; no looping flashes while a request is running. */
export function HeroGenerateBloom({ active }: { active: boolean }) {
  const progress = useAnimatedValue(0);
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    let live = true;
    let animation: Animated.CompositeAnimation | undefined;
    if (!active) { progress.stopAnimation(); progress.setValue(0); return; }
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!live) return;
      if (reduced) { progress.setValue(1); return; }
      animation = Animated.timing(progress, { toValue: 1, duration: 580, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation.start();
    }).catch(() => { if (live) progress.setValue(1); });
    return () => { live = false; animation?.stop(); };
  }, [active, progress]);
  return <Animated.View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { opacity: progress, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}>
    <Svg width="100%" height="100%" viewBox="0 0 44 44">
      <Defs>
        <RadialGradient id={`${id}mint`} cx="25%" cy="75%" rx="80%" ry="85%"><Stop offset="0" stopColor="#A6D7C3" /><Stop offset="1" stopColor="#A6D7C3" stopOpacity="0" /></RadialGradient>
        <RadialGradient id={`${id}peach`} cx="80%" cy="20%" rx="85%" ry="80%"><Stop offset="0" stopColor="#F5C7AD" /><Stop offset="1" stopColor="#F5C7AD" stopOpacity="0" /></RadialGradient>
      </Defs>
      <Circle cx="22" cy="22" r="20" fill="#BDD8EF" opacity={0.8} />
      <Circle cx="22" cy="22" r="20" fill={`url(#${id}mint)`} />
      <Circle cx="22" cy="22" r="20" fill={`url(#${id}peach)`} />
    </Svg>
  </Animated.View>;
}
