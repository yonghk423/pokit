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
  onPressDetail?: () => void;
};

export function WeeklyFlowHistoryCard({ row, palette, onPressDetail }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={row.icon as SymbolViewProps['name']} size={16} color={iconColor} />
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
              {row.label}
            </ThemedText>
            {row.timeLabel ? (
              <View style={styles.timeInline}>
                <MaterialIcons name="schedule" size={12} color={palette.muted} />
                <ThemedText style={[styles.timeText, { color: palette.muted }]} numberOfLines={1}>
                  {row.timeLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>
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
        ) : (
          <ThemedText style={[styles.weekCount, { color: palette.muted }]}>
            {row.completedDays}/7
          </ThemedText>
        )}
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
        {onPressDetail ? (
          <ThemedText style={[styles.weekCount, { color: palette.muted }]}>
            {row.completedDays}/7
          </ThemedText>
        ) : null}
      </View>

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
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.25,
    lineHeight: 19,
  },
  timeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  detailBtn: {
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekdayTrack: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
  },
  weekdayCol: {
    alignItems: 'center',
    gap: 2,
  },
  weekdayDot: {
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  weekCount: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 26,
    textAlign: 'right',
  },
  startDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.72,
  },
});
