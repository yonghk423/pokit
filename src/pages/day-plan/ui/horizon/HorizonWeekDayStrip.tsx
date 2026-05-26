import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import type { HorizonWeekDayCell } from '../../lib/buildHorizonWeekDays';
import type { DayPlanPalette } from '../../lib/dayPlanPalette';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  days: HorizonWeekDayCell[];
  selectedDateKey: string;
  todayDateKey?: string;
  memoDateKeys?: ReadonlySet<string>;
  onSelectDate: (dateKey: string) => void;
};

export function HorizonWeekDayStrip({
  c,
  isDark,
  days,
  selectedDateKey,
  todayDateKey,
  memoDateKeys,
  onSelectDate,
}: Props) {
  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedBg = isDark ? '#fafafa' : '#18181b';
  const selectedInk = isDark ? '#09090b' : '#ffffff';
  const idleBg = isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const idleInk = c.onVariant;

  return (
    <View style={[styles.track, { backgroundColor: trackBg }]}>
      {days.map((day) => {
        const selected = day.dateKey === selectedDateKey;
        const isToday = Boolean(todayDateKey && day.dateKey === todayDateKey);

        const showTodayRing = isToday && !selected;
        const hasMemo = Boolean(memoDateKeys?.has(day.dateKey));

        return (
          <Pressable
            key={day.dateKey}
            accessibilityRole="button"
            accessibilityLabel={`${day.weekdayLabel} ${day.dayOfMonth}일`}
            accessibilityState={{ selected }}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectDate(day.dateKey);
            }}
            style={[
              styles.cell,
              {
                backgroundColor: selected ? selectedBg : idleBg,
                borderColor: showTodayRing ? c.onSurface : selected ? selectedBg : 'transparent',
                borderWidth: TODAY_RING_WIDTH,
              },
            ]}>
            <ThemedText
              style={[
                styles.weekday,
                { color: selected ? selectedInk : idleInk },
              ]}>
              {day.weekdayLabel}
            </ThemedText>
            <ThemedText
              style={[
                styles.dayNum,
                { color: selected ? selectedInk : idleInk },
              ]}>
              {day.dayOfMonth}
            </ThemedText>
            {hasMemo ? (
              <View
                style={[
                  styles.memoDot,
                  { backgroundColor: selected ? selectedInk : c.onSurface },
                ]}
              />
            ) : (
              <View style={styles.memoDotSpacer} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** 선택 전환 시 셀 크기가 변하지 않도록 항상 동일 두께 유지 */
const TODAY_RING_WIDTH = 1.5;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    padding: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
    gap: 2,
    minHeight: 56,
  },
  weekday: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  memoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  memoDotSpacer: {
    width: 4,
    height: 4,
    marginTop: 2,
  },
});
