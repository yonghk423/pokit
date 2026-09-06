import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatHhmmClockKo, getLocalDateKey, useDayPlanDraftStore } from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { syncRoutineWindowCompletionsToHistory } from '@features/history-routine-sync';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  loadDayMealSlotSchedule,
  resolvePriorityMealSlot,
  type DayMealSlot,
} from '@shared/lib/storage';
import {
  RoutineAtmosphereFooterStrip,
  RoutineTabAtmosphere,
} from '@shared/ui/routine-atmosphere';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PostItCardShell } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { buildFlowHistoryPalette } from '../lib/flowHistoryPalette';

import {
  buildMonthlyFlowHistory,
  buildMonthlyHistorySummary,
  historyPeriodDescription,
} from '../lib/buildMonthlyFlowHistory';
import {
  addDaysToHistoryDateKey,
  buildWeeklyFlowHistory,
  buildWeeklyHistorySummary,
  formatWeekRangeLabelKo,
  resolveWeekStartForAnchor,
} from '../lib/buildWeeklyFlowHistory';
import {
  canGoNextMonth,
  formatMonthLabelKo,
  resolveMonthPrefix,
  shiftMonthPrefix,
  type HistoryPeriod,
} from '../lib/historyPeriodRange';
import {
  groupMonthlyFlowHistoryRows,
  groupWeeklyFlowHistoryRows,
} from '../lib/groupFlowHistoryRows';
import { HistoryPeriodTabs } from './HistoryPeriodTabs';
import { MonthlyFlowHistoryCard } from './MonthlyFlowHistoryCard';
import { MonthlyHistorySummaryCard } from './MonthlyHistorySummaryCard';
import { WeeklyFlowHistoryCard } from './WeeklyFlowHistoryCard';
import { WeeklyHistorySummaryCard } from './WeeklyHistorySummaryCard';

