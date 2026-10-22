import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import Svg, { Path } from 'react-native-svg';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';

const FRAME = '#929B8B';
const SHADOW = 'rgba(65, 78, 58, 0.07)';

/** Paper button with the same pencil frame and grain as the layout tiles. */
export function SketchPaperButton({ label, onPress, ink = '#343434', labelSize = 14, iconOnly = false, style }: {
  label: string; onPress: () => void; ink?: string; labelSize?: number; iconOnly?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { tapHaptic(); onPress(); }}
      style={({ pressed }) => [s.shell, style, pressed && s.pressed]}>
      <View pointerEvents="none" style={s.shadow} />
      <View style={[s.face, iconOnly && s.iconFace]}>
        <PaperGrain opacity={0.25} />
        <HanddrawnFrame color={FRAME} />
        <Svg width={iconOnly ? 22 : 17} height={iconOnly ? 22 : 18} viewBox="0 0 20 20" accessible={false}>
          <Path d="M3.1 10.4Q9.9 9.8 16.7 10.1M10.2 3L9.8 17M4.2 9.5L15.7 9.4M9.3 4L9.1 15.5" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" />
        </Svg>
        {iconOnly ? null : <ThemedText style={{ color: ink, fontSize: labelSize, lineHeight: labelSize + 8, flexShrink: 1, textAlign: 'center' }}>{label}</ThemedText>}
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  shell: { alignSelf: 'center', marginRight: 1, marginBottom: 1 },
  shadow: { ...StyleSheet.absoluteFill, backgroundColor: SHADOW, transform: [{ translateX: 1 }, { translateY: 1 }] },
  face: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  iconFace: { width: 44, height: 44, minHeight: 44, paddingHorizontal: 0, paddingVertical: 0 },
  pressed: { transform: [{ translateY: 1 }] },
});
