import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Loose papers in a desk tray, without an enclosing tile or background. */
export function MateBagIcon({ isDark, size = 30, progress }: { isDark: boolean; size?: number; progress?: Animated.Value }) {
  const ink = isDark ? '#E8E9DF' : '#4C5149';
  const paper = isDark ? '#363D36' : '#F7F6F4';
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: size }}>
    <Animated.View style={[StyleSheet.absoluteFill, progress ? { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.13] }) }] } : null]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path d="M18.4 21.7L18.1 3.5L26.1 4.4L26.5 22.7ZM12 22.3L11.5 7.3L21.1 7.8L21.6 23ZM6.4 23L6.9 12.4L15.8 12L16.2 23.4Z" fill={paper} stroke={ink} strokeWidth={1.25} strokeLinejoin="round" />
      </Svg>
    </Animated.View>
    <Svg width={size} height={size} viewBox="0 0 32 32" style={StyleSheet.absoluteFill}>
      <Path d="M3.6 21.1L6.8 17.5L7 21.1L25 21.5L25.1 17.8L28.6 21.8L28.2 28.7L3.3 28.2Z" fill={paper} stroke={ink} strokeWidth={1.35} strokeLinejoin="round" />
      <Path d="M3.7 21.3L28.3 21.8M12.3 24L19.5 24.2L19.4 26.2L12.2 26Z" fill="none" stroke={ink} strokeWidth={0.85} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  </View>;
}
