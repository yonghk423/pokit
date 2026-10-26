import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Books lift slightly when the shelf's tools are opened. */
export function BookshelfIcon({ isDark, size = 30, progress }: { isDark: boolean; size?: number; progress?: Animated.Value }) {
  const ink = isDark ? '#E8E9DF' : '#4C5149';
  const paper = isDark ? '#363D36' : '#F7F6F4';
  return <View pointerEvents="none" accessible={false} style={{ width: size, height: size }}>
    <Animated.View style={[StyleSheet.absoluteFill, progress ? { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.055] }) }] } : null]}>
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Path d="M6.1 14L6.4 5.4L10.1 5.3L10.3 14ZM11.4 14L11.3 7.2L15.1 7L15.2 14ZM17.6 14L16.1 6.6L19.4 6L21.1 13.9ZM22.3 13.9L22.2 8L25.5 8L25.6 14Z" fill={paper} stroke={ink} strokeWidth={1} strokeLinejoin="round" />
        <Path d="M6.1 26.7L7.3 18L10.4 18.4L9.7 26.8ZM11.1 26.7L11.4 17.5L15.6 17.6L15.7 26.8ZM17.3 26.6L17.1 20L20.5 20L20.6 26.8ZM22 26.7L21.9 18L25.5 18.2L25.8 26.9Z" fill={paper} stroke={ink} strokeWidth={1} strokeLinejoin="round" />
        <Path d="M12.3 18L14.7 18.1L14.6 22L13.6 21.3L12.5 22ZM7.2 7L9.4 7M22.9 10L24.9 10M18 22L20 22" fill="none" stroke={ink} strokeWidth={0.65} strokeLinecap="round" />
      </Svg>
    </Animated.View>
    <Svg width={size} height={size} viewBox="0 0 32 32" style={StyleSheet.absoluteFill}>
      <Path d="M3.3 3.3L4.7 3.2L4.8 29L3.2 29ZM27.2 3.2L28.8 3.4L28.7 29L27.1 28.9ZM4.8 14.2L27.2 14.1L27.2 15.7L4.8 15.7ZM4.8 27L27.2 26.9L27.2 28.4L4.8 28.3Z" fill={paper} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M5 3.8L26.8 3.9M5.2 4.8L26.7 4.9" stroke={ink} strokeWidth={0.7} strokeLinecap="round" />
    </Svg>
  </View>;
}
