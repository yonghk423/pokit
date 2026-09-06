import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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

const PRIMARY = 'rgb(0, 0, 0)';
const WEEKDAY_HEADER_KEYS = [
  'goalDetail.weekday.mon',
  'goalDetail.weekday.tue',
  'goalDetail.weekday.wed',
  'goalDetail.weekday.thu',
  'goalDetail.weekday.fri',
  'goalDetail.weekday.sat',
  'goalDetail.weekday.sun',
] as const;

const WEIGHT_STEP_KG = 0.1;
const DEFAULT_DRAFT_KG = 70;

type Palette = GoalDetailSettingsPalette;

type Props = {
  weightLogs: FastingWeightLogs;
  onChangeWeightLogs: (next: FastingWeightLogs) => void;
  onLatestWeightChange?: (weightKg: number) => void;
  palette: Palette;
};

function roundKg1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatKg(n: number): string {
  return roundKg1(n).toFixed(1);
}

export function WeightLogCalendarSection({
  weightLogs,
  onChangeWeightLogs,
  onLatestWeightChange,
  palette,
}: Props) {
  const { t } = useTranslation();
  const isNote = useUiSurfacePresentation() === 'note';
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthStart, setMonthStart] = useState(() => toMonthStart(new Date()));
  /** 선택일 편집용 체중 — 로그가 없으면 최근값/기본값으로 시작 */
  const [draftKg, setDraftKg] = useState(DEFAULT_DRAFT_KG);

  const monthGrid = useMemo(() => buildMonthCalendarGrid(monthStart), [monthStart]);
  const monthTitle = useMemo(() => formatMonthTitleKo(monthStart), [monthStart]);
  const selectedWeight = readWeightLogForDate(weightLogs, selectedDateKey);
  const weightLogsRef = useRef(weightLogs);
  weightLogsRef.current = weightLogs;

  const resolveFallbackKg = useCallback((logs: FastingWeightLogs) => {
    const keys = Object.keys(logs).sort();
    if (keys.length === 0) return DEFAULT_DRAFT_KG;
    const latestKey = keys[keys.length - 1]!;
    return logs[latestKey] ?? DEFAULT_DRAFT_KG;
  }, []);

  useEffect(() => {
    if (selectedWeight != null) {
      setDraftKg(selectedWeight);
      return;
    }
    setDraftKg(clampWeightKg(resolveFallbackKg(weightLogs)));
  }, [resolveFallbackKg, selectedDateKey, selectedWeight, weightLogs]);

  const persistWeight = useCallback(
    (dateKey: string, weightKg: number, logs: FastingWeightLogs = weightLogsRef.current) => {
      const nextLogs = setFastingWeightLog(logs, dateKey, clampWeightKg(weightKg));
      onChangeWeightLogs(nextLogs);
      onLatestWeightChange?.(clampWeightKg(weightKg));
      return nextLogs;
    },
    [onChangeWeightLogs, onLatestWeightChange],
  );

  const selectDate = useCallback(
    (dateKey: string) => {
      if (dateKey === selectedDateKey) return;
      // 날짜 이동 전 현재 드래프트를 저장 — 저장 버튼 없이도 기록이 남도록
      persistWeight(selectedDateKey, draftKg);
      void Haptics.selectionAsync();
      setSelectedDateKey(dateKey);
    },
    [draftKg, persistWeight, selectedDateKey],
  );

  const nudgeDraft = useCallback(
    (dir: -1 | 1) => {
      const next = clampWeightKg(draftKg + dir * WEIGHT_STEP_KG);
      if (Math.abs(next - draftKg) < 1e-9) return;
      void Haptics.selectionAsync();
      setDraftKg(next);
      persistWeight(selectedDateKey, next);
    },
    [draftKg, persistWeight, selectedDateKey],
  );

  const clearWeight = useCallback(() => {
    const nextLogs = removeFastingWeightLog(weightLogsRef.current, selectedDateKey);
    onChangeWeightLogs(nextLogs);
    setDraftKg(clampWeightKg(resolveFallbackKg(nextLogs)));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onChangeWeightLogs, resolveFallbackKg, selectedDateKey]);

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
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.fasting.prevMonth')}
          onPress={() => setMonthStart((m) => addMonths(m, -1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={14} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.monthTitle, { color: palette.onSurface }]}>{monthTitle}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.fasting.nextMonth')}
          onPress={() => setMonthStart((m) => addMonths(m, 1))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={14} color={palette.onSurface} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADER_KEYS.map((dayKey) => (
          <ThemedText key={dayKey} style={[styles.weekdayLabel, { color: palette.onVariant }]}>
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
          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('goalDetail.fasting.selectDateA11y', {
                date: formatDateKeyDisplayKo(dateKey),
              })}
              onPress={() => selectDate(dateKey)}
              style={[
                styles.dayCell,
                selected && {
                  backgroundColor: palette.usesLightInk
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.08)',
                  borderColor: palette.onSurface,
                },
                !inMonth && styles.dayCellMuted,
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  {
                    color: inMonth ? palette.onSurface : palette.outline,
                    fontWeight: isToday ? '900' : selected ? '800' : '600',
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

      <View style={[styles.inputBlock, { borderColor: palette.outlineVariant }]}>
        <ThemedText style={[styles.selectedDate, { color: palette.onVariant }]}>
          {formatDateKeyDisplayKo(selectedDateKey)}
        </ThemedText>
        <View style={styles.inputRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('customFlowTemplate.decreaseByA11y', {
              step: formatKg(WEIGHT_STEP_KG),
            })}
            hitSlop={6}
            onPress={() => nudgeDraft(-1)}
            style={({ pressed }) => [
              styles.stepBtn,
              { borderColor: palette.outline, opacity: pressed ? 0.75 : 1 },
            ]}>
            <IconSymbol name="minus" size={13} color={palette.onSurface} />
          </Pressable>
          <ThemedText style={[styles.stepValue, { color: palette.onSurface }]}>
            {formatKg(draftKg)}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('customFlowTemplate.increaseByA11y', {
              step: formatKg(WEIGHT_STEP_KG),
            })}
            hitSlop={6}
            onPress={() => nudgeDraft(1)}
            style={({ pressed }) => [
              styles.stepBtn,
              { borderColor: palette.outline, opacity: pressed ? 0.75 : 1 },
            ]}>
            <IconSymbol name="plus" size={13} color={palette.onSurface} />
          </Pressable>
          {selectedWeight != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.fasting.deleteLogA11y')}
              onPress={clearWeight}
              hitSlop={8}
              style={styles.clearBtn}>
              <IconSymbol name="trash" size={14} color={palette.onVariant} />
            </Pressable>
          ) : null}
        </View>
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
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 13, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: 2,
    gap: 0,
  },
  dayLabel: { fontSize: 12, lineHeight: 14 },
  weightMini: { fontSize: 8, fontWeight: '700', lineHeight: 10 },
  dayCellMuted: { opacity: 0.35 },
  inputBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 8,
  },
  selectedDate: { fontSize: 12, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 44,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  clearBtn: { padding: 6, marginLeft: 4 },
});
