import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addDaysToLocalDateKey } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  addMonths,
  buildCalendarMonthGrid,
  dateKeyFromDate,
  formatMonthTitleKo,
  dateKeyMonthPrefix,
  monthStartFromDateKey,
} from '../../lib/buildCalendarMonthGrid';
import { getHorizonWeekStartKey } from '../../lib/buildHorizonWeekDays';
import { PRIMARY } from '../../lib/dayPlanEditorShared';
import type { DayPlanPalette } from '../../lib/dayPlanPalette';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

export type HorizonCalendarMode = 'day' | 'month';

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
  visible: boolean;
  mode: HorizonCalendarMode;
  focusDateKey: string;
  todayDateKey: string;
  onClose: () => void;
  onSelectDay: (dateKey: string) => void;
  onSelectMonth: (year: number, month: number) => void;
};

export function HorizonCalendarSheet({
  c,
  isDark,
  visible,
  mode,
  focusDateKey,
  todayDateKey,
  onClose,
  onSelectDay,
  onSelectMonth,
}: Props) {
  const insets = useSafeAreaInsets();
  const [monthCursor, setMonthCursor] = useState(() => monthStartFromDateKey(focusDateKey));

  useEffect(() => {
    if (visible) {
      setMonthCursor(monthStartFromDateKey(focusDateKey));
    }
  }, [focusDateKey, visible]);

  const monthTitle = useMemo(() => formatMonthTitleKo(monthCursor), [monthCursor]);
  const calendarDays = useMemo(() => buildCalendarMonthGrid(monthCursor), [monthCursor]);

  const weekRange = useMemo(() => {
    if (mode !== 'day') return null;
    const lo = getHorizonWeekStartKey(focusDateKey);
    const hi = addDaysToLocalDateKey(lo, 6);
    return { lo, hi };
  }, [focusDateKey, mode]);

  const focusMonthPrefix = useMemo(() => dateKeyMonthPrefix(focusDateKey), [focusDateKey]);

  const rangeTintBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const selectedBg = isDark ? '#fafafa' : '#18181b';
  const selectedInk = isDark ? '#09090b' : '#ffffff';

  const onDayPress = useCallback(
    (dateKey: string, d: Date) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (mode === 'month') {
        onSelectMonth(d.getFullYear(), d.getMonth() + 1);
      } else {
        onSelectDay(dateKey);
      }
      onClose();
    },
    [mode, onClose, onSelectDay, onSelectMonth],
  );

  const jumpToToday = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMonthCursor(monthStartFromDateKey(todayDateKey));
    if (mode === 'day') {
      onSelectDay(todayDateKey);
      onClose();
    } else {
      const m = /^(\d{4})-(\d{2})/.exec(todayDateKey);
      if (m) onSelectMonth(parseInt(m[1], 10), parseInt(m[2], 10));
      onClose();
    }
  }, [mode, onClose, onSelectDay, onSelectMonth, todayDateKey]);

  const sheetTitle = mode === 'day' ? '날짜 선택' : '월 선택';
  const sheetHint =
    mode === 'day' ? '날짜를 탭하면 해당 주로 이동해요.' : '날짜를 탭하면 그 달로 이동해요.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.dim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="닫기"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.containerLow,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}>
          <View
            style={[
              styles.grabber,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
            ]}
          />
          <ThemedText style={[styles.title, { color: c.onSurface }]}>{sheetTitle}</ThemedText>
          <ThemedText style={[styles.hint, { color: c.onVariant }]}>{sheetHint}</ThemedText>

          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              onPress={() => setMonthCursor((prev) => addMonths(prev, -1))}
              style={[styles.monthNavBtn, { borderColor: c.catBorderIdle }]}>
              <ThemedText style={[styles.monthNavText, { color: c.onSurface }]}>‹</ThemedText>
            </Pressable>
            <ThemedText style={[styles.monthTitle, { color: c.onSurface }]} numberOfLines={1}>
              {monthTitle}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              onPress={() => setMonthCursor((prev) => addMonths(prev, 1))}
              style={[styles.monthNavBtn, { borderColor: c.catBorderIdle }]}>
              <ThemedText style={[styles.monthNavText, { color: c.onSurface }]}>›</ThemedText>
            </Pressable>
          </View>

          <View style={[styles.calendarFrame, { borderColor: c.catBorderIdle }]}>
            <Pressable
              onPress={jumpToToday}
              accessibilityRole="button"
              accessibilityLabel="오늘로 이동"
              style={[
                styles.todayBtn,
                {
                  borderColor: c.catBorderIdle,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              ]}>
              <ThemedText style={[styles.todayBtnText, { color: c.onSurface }]}>오늘</ThemedText>
            </Pressable>

            <View style={styles.weekHeaderRow}>
              {WEEKDAY_LABELS.map((label) => (
                <ThemedText key={label} style={[styles.weekHeaderText, { color: c.onVariant }]}>
                  {label}
                </ThemedText>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarDays.map((d) => {
                const dk = dateKeyFromDate(d);
                const inCurrentMonth = d.getMonth() === monthCursor.getMonth();
                const isToday = dk === todayDateKey;
                const isSelectedDay = dk === focusDateKey;
                const inSelectedWeek =
                  mode === 'day' &&
                  weekRange &&
                  dk >= weekRange.lo &&
                  dk <= weekRange.hi;
                const inSelectedMonth =
                  mode === 'month' &&
                  focusMonthPrefix.length > 0 &&
                  dateKeyMonthPrefix(dk) === focusMonthPrefix;
                const inRangeTint =
                  (inSelectedWeek || inSelectedMonth) && !isSelectedDay;

                return (
                  <Pressable
                    key={dk}
                    onPress={() => onDayPress(dk, d)}
                    style={[
                      styles.dayCell,
                      isSelectedDay && { backgroundColor: selectedBg },
                      inRangeTint && { backgroundColor: rangeTintBg },
                      !inCurrentMonth && styles.dayCellOutMonth,
                    ]}>
                    <ThemedText
                      style={[
                        styles.dayText,
                        { color: inCurrentMonth ? c.onSurface : c.onVariant },
                        isSelectedDay && {
                          color: selectedInk,
                          fontWeight: '800',
                        },
                        isToday && !isSelectedDay && { color: PRIMARY, fontWeight: '700' },
                      ]}>
                      {d.getDate()}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: c.catBorderIdle }]}>
            <ThemedText style={[styles.closeBtnText, { color: c.onSurface }]}>닫기</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    fontSize: 22,
    fontWeight: '600',
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  calendarFrame: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  todayBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  dayCellOutMonth: {
    opacity: 0.45,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
