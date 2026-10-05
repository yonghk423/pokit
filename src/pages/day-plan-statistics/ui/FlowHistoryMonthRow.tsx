import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { categoryAccentColorPastel } from '@widgets/day-plan-priority-order';

import type { MonthlyFlowHistoryRow } from '../lib/buildMonthlyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import { buildMonthCalendarCells } from '../lib/historyPeriodRange';

const MONTH_CELL = 18;
const MONTH_GRID_GAP = 3;

type Props = {
  row: MonthlyFlowHistoryRow;
  monthPrefix: string;
  palette: FlowHistoryPalette;
  categoryKey: string;
  onPressDay?: (day: number, done: boolean) => void;
};

/** 월간 완료 dot 트랙 — 주간과 같이 카테고리 강조색으로 채움 */
export function FlowHistoryMonthRow({
  row,
  monthPrefix,
  palette,
  categoryKey,
  onPressDay,
}: Props) {
  const calendarCells = buildMonthCalendarCells(monthPrefix);
  const doneFill = categoryAccentColorPastel(categoryKey);

  return (
    <View style={styles.trackWrap}>
      <View style={styles.monthTrack}>
        {calendarCells.map((day, index) => {
          if (day == null) {
            return <View key={`empty-${index}`} style={styles.monthCol} />;
          }
          const done = row.dayDone[day - 1] ?? false;
          return (
            <Pressable
              key={`day-${day}`}
              accessibilityRole="button"
              accessibilityState={{ selected: done }}
              hitSlop={4}
              onPress={() => {
                void Haptics.selectionAsync();
                onPressDay?.(day, done);
              }}
              style={styles.monthCol}>
              <View
                style={[
                  styles.monthDot,
                  {
                    backgroundColor: done ? doneFill : palette.weekdayIdle,
                    borderColor: palette.ink,
                  },
                ]}
              />
            </Pressable>
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
