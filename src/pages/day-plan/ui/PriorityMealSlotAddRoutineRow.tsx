import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  label?: string;
  ink: string;
  line: string;
  isDark: boolean;
  onPress: () => void;
};

/** 시간대별 보기 — 구간에 루틴 연결 */
export function PriorityMealSlotAddRoutineRow({
  label = '루틴 연결',
  ink,
  line,
  isDark,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        {
          borderColor: line,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        },
        pressed && styles.pressed,
      ]}>
      <IconSymbol name="plus.circle.fill" size={14} color={ink} />
      <ThemedText style={[styles.label, { color: ink }]}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    borderWidth: 2,
    borderRadius: 0,
    borderStyle: 'dashed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.78,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
