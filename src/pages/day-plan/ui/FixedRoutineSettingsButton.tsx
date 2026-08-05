import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

const SHADOW_SM = 2;

type Props = {
  isDark: boolean;
  ink: string;
  line: string;
  onPress: () => void;
  accessibilityLabel: string;
};

/** 나만의 루틴 — 시간대·집중 구간 카드 공용 「설정」 버튼 */
export function FixedRoutineSettingsButton({
  isDark,
  ink,
  line,
  onPress,
  accessibilityLabel,
}: Props) {
  const face = isDark ? RetroFlatColors.dark.surfaceAlt : '#FFFFFF';
  const shadow = isDark ? RetroFlatColors.dark.solidShadow : RetroFlatColors.light.text;
  const pressedBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(168, 218, 220, 0.35)';

  return (
    <View style={[styles.shell, { marginRight: SHADOW_SM, marginBottom: SHADOW_SM }]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: shadow,
            borderColor: line,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={6}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.root,
          {
            borderColor: line,
            backgroundColor: pressed ? pressedBg : face,
          },
          pressed && styles.pressed,
        ]}>
        <IconSymbol name="clock" size={12} color={ink} />
        <ThemedText style={[styles.label, { color: ink }]}>설정</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    flexShrink: 0,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 32,
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    zIndex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.92,
  },
});
