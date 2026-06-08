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
  dateKeyMonthPrefix,
  formatMonthTitleKo,
  isSameMonth,
  monthStartFromDateKey,
} from '../lib/historyCalendarGrid';

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const PRIMARY = 'rgb(0, 0, 0)';

export type HistoryCalendarPeriod = 'today' | 'week' | 'month';

type Props = {
  visible: boolean;
  isDark: boolean;
  period: HistoryCalendarPeriod;
  focusDateKey: string;
  todayDateKey: string;
  sheetBg: string;
  ink: string;
  muted: string;
  border: string;
  hint: string;
  onClose: () => void;
  onSelectDateKey: (dateKey: string) => void;
};

export function HistoryCalendarOverlay({
  visible,
  isDark,
  period,
  focusDateKey,
  todayDateKey,
  sheetBg,
  ink,
  muted,
  border,
  hint,
  onClose,
  onSelectDateKey,
}: Props) {
  const insets = useSafeAreaInsets();
  const [monthCursor, setMonthCursor] = useState(() => monthStartFromDateKey(focusDateKey));
  const todayMonthStart = useMemo(() => monthStartFromDateKey(todayDateKey), [todayDateKey]);

  useEffect(() => {
    if (visible) {
      setMonthCursor(monthStartFromDateKey(focusDateKey));
    }
  }, [focusDateKey, visible]);

  const monthTitle = useMemo(() => formatMonthTitleKo(monthCursor), [monthCursor]);
  const calendarDays = useMemo(() => buildCalendarMonthGrid(monthCursor), [monthCursor]);

  const weekRange = useMemo(() => {
    if (period !== 'week') return null;
    return {
      lo: addDaysToLocalDateKey(focusDateKey, -6),
      hi: focusDateKey,
    };
  }, [focusDateKey, period]);

  const focusMonthPrefix = useMemo(() => dateKeyMonthPrefix(focusDateKey), [focusDateKey]);
  const canGoNextMonth = !isSameMonth(monthCursor, todayMonthStart);

  const rangeTintBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const selectedBg = isDark ? '#fafafa' : '#18181b';
  const selectedInk = isDark ? '#09090b' : '#ffffff';

  const onDayPress = useCallback(
    (dateKey: string) => {
      if (dateKey > todayDateKey) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelectDateKey(dateKey);
      onClose();
    },
    [onClose, onSelectDateKey, todayDateKey],
  );

  const jumpToToday = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMonthCursor(monthStartFromDateKey(todayDateKey));
    onSelectDateKey(todayDateKey);
    onClose();
  }, [onClose, onSelectDateKey, todayDateKey]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
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
              backgroundColor: sheetBg,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}>
          <View
            style={[
              styles.grabber,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
            ]}
          />

          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: ink }]}>날짜 선택</ThemedText>
            <ThemedText style={[styles.hint, { color: muted }]}>{hint}</ThemedText>
          </View>

          <View style={styles.monthHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              onPress={() => setMonthCursor((prev) => addMonths(prev, -1))}
              style={[styles.monthNavBtn, { borderColor: border }]}>
              <IconSymbol name="chevron.left" size={14} color={ink} />
            </Pressable>
            <ThemedText style={[styles.monthTitle, { color: ink }]} numberOfLines={1}>
              {monthTitle}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              disabled={!canGoNextMonth}
              onPress={() => {
                if (!canGoNextMonth) return;
                setMonthCursor((prev) => addMonths(prev, 1));
              }}
              style={[
                styles.monthNavBtn,
                { borderColor: border },
                !canGoNextMonth && styles.monthNavBtnDisabled,
              ]}>
              <IconSymbol name="chevron.right" size={14} color={canGoNextMonth ? ink : muted} />
            </Pressable>
          </View>

          <View style={[styles.calendarFrame, { borderColor: border }]}>
            <View style={styles.calendarTopRow}>
              <ThemedText style={[styles.calendarCaption, { color: muted }]}>
                {period === 'week' ? '7일 구간' : period === 'month' ? '해당 월' : '선택한 날'}
              </ThemedText>
              <Pressable
                onPress={jumpToToday}
                accessibilityRole="button"
                accessibilityLabel="오늘로 이동"
                style={[
                  styles.todayBtn,
                  {
                    borderColor: border,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  },
                ]}>
                <ThemedText style={[styles.todayBtnText, { color: ink }]}>오늘</ThemedText>
              </Pressable>
            </View>

            <View style={styles.weekHeaderRow}>
              {WEEKDAY_LABELS.map((label) => (
                <ThemedText key={label} style={[styles.weekHeaderText, { color: muted }]}>
                  {label}
                </ThemedText>
              ))}
            </View>

            <View style={styles.grid}>
              {calendarDays.map((d) => {
                const dk = dateKeyFromDate(d);
                const inCurrentMonth = d.getMonth() === monthCursor.getMonth();
                const isFuture = dk > todayDateKey;
                const isToday = dk === todayDateKey;
                const isSelectedDay = dk === focusDateKey;
                const inSelectedWeek =
                  period === 'week' && weekRange && dk >= weekRange.lo && dk <= weekRange.hi;
                const inSelectedMonth =
                  period === 'month' &&
                  focusMonthPrefix.length > 0 &&
                  dateKeyMonthPrefix(dk) === focusMonthPrefix;
                const inRangeTint = (inSelectedWeek || inSelectedMonth) && !isSelectedDay;

                return (
                  <Pressable
                    key={dk}
                    disabled={isFuture}
                    onPress={() => onDayPress(dk)}
                    style={[
                      styles.dayCell,
                      isSelectedDay && { backgroundColor: selectedBg },
                      inRangeTint && { backgroundColor: rangeTintBg },
                      !inCurrentMonth && styles.dayCellOutMonth,
                      isFuture && styles.dayCellDisabled,
                    ]}>
                    <ThemedText
                      style={[
                        styles.dayText,
                        { color: inCurrentMonth ? ink : muted },
                        isSelectedDay && { color: selectedInk, fontWeight: '800' },
                        isToday && !isSelectedDay && { color: PRIMARY, fontWeight: '700' },
                        isFuture && { color: muted, opacity: 0.45 },
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
            style={[styles.closeBtn, { borderColor: border }]}>
            <ThemedText style={[styles.closeBtnText, { color: ink }]}>닫기</ThemedText>
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
  header: {
    gap: 4,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  hint: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavBtnDisabled: {
    opacity: 0.35,
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
  calendarTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  calendarCaption: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
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
  dayCellDisabled: {
    opacity: 0.35,
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
