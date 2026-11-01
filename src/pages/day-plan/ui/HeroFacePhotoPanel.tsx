import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useAnimatedValue, View } from 'react-native';

/** Keep both measured surfaces mounted so opening/closing does not jump the notebook. */
export function HeroFacePhotoPanel({ open, actions, preview }: { open: boolean; actions: ReactNode; preview: ReactNode }) {
  const [actionsHeight, setActionsHeight] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);
  const [reduced, setReduced] = useState(false);
  const height = useAnimatedValue(0);
  const progress = useAnimatedValue(open ? 1 : 0);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { live = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(height, { toValue: open ? actionsHeight : previewHeight, duration: reduced ? 0 : 240, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(progress, { toValue: open ? 1 : 0, duration: reduced ? 0 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [open, actionsHeight, previewHeight, reduced, height, progress]);
  return <Animated.View testID="hero-face-photo-panel" style={{ height, overflow: 'hidden' }}>
    <Animated.View testID="hero-face-photo-actions" pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[s.layer, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }) }] }]}>
      <View onLayout={event => setActionsHeight(event.nativeEvent.layout.height)}>{actions}</View>
    </Animated.View>
    <Animated.View pointerEvents={open ? 'none' : 'auto'} accessibilityElementsHidden={open} importantForAccessibility={open ? 'no-hide-descendants' : 'auto'} style={[s.layer, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <View onLayout={event => setPreviewHeight(event.nativeEvent.layout.height)}>{preview}</View>
    </Animated.View>
  </Animated.View>;
}
const s = StyleSheet.create({ layer: { position: 'absolute', top: 0, left: 0, right: 0 } });
