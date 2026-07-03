import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { WEEKDAY_LABELS, type WeeklyFlowHistoryRow } from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';

type Props = {
  row: WeeklyFlowHistoryRow;
  palette: FlowHistoryPalette;
  isDark: boolean;
  onPressDetail?: () => void;
};

export function WeeklyFlowHistoryCard({ row, palette, isDark, onPressDetail }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={row.icon as SymbolViewProps['name']} size={18} color={iconColor} />
          </View>
          <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
            {row.label}
          </ThemedText>
        </View>
        {onPressDetail ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.label} 상세 보기`}
            hitSlop={8}
            onPress={onPressDetail}
            style={({ pressed }) => [styles.detailBtn, pressed && styles.pressed]}>
            <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>상세</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.weekdayRow}>
        <View style={styles.weekdayTrack}>
          {WEEKDAY_LABELS.map((label, index) => {
            const done = row.weekdayDone[index] ?? false;
            return (
              <View key={label} style={styles.weekdayCol}>
                <View
                  style={[
                    styles.weekdayDot,
                    {
                      borderColor: done ? palette.accent : palette.accentSoft,
                      backgroundColor: done ? palette.accent : 'transparent',
                    },
                  ]}
                />
                <ThemedText
                  style={[styles.weekdayLabel, { color: done ? palette.accent : palette.muted }]}>
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </View>
        <ThemedText style={[styles.weekCount, { color: palette.muted }]}>
          {row.completedDays}/7
        </ThemedText>
      </View>

      {row.timeLabel ? (
        <View style={styles.metaRow}>
          <MaterialIcons name="schedule" size={14} color={palette.muted} />
          <ThemedText style={[styles.metaText, { color: palette.ink }]}>{row.timeLabel}</ThemedText>
        </View>
      ) : null}

      {row.startDateLabel ? (
        <ThemedText style={[styles.startDate, { color: palette.muted }]}>
          시작일: {row.startDateLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  detailBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekdayTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 2,
  },
  weekdayCol: {
    alignItems: 'center',
    gap: 4,
    minWidth: 24,
  },
  weekdayDot: {
    width: 22,
    height: 22,
    borderRadius: 0,
    borderWidth: 2,
  },
  weekdayLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  weekCount: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  startDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
