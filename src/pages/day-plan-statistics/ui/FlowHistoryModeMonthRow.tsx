import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { IconSymbol } from '@shared/ui/icon-symbol';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';

const MONTH_CELL = 18;
const MONTH_GRID_GAP = 3;
const MODE_ICON_SIZE = MONTH_CELL;

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
};

/** 모드 아이콘 + 월간 dot 트랙 한 줄 */
export function FlowHistoryModeMonthRow({ row, monthPrefix, palette }: Props) {
  const calendarCells = buildMonthCalendarCells(monthPrefix);

  return (
    <View style={styles.modeRow}>
      <View
        style={[styles.layoutIconWrap, { backgroundColor: palette.weekdayIdle }]}
        accessibilityLabel={row.layoutLabel}>
        <IconSymbol
          name={row.layoutIcon as SymbolViewProps['name']}
          size={11}
          color={palette.muted}
        />
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  layoutIconWrap: {
    width: MODE_ICON_SIZE,
    height: MODE_ICON_SIZE,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trackWrap: {
    flex: 1,
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
    borderWidth: 2,
  },
});
