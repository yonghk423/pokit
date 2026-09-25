import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  addMonths,
  buildMonthCalendarGrid,
  dateKeyFromDate,
  formatDateKeyDisplayKo,
  formatMonthTitleKo,
  getLocalDateKey,
  pagesToReadFromLog,
  readPageLogForDate,
  removeReadingPageLog,
  resolveFallbackReadingPages,
  setReadingPageLog,
  sumPagesFromReadingLogsInMonth,
  toMonthStart,
  type ReadingPageDayLog,
  type ReadingPageLogs,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { readingPurpleTint } from '../lib/readingAccent';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const WEEKDAY_HEADER_KEYS = [
  'goalDetail.weekday.mon',
  'goalDetail.weekday.tue',
  'goalDetail.weekday.wed',
  'goalDetail.weekday.thu',
  'goalDetail.weekday.fri',
  'goalDetail.weekday.sat',
  'goalDetail.weekday.sun',
] as const;

function weekendLabelColor(weekdayIndexMon0: number, fallback: string, lightInk: boolean): string {
  if (weekdayIndexMon0 === 5) return lightInk ? '#9EC4F0' : '#3D6FA6';
  if (weekdayIndexMon0 === 6) return lightInk ? '#F0A8A8' : '#C45C5C';
  return fallback;
}

type Props = {
  pageLogs: ReadingPageLogs;
  selectedDateKey: string;
  monthStart: Date;
  fallbackPages: ReadingPageDayLog;
  palette: Palette;
  onChangePageLogs: (next: ReadingPageLogs) => void;
  onSelectDate: (dateKey: string) => void;
  onChangeMonthStart: (next: Date) => void;
};

/**
 * 날짜별 시작·목표 페이지 캘린더.
 * 빈 날짜를 누르면 이전 날 분량에서 이어 읽기 값이 기본 입력된다.
 */
