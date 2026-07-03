import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';
import { WEEKDAY_LABELS } from '../lib/buildWeeklyFlowHistory';

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
  onPressDetail?: () => void;
};

export function MonthlyFlowHistoryCard({ row, monthPrefix, palette, onPressDetail }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);
  const calendarCells = buildMonthCalendarCells(monthPrefix);

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={row.icon as SymbolViewProps['name']} size={18} color={iconColor} />
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
              {row.label}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              총 {row.totalCompletions}회 완료
            </ThemedText>
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
        ) : null}
      </View>

      <View style={styles.calendarHeader}>
        {WEEKDAY_LABELS.map((label) => (
          <ThemedText key={label} style={[styles.calendarHeaderLabel, { color: palette.muted }]}>
            {label}
          </ThemedText>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarCells.map((day, index) => {
          if (day == null) {
            return <View key={`empty-${index}`} style={styles.calendarCell} />;
          }
          const done = row.dayDone[day - 1] ?? false;
          return (
            <View key={`day-${day}`} style={styles.calendarCell}>
              <View
                style={[
                  styles.dayDot,
                  {
                    borderColor: done ? palette.accent : palette.accentSoft,
                    backgroundColor: done ? palette.accent : 'transparent',
                  },
                ]}
              />
              <ThemedText style={[styles.dayLabel, { color: done ? palette.accent : palette.muted }]}>
                {day}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.footerRow}>
        <ThemedText style={[styles.footerCount, { color: palette.muted }]}>
          {row.completedDays}/{row.daysInMonth}일
        </ThemedText>
        {row.timeLabel ? (
          <View style={styles.metaRow}>
            <MaterialIcons name="schedule" size={14} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.ink }]}>{row.timeLabel}</ThemedText>
          </View>
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
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  detailBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  calendarHeaderLabel: {
    width: 28,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 3,
    minHeight: 34,
  },
  dayDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  dayLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  footerCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
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
