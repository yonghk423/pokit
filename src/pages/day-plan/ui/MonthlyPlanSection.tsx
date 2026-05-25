import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getLocalDateKey, parseLocalDateKeyToDate } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(key);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

export function MonthlyPlanSection({ c, isDark }: Props) {
  const today = useMemo(() => getLocalDateKey(), []);
  const todayDate = useMemo(() => new Date(), []);
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(today);

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const goMonth = useCallback((delta: number) => {
    setYear((y) => {
      const m = month + delta;
      if (m < 1) { setMonth(12); return y - 1; }
      if (m > 12) { setMonth(1); return y + 1; }
      setMonth(m);
      return y;
    });
    setSelectedDay(null);
  }, [month]);

  const pillBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedBg = c.onSurface;
  const selectedTextColor = isDark ? '#09090b' : '#ffffff';
  const todayRing = c.onSurface;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="이전 달" hitSlop={12} onPress={() => goMonth(-1)}>
          <IconSymbol name="chevron.left" size={18} color={c.onVariant} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>
          {year}년 {month}월
        </ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="다음 달" hitSlop={12} onPress={() => goMonth(1)}>
          <IconSymbol name="chevron.right" size={18} color={c.onVariant} />
        </Pressable>
      </View>

      <View style={styles.calendarGrid}>
        <View style={styles.weekdayRow}>
          {WEEKDAY_KO.map((wd, i) => (
            <View key={wd} style={styles.dayHeaderCell}>
              <ThemedText
                style={[
                  styles.dayHeaderText,
                  { color: i === 0 || i === 6 ? c.outline : c.onVariant },
                ]}>
                {wd}
              </ThemedText>
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((dateKey, di) => {
              if (!dateKey) {
                return <View key={`e${di}`} style={styles.dateCell} />;
              }
              const isSelected = dateKey === selectedDay;
              const isToday = dateKey === today;
              const dayNum = parseInt(dateKey.slice(8), 10);

              return (
                <Pressable
                  key={dateKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${month}월 ${dayNum}일`}
                  onPress={() => setSelectedDay(dateKey)}
                  style={[
                    styles.dateCell,
                    isSelected && { backgroundColor: selectedBg },
                    !isSelected && isToday && { borderColor: todayRing, borderWidth: 1.5 },
                  ]}>
                  <ThemedText
                    style={[
                      styles.dateNum,
                      { color: isSelected ? selectedTextColor : c.onSurface },
                      (di === 0 || di === 6) && !isSelected && { color: c.outline },
                    ]}>
                    {dayNum}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {selectedDay ? (
        <View style={[styles.contentArea, { borderColor: c.catBorderIdle }]}>
          <ThemedText style={[styles.selectedDateTitle, { color: c.onSurface }]}>
            {month}월 {parseInt(selectedDay.slice(8), 10)}일{' '}
            {WEEKDAY_KO[parseLocalDateKeyToDate(selectedDay)?.getDay() ?? 0]}요일
          </ThemedText>
          <ThemedText style={[styles.emptyHint, { color: c.onVariant }]}>
            이 날의 목표와 체크포인트를 여기에 표시할 예정이에요.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  calendarGrid: {
    gap: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dateCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    margin: 2,
  },
  dateNum: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    gap: 8,
    minHeight: 120,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyHint: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