export function ReadingPageLogCalendarSection({
  pageLogs,
  selectedDateKey,
  monthStart,
  fallbackPages,
  palette,
  onChangePageLogs,
  onSelectDate,
  onChangeMonthStart,
}: Props) {
  const { t } = useTranslation();
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const monthGrid = useMemo(() => buildMonthCalendarGrid(monthStart), [monthStart]);
  const monthTitle = useMemo(() => formatMonthTitleKo(monthStart), [monthStart]);
  const hasLogs = Object.keys(pageLogs).length > 0;
  const pageLogsRef = useRef(pageLogs);
  pageLogsRef.current = pageLogs;

  const maxDayPages = useMemo(() => {
    let max = 0;
    for (const log of Object.values(pageLogs)) {
      max = Math.max(max, pagesToReadFromLog(log));
    }
    return max;
  }, [pageLogs]);

  const monthPagesTotal = useMemo(
    () =>
      sumPagesFromReadingLogsInMonth(
        pageLogs,
        monthStart.getFullYear(),
        monthStart.getMonth(),
      ),
    [monthStart, pageLogs],
  );

  const monthLoggedDays = useMemo(() => {
    const prefix = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-`;
    return Object.keys(pageLogs).filter((key) => key.startsWith(prefix)).length;
  }, [monthStart, pageLogs]);

  const clearDateLog = useCallback(
    (dateKey: string) => {
      const next = removeReadingPageLog(pageLogsRef.current, dateKey);
      pageLogsRef.current = next;
      onChangePageLogs(next);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [onChangePageLogs],
  );

  const selectDate = useCallback(
    (dateKey: string, day: Date, inMonth: boolean) => {
      if (dateKey > todayKey) return;
      if (!inMonth) onChangeMonthStart(toMonthStart(day));

      const logs = pageLogsRef.current;
      const existing = readPageLogForDate(logs, dateKey);

      if (existing != null && dateKey === selectedDateKey) {
        clearDateLog(dateKey);
        onSelectDate(dateKey);
        return;
      }

      if (existing == null) {
        const seeded = resolveFallbackReadingPages(logs, fallbackPages);
        const next = setReadingPageLog(logs, dateKey, seeded);
        // 연속 탭 시 props 반영 전에도 다음 시드가 누적을 이어가도록 즉시 반영
        pageLogsRef.current = next;
        onChangePageLogs(next);
      }

      void Haptics.selectionAsync();
      onSelectDate(dateKey);
    },
    [
      clearDateLog,
      fallbackPages,
      onChangeMonthStart,
      onChangePageLogs,
      onSelectDate,
      selectedDateKey,
      todayKey,
    ],
  );

  const resetAllLogs = useCallback(() => {
    if (!hasLogs) return;
    Alert.alert(t('goalDetail.reading.resetLogsTitle'), t('goalDetail.reading.resetLogsMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          onChangePageLogs({});
          onSelectDate(todayKey);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }, [hasLogs, onChangePageLogs, onSelectDate, t, todayKey]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <IconSymbol name="calendar" size={16} color={palette.onSurface} />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: palette.onSurface }]}>
            {t('goalDetail.reading.pageLogTitle')}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: palette.onVariant }]}>
            {t('goalDetail.reading.pageLogHintShort')}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.reading.resetLogsA11y')}
          accessibilityState={{ disabled: !hasLogs }}
          disabled={!hasLogs}
          hitSlop={8}
          onPress={resetAllLogs}
          style={styles.resetBtn}>
          <ThemedText
            style={[styles.resetLabel, { color: palette.onVariant, opacity: hasLogs ? 1 : 0.35 }]}>
            {t('common.reset')}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.reading.prevMonth')}
          onPress={() => onChangeMonthStart(addMonths(monthStart, -1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={16} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.monthTitle, { color: palette.onSurface }]}>{monthTitle}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.reading.nextMonth')}
          onPress={() => onChangeMonthStart(addMonths(monthStart, 1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={16} color={palette.onSurface} />
        </Pressable>
      </View>

      {monthPagesTotal > 0 ? (
        <ThemedText style={[styles.monthSummary, { color: palette.onVariant }]}>
          {t('goalDetail.reading.monthPagesSummary', { pages: monthPagesTotal })}
          {monthLoggedDays > 0
            ? ` · ${t('goalDetail.reading.monthPagesDays', { days: monthLoggedDays })}`
            : ''}
        </ThemedText>
      ) : null}

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADER_KEYS.map((dayKey, index) => (
          <ThemedText
            key={dayKey}
            style={[
              styles.weekdayLabel,
              { color: weekendLabelColor(index, palette.onVariant, palette.usesLightInk) },
            ]}>
            {t(dayKey)}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {monthGrid.map((day) => {
          const dateKey = dateKeyFromDate(day);
          const inMonth = day.getMonth() === monthStart.getMonth();
          const selected = dateKey === selectedDateKey;
          const logged = readPageLogForDate(pageLogs, dateKey);
          const pages = logged ? pagesToReadFromLog(logged) : 0;
          const isToday = dateKey === todayKey;
          const isFuture = dateKey > todayKey;
          const weekdayIndexMon0 = (day.getDay() + 6) % 7;
          const dayColor = inMonth
            ? weekendLabelColor(weekdayIndexMon0, palette.onSurface, palette.usesLightInk)
            : palette.outline;
          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: isFuture }}
              accessibilityLabel={t('goalDetail.reading.selectDateA11y', {
                date: formatDateKeyDisplayKo(dateKey),
              })}
              disabled={isFuture}
              onPress={() => selectDate(dateKey, day, inMonth)}
              style={[
                styles.dayCell,
                selected && {
                  backgroundColor: readingPurpleTint(palette.usesLightInk),
                  borderColor: palette.onSurface,
                },
                (!inMonth || isFuture) && styles.dayCellMuted,
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  {
                    color: dayColor,
                    fontWeight: isToday || selected ? '900' : '600',
                  },
                ]}>
                {day.getDate()}
              </ThemedText>
              {logged != null && pages > 0 ? (
                <ThemedText
                  style={[
                    styles.pagesMini,
                    {
                      color: palette.onVariant,
                      opacity: 0.55 + Math.min(0.45, pages / Math.max(maxDayPages, 1)),
                    },
                  ]}
                  numberOfLines={1}>
                  {pages}p
                </ThemedText>
              ) : (
                <View style={styles.pagesMiniPlaceholder} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginTop: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1, gap: 2 },
  resetBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  resetLabel: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  monthSummary: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    textAlign: 'center',
  },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: 4,
    gap: 2,
  },
  dayLabel: { fontSize: 15, lineHeight: 18 },
  dayCellMuted: { opacity: 0.35 },
  pagesMini: { fontSize: 10, fontWeight: '800', lineHeight: 12 },
  pagesMiniPlaceholder: { height: 12 },
});
