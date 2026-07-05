import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';
import { FlowHistoryMetaLine } from './FlowHistoryMetaLine';

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
};

const MONTH_CELL = 18;
const MONTH_GRID_GAP = 3;

/** 월간 플로우 기록 — 주간 카드와 같은 컴팩트 dot 트랙 */
export function MonthlyFlowHistoryCard({ row, monthPrefix, palette }: Props) {
  const iconColor = activeIconColorByCategory(row.categoryKey);
  const calendarCells = buildMonthCalendarCells(monthPrefix);
  const monthCountLabel = `${row.completedDays}/${row.daysInMonth}`;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconWrap, { backgroundColor: palette.weekdayIdle }]}>
            <IconSymbol name={row.icon as SymbolViewProps['name']} size={14} color={iconColor} />
          </View>
          <View style={styles.titleTextWrap}>
            <ThemedText style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
              {row.label}
            </ThemedText>
            <FlowHistoryMetaLine
              timeLabel={row.timeLabel}
              startDateLabel={row.startDateLabel}
              muted={palette.muted}
            />
          </View>
        </View>
        <ThemedText style={[styles.monthCount, { color: palette.muted }]}>{monthCountLabel}</ThemedText>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.25,
    lineHeight: 17,
  },
  monthTrack: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MONTH_GRID_GAP,
  },
  monthCol: {
    width: MONTH_CELL,
    height: MONTH_CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDot: {
    width: MONTH_CELL,
    height: MONTH_CELL,
    borderRadius: 0,
    borderWidth: 2,
  },
  monthCount: {
    fontSize: 10,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'right',
    flexShrink: 0,
  },
});
