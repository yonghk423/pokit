import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
export const CAMERA_PRINT_DURATION = 1150;

/** Shared by the camera, its companion control, and the printing effect. */
export const heroCameraBottom = (safeBottom: number) => Math.max(100, safeBottom + 72) + 124;

export function HeroCameraPrintAnimation({ uri }: { uri: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: CAMERA_PRINT_DURATION, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return <View testID="hero-camera-print-animation" pointerEvents="none" style={{ position: 'absolute', bottom: '70%', left: '10%', width: '80%', height: 125, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', bottom: 0, width: '100%', height: 78, padding: 4, paddingBottom: 15, backgroundColor: '#FAF9F4', opacity: progress.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [78, 0, -14] }) }] }}>
        <Image source={{ uri }} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
      </Animated.View>
  </View>;
}
