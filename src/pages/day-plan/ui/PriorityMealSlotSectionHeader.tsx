import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  title: string;
  hintTime: string;
  ink: string;
  muted: string;
  line: string;
  isCurrent: boolean;
  isFirst: boolean;
};

/** 데일리 담기 목록 — 하루 시간대 구간 헤더 */
export function PriorityMealSlotSectionHeader({
  title,
  hintTime,
  ink,
  muted,
  line,
  isCurrent,
  isFirst,
}: Props) {
  return (
    <View style={[styles.root, isFirst ? styles.first : styles.follows]}>
      <View style={styles.row}>
        <ThemedText
          style={[styles.title, { color: isCurrent ? ink : muted }]}
          lightColor={isCurrent ? ink : muted}
          darkColor={isCurrent ? ink : muted}>
          {title}
        </ThemedText>
        <ThemedText
          style={[styles.hint, { color: muted }]}
          lightColor={muted}
          darkColor={muted}>
          {hintTime}
        </ThemedText>
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
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: -0.05,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    minHeight: 1,
  },
});
