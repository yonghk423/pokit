import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { HeroRestingCamera } from './HeroRestingCamera';

/** Shared by the camera, its companion control, and the printing effect. */
export const heroCameraBottom = (safeBottom: number) => Math.max(100, safeBottom + 72) + 124;

export function HeroCameraPrintAnimation({ uri, bottom, dark, onComplete }: { uri: string; bottom: number; dark: boolean; onComplete: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onComplete(); });
    return () => animation.stop();
  }, [progress, onComplete]);
  return <View testID="hero-camera-print-animation" pointerEvents="none" style={{ position: 'absolute', right: 20, bottom, width: 75, height: 53, zIndex: 30 }}>
    <View style={{ position: 'absolute', bottom: 37, left: 8, width: 59, height: 125, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', bottom: 0, width: 59, height: 78, padding: 4, paddingBottom: 15, backgroundColor: '#FAF9F4', opacity: progress.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [78, 0, -14] }) }] }}>
        <Image source={{ uri }} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
      </Animated.View>
    </View>
    <Animated.View style={{ width: 75, height: 53, transform: [{ translateY: progress.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 1], outputRange: [0, 2.5, -1, 1.5, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [1, 0.96, 1.02, 1] }) }] }}>
      <HeroRestingCamera dark={dark} active />
    </Animated.View>
  </View>;
}
