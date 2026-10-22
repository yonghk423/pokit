import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';

const INK_DEFAULT = '#343434';

/** An empty, dashed routine sector with a plus: add another piece to the wheel. */
export function RoutineWheelAddIcon({ size = 36, ink = INK_DEFAULT }: { size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M18.8 6.1C11.2 5.9 4.7 12.2 4.6 20.2C4.2 28.4 10.7 35 18.7 35.2C26.4 35.7 33.4 29 33.2 21.1L32.9 17.8" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.1 6.8C9 7.8 5.2 13.6 5.5 20.5M5.4 23.1C6.6 31.2 13.6 35.5 20.6 34.4M23 34.3C28.3 32.9 32.3 28 32.4 22" fill="none" stroke={ink} strokeWidth={0.45} opacity={0.6} strokeLinecap="round" />
    <Path d="M18.8 6.1L19.1 20.6M19.1 20.6L5.5 16.2M19.1 20.6L11.2 32.8M19.1 20.6L30.5 29.4" fill="none" stroke={ink} strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.8 20L8 17.9M6 23.4L10.7 18.8M6.7 26.4L13.3 19.7M8.1 29L15.9 20.6M10 31.1L16.8 23.6" fill="none" stroke={ink} strokeWidth={0.5} opacity={0.45} strokeLinecap="round" />
    <Path d="M20.8 20.2L32.9 17.8" fill="none" stroke={ink} strokeWidth={0.9} strokeDasharray="1.7 2.3" strokeLinecap="round" />
    <Path d="M21.4 6.3Q28.6 7.3 32.9 15.6" fill="none" stroke={ink} strokeWidth={1} strokeDasharray="1.7 2.6" strokeLinecap="round" />
    <Path d="M23.9 12.4L29.6 12.2M26.8 9.4L26.6 15.4" fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round" />
    <Path d="M30.2 3.5L31.3 1.8M34.5 7.5L36.3 6.5" fill="none" stroke={ink} strokeWidth={0.75} strokeLinecap="round" opacity={0.65} />
  </Svg>;
}

/** Two graphite paper cards with a clearly separated add mark: add/stack into deck. */
export function RoutineCardAddIcon({ size = 36, ink = INK_DEFAULT }: { size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M11 4.5Q11 3.5 12.4 3.7L29.3 5Q31 5.1 30.8 6.7L29.5 28.5L12.2 27.7Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.6 10Q5.5 8.5 7 8.4L23 7.9Q24.7 7.8 24.9 9.5L25.4 31.9Q25.5 33.4 23.9 33.5L7.7 34Q6.1 34 6.1 32.5Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7 12L7.6 31.8M10 33L20.6 32.8M13 5.2L27.6 6.2" fill="none" stroke={ink} strokeWidth={0.4} opacity={0.55} strokeLinecap="round" />
    <Path d="M10.4 15.2L19.2 14.9M10.6 19.2L18.1 19M10.8 23.3L15.1 23" fill="none" stroke={ink} strokeWidth={0.8} strokeLinecap="round" />
    <Path d="M23 22.8Q30.4 20.6 36.4 24L36.6 35.8Q30.4 37.7 23.1 35.8Z" fill="#FFFFFF" />
    <Path d="M25.2 29.4L35.2 29.1M30.3 24.3L30.5 34.4" fill="none" stroke={ink} strokeWidth={1.9} strokeLinecap="round" />
  </Svg>;
}

/** Selected items dropping into the today tray/deck with a check + arrow: "추가 / 담기". */
export function RoutineConfirmAddIcon({ size = 36, ink = INK_DEFAULT }: { size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M9.6 6.2L26.8 5.2L27.4 21.8L10.2 22.4Z" fill="#ECEEE8" stroke={ink} strokeWidth={0.85} strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6.8 9.2L24.2 8.4L24.8 25.2L7.4 25.8Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M11.2 17.1L14.3 20.2L20.4 13.4" fill="none" stroke={ink} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M27.6 14.2Q33.8 15.2 33.4 22.8L33.2 27.6" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" />
    <Path d="M29.8 24.8L33.1 28.4L36.4 24.6" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M5.4 29.4L5.8 34.6L34.6 34.2L35 29.2" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8.2 32.4L25.6 32.1" fill="none" stroke={ink} strokeWidth={0.55} opacity={0.45} strokeLinecap="round" />
  </Svg>;
}

/** A single routine card with a dashed new-card outline and pencil/sparkle: craft a new card. */
export function RoutineCardCreateIcon({ size = 32, ink = INK_DEFAULT }: { size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M11.5 5.4L29.6 4.8L30.4 28.4L12.2 29Z" fill="none" stroke={ink} strokeWidth={0.95} strokeDasharray="2 2.2" strokeOpacity={0.55} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M6.8 8.6Q6.7 7.4 8 7.3L20.8 6.8L25.8 11.7L26.2 31.8Q26.2 33 24.9 33.1L8.4 33.6Q7.1 33.6 7.1 32.3Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M20.7 7L20.9 11.8L25.6 11.7" fill="#F2F3EE" stroke={ink} strokeWidth={1.05} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.2 11.6L15 11.4L15.1 16L10.3 16.2Z" fill="none" stroke={ink} strokeWidth={0.95} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.4 20.2L20.6 19.8M10.6 23.8L17.4 23.5" fill="none" stroke={ink} strokeWidth={0.95} strokeLinecap="round" />
    <Path d="M13.6 26.4L13.5 30.8M11.3 28.6L15.8 28.5" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" />
    <Path d="M22.2 25.8L31.8 13.6Q32.6 12.6 33.9 13.6L35.4 14.8Q36.3 15.6 35.5 16.7L25.8 28.8L20.4 31.4Z" fill="#F4F4EE" stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
    <Path d="M30.4 15.4L34.1 18.4M22.2 25.8L25.8 28.8" fill="none" stroke={ink} strokeWidth={0.8} strokeLinecap="round" />
    <Path d="M20.6 31.2L22.5 30.2L21.5 29.4Z" fill={ink} />
  </Svg>;
}

/** A simple graphite plus distinguishes adding an existing rhythm from creating a card. */
export function RoutinePlusIcon({ size = 36, ink = INK_DEFAULT }: { size?: number; ink?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M8.5 20.3Q20 19.6 31.5 20M20.2 8.5Q19.6 20 20 31.5" fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M9.5 21.2L17 20.9M21 10L20.8 17" fill="none" stroke={ink} strokeWidth={0.5} opacity={0.35} strokeLinecap="round" />
  </Svg>;
}

/** White paper tile with static graphite ink (no color-breathing animation). */
export function RoutineWheelAddButton({ label, onPress, ink = INK_DEFAULT, style, disabled = false, invite: _invite = false, icon = 'wheel', size = 48 }: {
  label: string; onPress: () => void; ink?: string; style?: StyleProp<ViewStyle>; disabled?: boolean; invite?: boolean; icon?: 'wheel' | 'cards' | 'createCard' | 'confirmAdd' | 'plus'; size?: number;
}) {
  const AddIcon =
    icon === 'plus'
      ? RoutinePlusIcon
      : icon === 'confirmAdd'
        ? RoutineConfirmAddIcon
        : icon === 'createCard'
          ? RoutineCardCreateIcon
          : icon === 'cards'
            ? RoutineCardAddIcon
            : RoutineWheelAddIcon;
  const holding = useSharedValue(0);
  const tile = Math.max(34, size - 2);
  const iconSize = Math.round(tile * (icon === 'createCard' ? 0.68 : 0.74));

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: holding.value * 0.5 }, { translateY: holding.value * 1 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => { holding.value = 1; }}
      onPressOut={() => { holding.value = 0; }}
      onPress={() => { if (disabled) return; tapHaptic(); onPress(); }}
      style={[{ width: size, height: size }, style, disabled && s.disabled]}>
      <View pointerEvents="none" style={[s.base, { width: tile, height: tile - 1 }]}><HanddrawnFrame color="#62645E" bold /></View>
      <Animated.View style={[s.tile, { width: tile, height: tile - 1 }, pressStyle]}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <PaperGrain opacity={0.25} />
          <HanddrawnFrame color="#4F514B" bold />
        </View>
        <View style={[ { width: iconSize, height: iconSize }, s.iconCenter ]}>
          <AddIcon size={iconSize} ink={ink} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    position: 'absolute',
    left: 2,
    top: 3,
    backgroundColor: '#DADCD6',
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 1.5,
    shadowOffset: { width: 1, height: 1 },
    overflow: 'hidden',
  },
  iconCenter: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
