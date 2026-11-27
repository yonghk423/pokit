import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { cameraMotionProfiles } from '../model/heroCameraMotionProfiles';
import Svg, { Path } from 'react-native-svg';

/** Each camera gets a material-appropriate response and its own decorative motif. */
export function HeroCameraMotion({ active, children, cameraId = 'mini-evo' }: { active: boolean; children: ReactNode; cameraId?: string }) {
  const profile = cameraMotionProfiles[cameraId as keyof typeof cameraMotionProfiles] ?? cameraMotionProfiles['mini-evo'];
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    if (!active) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1, duration: profile.duration, easing: Easing.linear, useNativeDriver: true,
    });
    animation.start();

  }, [active, reduceMotion, progress, profile]);
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const glow = progress.interpolate({ inputRange: [0, 0.18, 0.5, 1], outputRange: [0, 0.65, 0.3, 0] });
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View testID="hero-camera-glow" style={[StyleSheet.absoluteFill, { opacity: glow, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [2, profile.drift] }) }, { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', profile.turn + 'deg'] }) }] }]}>
      <View style={{ position: 'absolute', left: '-8%', top: '-5%', width: '116%', height: '110%', borderRadius: 50, backgroundColor: profile.color, opacity: 0.18, shadowColor: profile.color, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }} />
      <Svg testID={`camera-motif-${cameraId}`} width="100%" height="100%" viewBox="0 0 75 53" style={{ position: 'absolute', top: -12, right: -10 }}>
        <Path d={profile.path} fill={profile.color} fillRule="evenodd" transform="translate(49 0) scale(0.8)" />
        <Path d={profile.path} fill={profile.color} fillRule="evenodd" opacity={0.65} transform="translate(5 19) scale(0.4)" />
      </Svg>
    </Animated.View>
    <Animated.View testID="hero-camera-bounce" style={[StyleSheet.absoluteFill, { transform: [
      { translateY: progress.interpolate({ inputRange: [0, 0.2, 0.45, 0.7, 1], outputRange: [0, -profile.lift, profile.lift / 4, -profile.lift / 4, 0] }) },
      ...(cameraId === 'mini-evo' ? [] : [
      { scale: progress.interpolate({ inputRange: [0, 0.2, 0.45, 1], outputRange: [1, 1 + profile.lift / 80, 0.99, 1] }) },
      { rotate: progress.interpolate({ inputRange: [0, 0.2, 0.45, 0.7, 1], outputRange: ['0deg', profile.tilt + 'deg', -profile.tilt / 2 + 'deg', profile.tilt / 4 + 'deg', '0deg'] }) },
      ]),
    ] }]}>{children}</Animated.View>
  </View>;
}