/** 하단 히스토리 탭 — 주간·월간 플로우 완료 기록 */
export function DayPlanStatisticsPage() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const todayDateKey = getLocalDateKey();

  const [period, setPeriod] = useState<HistoryPeriod>('week');
  const [anchorDateKey, setAnchorDateKey] = useState(todayDateKey);
  const [mealSlotSchedule] = useState(() => loadDayMealSlotSchedule());

  const { priorityCategoryOrder, priorityMealSlotOverrides } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityCategoryOrder: s.priorityCategoryOrder,
      priorityMealSlotOverrides: s.priorityMealSlotOverrides,
    })),
  );

  const { isHydrated, hydrate, reloadFromStorage, dailyStatsByDate } = useHistoryStore(
    useShallow((s) => ({
      isHydrated: s.isHydrated,
      hydrate: s.hydrate,
      reloadFromStorage: s.reloadFromStorage,
      dailyStatsByDate: s.dailyStatsByDate,
    })),
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      syncRoutineWindowCompletionsToHistory(todayDateKey);
      reloadFromStorage();
    }, [reloadFromStorage, todayDateKey]),
  );

  const palette = useMemo(() => buildFlowHistoryPalette(isDark), [isDark]);

  const monthPrefix = useMemo(() => resolveMonthPrefix(anchorDateKey), [anchorDateKey]);
  const weekStartDateKey = useMemo(
    () => resolveWeekStartForAnchor(anchorDateKey),
    [anchorDateKey],
  );
  const periodNavLabel = useMemo(
    () =>
      period === 'week'
        ? formatWeekRangeLabelKo(weekStartDateKey, locale)
        : formatMonthLabelKo(monthPrefix, locale),
    [locale, monthPrefix, period, weekStartDateKey],
  );
  const canGoNext = useMemo(
    () =>
      period === 'week'
        ? anchorDateKey < todayDateKey
        : canGoNextMonth(monthPrefix, todayDateKey),
    [anchorDateKey, monthPrefix, period, todayDateKey],
  );

  const timeLabelByCategoryKey = useMemo(() => {
    const overrides = new Map<string, DayMealSlot>(
      Object.entries(priorityMealSlotOverrides) as [string, DayMealSlot][],
    );
    const map: Record<string, string> = {};
    priorityCategoryOrder.forEach((key, index) => {
      const slot = resolvePriorityMealSlot(key, index, overrides);
      map[key] = formatHhmmClockKo(mealSlotSchedule[slot]);
    });
    return map;
  }, [mealSlotSchedule, priorityCategoryOrder, priorityMealSlotOverrides]);

  const weeklyRows = useMemo(
    () =>
      buildWeeklyFlowHistory({
        dailyStatsByDate,
        weekStartDateKey,
        timeLabelByCategoryKey,
      }),
    [dailyStatsByDate, timeLabelByCategoryKey, weekStartDateKey],
  );

  const monthlyRows = useMemo(
    () =>
      buildMonthlyFlowHistory({
        dailyStatsByDate,
        monthPrefix,
        timeLabelByCategoryKey,
      }),
    [dailyStatsByDate, monthPrefix, timeLabelByCategoryKey],
  );

  const weeklyGroups = useMemo(() => groupWeeklyFlowHistoryRows(weeklyRows), [weeklyRows]);

  const monthlyGroups = useMemo(() => groupMonthlyFlowHistoryRows(monthlyRows), [monthlyRows]);

  const weeklySummary = useMemo(
    () => buildWeeklyHistorySummary({ dailyStatsByDate, weekStartDateKey }),
    [dailyStatsByDate, weekStartDateKey],
  );

  const monthlySummary = useMemo(
    () => buildMonthlyHistorySummary({ dailyStatsByDate, monthPrefix }),
    [dailyStatsByDate, monthPrefix],
  );

  const shiftPeriod = useCallback(
    (delta: number) => {
      if (period === 'week') {
        const nextAnchor = addDaysToHistoryDateKey(anchorDateKey, delta * 7);
        if (delta > 0 && nextAnchor > todayDateKey) {
          setAnchorDateKey(todayDateKey);
          return;
        }
        setAnchorDateKey(nextAnchor);
        return;
      }

      const nextMonth = shiftMonthPrefix(monthPrefix, delta);
      if (delta > 0 && !canGoNextMonth(nextMonth, todayDateKey)) {
        setAnchorDateKey(todayDateKey);
        return;
      }
      setAnchorDateKey(`${nextMonth}-01`);
    },
    [anchorDateKey, monthPrefix, period, todayDateKey],
  );

  const flowRows = period === 'week' ? weeklyGroups : monthlyGroups;
  const emptyTitle =
    period === 'week' ? t('history.empty.weekTitle') : t('history.empty.monthTitle');
  const emptyBody =
    period === 'week'
      ? t('history.empty.weekBody')
      : t('history.empty.monthBody');
  const atmosphereVariant = period === 'week' ? 'historyWeek' : 'historyMonth';

  return (
    <ThemedView
      style={[styles.root, { backgroundColor: palette.pageBg }]}
      lightColor={palette.pageBg}
      darkColor={palette.pageBg}>
      <RoutineTabAtmosphere variant={atmosphereVariant} isDark={isDark} />
      <View style={styles.foreground}>
        <View style={styles.stickyHeader}>
          <HistoryPeriodTabs
            period={period}
            onSelectPeriod={setPeriod}
            isDark={isDark}
          />

          <View style={styles.periodNavRow}>
            <View
              style={[
                styles.periodNavShell,
                { marginRight: 3, marginBottom: 3 },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.periodNavShadow,
                  {
                    backgroundColor: palette.shadow,
                    transform: [{ translateX: 3 }, { translateY: 3 }],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={period === 'week' ? t('history.nav.prevWeek') : t('history.nav.prevMonth')}
                hitSlop={8}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  shiftPeriod(-1);
                }}
                style={({ pressed }) => [
                  styles.periodNavBtn,
                  {
                    backgroundColor: pressed ? palette.accentSoft : palette.actionBg,
                  },
                  pressed && styles.periodNavPressed,
                ]}>
                <IconSymbol name="chevron.left" size={13} color={palette.ink} />
              </Pressable>
            </View>
            <View style={[styles.periodLabelShell, { marginRight: 3, marginBottom: 3 }]}>
              <View
                pointerEvents="none"
                style={[
                  styles.periodLabelShadow,
                  {
                    backgroundColor: palette.shadow,
                    transform: [{ translateX: 3 }, { translateY: 3 }],
                  },
                ]}
              />
              <View
                style={[
                  styles.periodLabelFace,
                  { backgroundColor: palette.card },
                ]}>
                <ThemedText style={[styles.periodNavLabel, { color: palette.ink }]}>
                  {periodNavLabel}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.periodNavShell,
                { marginRight: 3, marginBottom: 3 },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.periodNavShadow,
                  {
                    backgroundColor: palette.shadow,
                    transform: [{ translateX: 3 }, { translateY: 3 }],
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={period === 'week' ? t('history.nav.nextWeek') : t('history.nav.nextMonth')}
                disabled={!canGoNext}
                hitSlop={8}
                onPress={() => {
                  if (!canGoNext) return;
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  shiftPeriod(1);
                }}
                style={({ pressed }) => [
                  styles.periodNavBtn,
                  {
                    backgroundColor:
                      pressed && canGoNext ? palette.accentSoft : palette.actionBg,
                  },
                  pressed && canGoNext && styles.periodNavPressed,
                ]}>
                <IconSymbol
                  name="chevron.right"
                  size={13}
                  color={canGoNext ? palette.ink : palette.muted}
                />
              </Pressable>
            </View>
          </View>

          <ThemedText style={styles.pageDesc} lightColor={palette.muted} darkColor={palette.muted}>
            {historyPeriodDescription(period)}
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 12) + 12,
            },
          ]}
          showsVerticalScrollIndicator={false}>
          {period === 'month' ? (
            <MonthlyHistorySummaryCard summary={monthlySummary} palette={palette} />
          ) : (
            <WeeklyHistorySummaryCard summary={weeklySummary} palette={palette} />
          )}

          {!isHydrated ? (
            <PostItCardShell
              isDark={isDark}
              faceColor={palette.card}
              borderColor={palette.ink}
              borderWidth={1}
              contentStyle={styles.emptyContent}>
              <ThemedText style={[styles.emptyTitle, { color: palette.ink }]}>
                {t('history.loading')}
              </ThemedText>
            </PostItCardShell>
          ) : flowRows.length === 0 ? (
            <PostItCardShell
              isDark={isDark}
              faceColor={palette.card}
              borderColor={palette.ink}
              borderWidth={1}
              contentStyle={styles.emptyContent}>
              <ThemedText style={[styles.emptyTitle, { color: palette.ink }]}>{emptyTitle}</ThemedText>
              <ThemedText style={styles.emptyBody} lightColor={palette.muted} darkColor={palette.muted}>
                {emptyBody}
              </ThemedText>
            </PostItCardShell>
          ) : period === 'week' ? (
            <View style={styles.cardList}>
              {weeklyGroups.map((group) => (
                <WeeklyFlowHistoryCard
                  key={group.categoryKey}
                  group={group}
                  palette={palette}
                />
              ))}
            </View>
          ) : (
            <View style={styles.cardList}>
              {monthlyGroups.map((group) => (
                <MonthlyFlowHistoryCard
                  key={group.categoryKey}
                  group={group}
                  monthPrefix={monthPrefix}
                  palette={palette}
                />
              ))}
            </View>
          )}

          <ThemedText style={styles.helperText} lightColor={palette.muted} darkColor={palette.muted}>
            {t('history.helper')}
          </ThemedText>

          <RoutineAtmosphereFooterStrip variant={atmosphereVariant} isDark={isDark} />
        </ScrollView>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  foreground: {
    flex: 1,
    minHeight: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 10,
  },
  pageDesc: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  periodNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodNavShell: {
    position: 'relative',
  },
  periodNavShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  periodNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  periodNavPressed: {
    opacity: 0.92,
  },
  periodLabelShell: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
  },
  periodLabelShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 0,
    borderRadius: 0,
  },
  periodLabelFace: {
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  periodNavLabel: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  cardList: {
    width: '100%',
    gap: 10,
  },
  emptyContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
  emptyBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
