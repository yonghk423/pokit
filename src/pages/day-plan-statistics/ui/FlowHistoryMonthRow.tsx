import { StyleSheet, View } from 'react-native';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';

const MONTH_CELL = 18;
const MONTH_GRID_GAP = 3;

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
};

/** 월간 완료 dot 트랙 */
export function FlowHistoryMonthRow({ row, monthPrefix, palette }: Props) {
  const calendarCells = buildMonthCalendarCells(monthPrefix);

  return (
    <View style={styles.trackWrap}>
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
                    backgroundColor: done ? palette.ink : palette.weekdayIdle,
                    borderColor: palette.ink,
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
  trackWrap: {
    width: '100%',
    minWidth: 0,
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
    borderWidth: StyleSheet.hairlineWidth,
  },
});
