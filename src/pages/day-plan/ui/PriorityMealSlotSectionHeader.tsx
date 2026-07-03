import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  title: string;
  hintTime: string;
  ink: string;
  muted: string;
  line: string;
  isDark: boolean;
  isCurrent: boolean;
  isFirst: boolean;
  onPressHintTime?: () => void;
};

/** 데일리 담기 목록 — 하루 시간대 구간 헤더 */
export function PriorityMealSlotSectionHeader({
  title,
  hintTime,
  ink,
  muted,
  line,
  isDark,
  isCurrent,
  isFirst,
  onPressHintTime,
}: Props) {
  const timeNode = (
    <ThemedText
      style={[styles.hint, { color: onPressHintTime ? ink : muted }]}
      lightColor={onPressHintTime ? ink : muted}
      darkColor={onPressHintTime ? ink : muted}>
      {hintTime}
    </ThemedText>
  );

  return (
    <View style={[styles.root, isFirst ? styles.first : styles.follows]}>
      <View style={styles.row}>
        <ThemedText
          style={[styles.title, { color: isCurrent ? ink : muted }]}
          lightColor={isCurrent ? ink : muted}
          darkColor={isCurrent ? ink : muted}>
          {title}
        </ThemedText>
        {onPressHintTime ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} 시작 시각 변경`}
            onPress={onPressHintTime}
            hitSlop={6}
            style={({ pressed }) => [
              styles.timeChip,
              {
                borderColor: line,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              },
              pressed && styles.timeChipPressed,
            ]}>
            <IconSymbol name="clock" size={12} color={ink} />
            {timeNode}
          </Pressable>
        ) : (
          timeNode
        )}
      </View>
      <View style={[styles.divider, { backgroundColor: line }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    gap: 8,
  },
  first: {
    marginTop: 2,
  },
  follows: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  timeChipPressed: {
    opacity: 0.72,
  },
  hint: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    minHeight: 1,
  },
});
