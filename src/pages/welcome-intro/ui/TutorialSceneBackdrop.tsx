import { useIsFocused } from 'expo-router';
import { useEffect, useId, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Image as SvgImage, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';

const SCENES = [
  require('../../../../assets/activity-illustrations/protagonist-1/06-reading-960.webp'),
  require('../../../../assets/activity-illustrations/protagonist-1/10-park-walk-960.webp'),
  require('../../../../assets/activity-illustrations/protagonist-1/23-morning-stretch-960.webp'),
  require('../../../../assets/activity-illustrations/protagonist-1/25-skincare-960.webp'),
  require('../../../../assets/activity-illustrations/protagonist-1/20-swimming-960.webp'),
  require('../../../../assets/activity-illustrations/protagonist-1/11-photography-960.webp'),
];
const POSITIONS = [
  { left: -0.07, top: -0.05, angle: -8 },
  { left: 0.65, top: 0.4, angle: 7 },
  { left: -0.03, top: 0.54, angle: -5 },
];

function MemoryScene({ index, width, height, running }: { index: number; width: number; height: number; running: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [scene, setScene] = useState({ source: index, jitterX: 0, jitterY: 0, angle: 0 });
  const id = useId().replace(/:/g, '');
  const slot = POSITIONS[index];
  useEffect(() => {
    if (!running) return;
    let live = true;
    let previous = index;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      if (!live) return;
      // Swap the artwork only while invisible, avoiding a visible image replacement.
      const next = (previous + 1 + Math.floor(Math.random() * (SCENES.length - 1))) % SCENES.length;
      previous = next;
      setScene({ source: next, jitterX: Math.random() * 12 - 6, jitterY: Math.random() * 10 - 5, angle: Math.random() * 4 - 2 });
      animation = Animated.sequence([
        Animated.delay(160),
        Animated.timing(progress, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
        Animated.delay(1300),
        Animated.timing(progress, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      ]);
      animation.start(({ finished }) => {
        if (live && finished) timer = setTimeout(cycle, 2000 + Math.random() * 1800);
      });
    };
    timer = setTimeout(cycle, index * 3400);
    return () => {
      live = false;
      clearTimeout(timer);
      animation?.stop();
      progress.stopAnimation();
      progress.setValue(0);
    };
  }, [running, index, progress]);
  const cardWidth = width * 0.44;
  const cardHeight = height * 0.8;
  return <Animated.View style={{
    position: 'absolute', left: width * slot.left + scene.jitterX, top: height * slot.top + scene.jitterY,
    width: cardWidth, height: cardHeight,
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.42] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [4, -2] }) }, { rotate: `${slot.angle + scene.angle}deg` }],
  }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`fade-${id}`} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="white" />
          <Stop offset="0.66" stopColor="white" />
          <Stop offset="1" stopColor="white" stopOpacity="0" />
        </RadialGradient>
        <Mask id={`edge-${id}`} x="0" y="0" width="100" height="100" maskUnits="userSpaceOnUse">
          <Rect width="100" height="100" fill={`url(#fade-${id})`} />
        </Mask>
      </Defs>
      <SvgImage href={SCENES[scene.source]} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid slice" mask={`url(#edge-${id})`} />
    </Svg>
  </Animated.View>;
}

/** Decorative, touch-through memories; animation never changes the intro's layout. */
export function TutorialSceneBackdrop({ width, height }: { width: number; height: number }) {
  const focused = useIsFocused();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReducedMotion(value); }, () => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const activity = AppState.addEventListener('change', value => setAppActive(value === 'active'));
    return () => { live = false; motion.remove(); activity.remove(); };
  }, []);
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
    {POSITIONS.map((_, index) => <MemoryScene key={index} index={index} width={width} height={height} running={focused && appActive && !reducedMotion} />)}
  </View>;
}
