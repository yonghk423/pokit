import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { addDaysToLocalDateKey, getLocalDateKey, parseLocalDateKeyToDate } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function getWeekRange(dateKey: string): { start: string; end: string; days: string[] } {
  const d = parseLocalDateKeyToDate(dateKey);
  if (!d) return { start: dateKey, end: dateKey, days: [dateKey] };
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = addDaysToLocalDateKey(dateKey, mondayOffset);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDaysToLocalDateKey(monday, i));
  }
  return { start: days[0], end: days[6], days };
}

function parseDayNum(dateKey: string): number {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(dateKey);
  return m ? parseInt(m[1], 10) : 0;
}

function formatWeekHeader(start: string, end: string): string {
  const sm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
  const em = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end);
  if (!sm || !em) return '';
  const sMonth = parseInt(sm[2], 10);
  const sDay = parseInt(sm[3], 10);
  const eMonth = parseInt(em[2], 10);
  const eDay = parseInt(em[3], 10);
  if (sMonth === eMonth) return `${sMonth}월 ${sDay}일 ~ ${eDay}일`;
  return `${sMonth}월 ${sDay}일 ~ ${eMonth}월 ${eDay}일`;
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

export function WeeklyPlanSection({ c, isDark }: Props) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [anchorDate, setAnchorDate] = useState(todayKey);

  const { start, end, days } = useMemo(() => getWeekRange(anchorDate), [anchorDate]);

  const [selectedDay, setSelectedDay] = useState(todayKey);

  const goWeek = useCallback(
    (delta: number) => {
      setAnchorDate((prev) => addDaysToLocalDateKey(prev, delta * 7));
    },
    [],
  );

  const pillBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
  const selectedBg = c.onSurface;
  const selectedText = isDark ? '#09090b' : '#ffffff';
  const todayRing = c.onSurface;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 주"
          hitSlop={12}
          onPress={() => goWeek(-1)}>
          <IconSymbol name="chevron.left" size={18} color={c.onVariant} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>
          {formatWeekHeader(start, end)}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 주"
          hitSlop={12}
          onPress={() => goWeek(1)}>
          <IconSymbol name="chevron.right" size={18} color={c.onVariant} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {days.map((dayKey, i) => {
          const isSelected = dayKey === selectedDay;
          const isToday = dayKey === todayKey;
          const dayNum = parseDayNum(dayKey);
          const dow = WEEKDAY_KO[parseLocalDateKeyToDate(dayKey)?.getDay() ?? 0];

          return (
            <Pressable
              key={dayKey}
              accessibilityRole="button"
              accessibilityLabel={`${dayNum}일 ${dow}요일`}
              onPress={() => setSelectedDay(dayKey)}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: selectedBg },
                !isSelected && isToday && { borderColor: todayRing, borderWidth: 1.5 },
                !isSelected && !isToday && { backgroundColor: pillBg },
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  { color: isSelected ? selectedText : c.onVariant },
                  (i === 0 || i === 6) && !isSelected && { color: c.outline },
                ]}>
                {dow}
              </ThemedText>
              <ThemedText
                style={[
                  styles.dayNum,
                  { color: isSelected ? selectedText : c.onSurface },
                  (i === 0 || i === 6) && !isSelected && { color: c.outline },
                ]}>
                {dayNum}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.contentArea, { borderColor: c.catBorderIdle }]}>
        <ThemedText style={[styles.selectedDateTitle, { color: c.onSurface }]}>
          {parseDayNum(selectedDay)}일 {WEEKDAY_KO[parseLocalDateKeyToDate(selectedDay)?.getDay() ?? 0]}요일
        </ThemedText>
        <ThemedText style={[styles.emptyHint, { color: c.onVariant }]}>
          이 날의 루틴과 목표를 여기에 표시할 예정이에요.
        </ThemedText>
      </View>
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
  weekRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  contentArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    gap: 8,
    minHeight: 160,
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
