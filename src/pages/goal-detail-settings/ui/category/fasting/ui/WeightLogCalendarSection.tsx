import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  addMonths,
  buildMonthCalendarGrid,
  dateKeyFromDate,
  formatDateKeyDisplayKo,
  formatMonthTitleKo,
  getLocalDateKey,
  toMonthStart,
} from '@entities/day-plan';
import {
  clampWeightKg,
  readWeightLogForDate,
  removeFastingWeightLog,
  setFastingWeightLog,
  type FastingWeightLogs,
} from '@entities/day-plan/lib/weightLog';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useTranslation } from '@shared/lib/i18n';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailSettingsPalette } from '../../lib/settingsPalette';

const WEEKDAY_HEADER_KEYS = [
  'goalDetail.weekday.mon',
  'goalDetail.weekday.tue',
  'goalDetail.weekday.wed',
  'goalDetail.weekday.thu',
  'goalDetail.weekday.fri',
  'goalDetail.weekday.sat',
  'goalDetail.weekday.sun',
] as const;

const DEFAULT_DRAFT_KG = 70;

/** 월=0 … 토=5 · 일=6 — 주말만 구분색 */
function weekendLabelColor(weekdayIndexMon0: number, fallback: string, lightInk: boolean): string {
  if (weekdayIndexMon0 === 5) return lightInk ? '#9EC4F0' : '#3D6FA6';
  if (weekdayIndexMon0 === 6) return lightInk ? '#F0A8A8' : '#C45C5C';
  return fallback;
}

type Palette = GoalDetailSettingsPalette;

type Props = {
  weightLogs: FastingWeightLogs;
  currentWeightKg?: number;
  onChangeWeightLogs: (next: FastingWeightLogs) => void;
  palette: Palette;
};

export function WeightLogCalendarSection({
  weightLogs,
  currentWeightKg,
  onChangeWeightLogs,
  palette,
}: Props) {
  const { t } = useTranslation();
  const isNote = useUiSurfacePresentation() === 'note';
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthStart, setMonthStart] = useState(() => toMonthStart(new Date()));

  const monthGrid = useMemo(() => buildMonthCalendarGrid(monthStart), [monthStart]);
  const monthTitle = useMemo(() => formatMonthTitleKo(monthStart), [monthStart]);
  const hasLogs = Object.keys(weightLogs).length > 0;
  const weightLogsRef = useRef(weightLogs);
  weightLogsRef.current = weightLogs;

  const resolveFallbackKg = useCallback(
    (logs: FastingWeightLogs) => {
      const keys = Object.keys(logs).sort();
      if (keys.length === 0) {
        return clampWeightKg(currentWeightKg ?? DEFAULT_DRAFT_KG);
      }
      const latestKey = keys[keys.length - 1]!;
      return logs[latestKey] ?? clampWeightKg(currentWeightKg ?? DEFAULT_DRAFT_KG);
    },
    [currentWeightKg],
  );

  const persistWeight = useCallback(
    (dateKey: string, weightKg: number, logs: FastingWeightLogs = weightLogsRef.current) => {
      const nextLogs = setFastingWeightLog(logs, dateKey, clampWeightKg(weightKg));
      onChangeWeightLogs(nextLogs);
      return nextLogs;
    },
    [onChangeWeightLogs],
  );

  const clearDateWeight = useCallback(
    (dateKey: string) => {
      onChangeWeightLogs(removeFastingWeightLog(weightLogsRef.current, dateKey));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [onChangeWeightLogs],
  );

  const selectDate = useCallback(
    (dateKey: string, day: Date, inMonth: boolean) => {
      if (dateKey > todayKey) return;
      if (!inMonth) setMonthStart(toMonthStart(day));

      const logs = weightLogsRef.current;
      const existing = readWeightLogForDate(logs, dateKey);

      if (existing != null && dateKey === selectedDateKey) {
        clearDateWeight(dateKey);
        return;
      }

      if (existing == null) {
        persistWeight(dateKey, resolveFallbackKg(logs), logs);
      }

      void Haptics.selectionAsync();
      setSelectedDateKey(dateKey);
    },
    [clearDateWeight, persistWeight, resolveFallbackKg, selectedDateKey, todayKey],
  );

  const resetAllLogs = useCallback(() => {
    if (!hasLogs) return;
    Alert.alert(t('goalDetail.fasting.resetLogsTitle'), t('goalDetail.fasting.resetLogsMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          onChangeWeightLogs({});
          setSelectedDateKey(todayKey);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }, [hasLogs, onChangeWeightLogs, t, todayKey]);

  return (
    <View style={[styles.wrap, !isNote && { borderColor: palette.outline }, isNote && styles.wrapNote]}>
      <View style={styles.headerRow}>
        <IconSymbol name="calendar" size={16} color={palette.onSurface} />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: palette.onSurface }]}>
            {t('goalDetail.fasting.weightLogTitle')}
          </ThemedText>
          <ThemedText style={[styles.hint, { color: palette.onVariant }]}>
            {t('goalDetail.fasting.weightLogHint')}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.fasting.resetLogsA11y')}
          accessibilityState={{ disabled: !hasLogs }}
          disabled={!hasLogs}
          hitSlop={8}
          onPress={resetAllLogs}
          style={styles.resetBtn}>
          <ThemedText
            style={[
              styles.resetLabel,
              { color: palette.onVariant, opacity: hasLogs ? 1 : 0.35 },
            ]}>
            {t('common.reset')}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.fasting.prevMonth')}
          onPress={() => setMonthStart((m) => addMonths(m, -1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={18} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.monthTitle, { color: palette.onSurface }]}>{monthTitle}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.fasting.nextMonth')}
          onPress={() => setMonthStart((m) => addMonths(m, 1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={18} color={palette.onSurface} />
        </Pressable>
      </View>

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
          const logged = readWeightLogForDate(weightLogs, dateKey);
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
              accessibilityLabel={t('goalDetail.fasting.selectDateA11y', {
                date: formatDateKeyDisplayKo(dateKey),
              })}
              disabled={isFuture}
              onPress={() => selectDate(dateKey, day, inMonth)}
              style={[
                styles.dayCell,
                selected && {
                  backgroundColor: palette.usesLightInk
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.08)',
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
              {logged != null ? (
                <ThemedText style={[styles.weightMini, { color: palette.onVariant }]} numberOfLines={1}>
                  {logged.toFixed(1)}
                </ThemedText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  wrapNote: {
    borderWidth: 0,
    padding: 0,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1, gap: 2 },
  resetBtn: { paddingVertical: 2, paddingHorizontal: 2 },
  resetLabel: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 22, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: 3,
    gap: 1,
  },
  dayLabel: { fontSize: 20, lineHeight: 24 },
  weightMini: { fontSize: 13, fontWeight: '700', lineHeight: 16 },
  dayCellMuted: { opacity: 0.35 },
});
