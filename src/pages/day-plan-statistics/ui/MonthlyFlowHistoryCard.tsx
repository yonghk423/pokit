import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
  onPressDetail?: () => void;
};

/** 월간 플로우 기록 — 주간 카드와 같은 컴팩트 dot 트랙 */
export function MonthlyFlowHistoryCard({ row, monthPrefix, palette, onPressDetail }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);
  const calendarCells = buildMonthCalendarCells(monthPrefix);
  const monthCountLabel = `${row.completedDays}/${row.daysInMonth}`;

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
          <ThemedText style={[styles.monthCount, { color: palette.muted }]}>{monthCountLabel}</ThemedText>
        )}
      </View>

      <View style={styles.monthRow}>
        <View style={styles.monthTrack}>
          {calendarCells.map((day, index) => {
            if (day == null) {
              return <View key={`empty-${index}`} style={styles.monthCol} />;
            }
            const done = row.dayDone[day - 1] ?? false;
            return (
              <View key={`day-${day}`} style={styles.monthCol}>
                <View
                  style={[
                    styles.monthDot,
                    {
                      borderColor: done ? palette.accent : palette.accentSoft,
                      backgroundColor: done ? palette.accent : 'transparent',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
        {onPressDetail ? (
          <ThemedText style={[styles.monthCount, { color: palette.muted }]}>{monthCountLabel}</ThemedText>
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  monthTrack: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  monthCol: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 18,
  },
  monthDot: {
    width: 12,
    height: 12,
    borderRadius: 0,
    borderWidth: 2,
  },
  monthCount: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 34,
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
