import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatHhmmClockKo, getLocalDateKey, useDayPlanDraftStore } from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { syncRoutineWindowCompletionsToHistory } from '@features/history-routine-sync';
import { buildFlowHistoryPalette } from '../lib/flowHistoryPalette';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadDayMealSlotSchedule,
  resolvePriorityMealSlot,
  type DayMealSlot,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

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
        ? formatWeekRangeLabelKo(weekStartDateKey)
        : formatMonthLabelKo(monthPrefix),
    [monthPrefix, period, weekStartDateKey],
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
    period === 'week' ? '이번 주 기록이 아직 없어요' : '이번 달 기록이 아직 없어요';
  const emptyBody =
    period === 'week'
      ? '오늘 탭에서 루틴을 완료하면 여기에 요일별로 쌓여요.'
      : '오늘 탭에서 루틴을 완료하면 여기에 날짜별로 쌓여요.';

  return (
    <ThemedView
      style={[styles.root, { backgroundColor: palette.pageBg }]}
      lightColor={palette.pageBg}
      darkColor={palette.pageBg}>
      <View style={[styles.stickyHeader, { backgroundColor: palette.pageBg }]}>
        <ThemedText style={styles.pageDesc} lightColor={palette.muted} darkColor={palette.muted}>
          {historyPeriodDescription(period)}
        </ThemedText>

        <HistoryPeriodTabs
          period={period}
          onSelectPeriod={setPeriod}
          isDark={isDark}
        />

        <View style={styles.periodNavRow}>
          <View
            style={[
              styles.periodNavShell,
              { marginRight: 2, marginBottom: 2 },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.periodNavShadow,
                {
                  backgroundColor: palette.shadow,
                  borderColor: palette.border,
                  transform: [{ translateX: 2 }, { translateY: 2 }],
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={period === 'week' ? '이전 주' : '이전 달'}
              hitSlop={8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                shiftPeriod(-1);
              }}
              style={({ pressed }) => [
                styles.periodNavBtn,
                {
                  backgroundColor: pressed ? palette.accentSoft : palette.actionBg,
                  borderColor: palette.border,
                },
                pressed && styles.periodNavPressed,
              ]}>
              <IconSymbol name="chevron.left" size={13} color={palette.ink} />
            </Pressable>
          </View>
          <ThemedText style={[styles.periodNavLabel, { color: palette.ink }]}>
            {periodNavLabel}
          </ThemedText>
          <View
            style={[
              styles.periodNavShell,
              { marginRight: 2, marginBottom: 2 },
            ]}>
            <View
              pointerEvents="none"
              style={[
                styles.periodNavShadow,
                {
                  backgroundColor: palette.shadow,
                  borderColor: palette.border,
                  transform: [{ translateX: 2 }, { translateY: 2 }],
                },
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={period === 'week' ? '다음 주' : '다음 달'}
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
                  borderColor: palette.border,
                },
                !canGoNext && styles.periodNavBtnDisabled,
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
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={[styles.emptyTitle, { color: palette.ink }]}>
              기록을 불러오는 중이에요
            </ThemedText>
          </View>
        ) : flowRows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={[styles.emptyTitle, { color: palette.ink }]}>{emptyTitle}</ThemedText>
            <ThemedText style={styles.emptyBody} lightColor={palette.muted} darkColor={palette.muted}>
              {emptyBody}
            </ThemedText>
          </View>
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
          히스토리는 완료 기록을 보여줘요. 체크와 실행은 오늘 탭에서 할 수 있어요.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stickyHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
    zIndex: 2,
  },
  scroll: {
    flex: 1,
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
    borderWidth: 1,
    borderRadius: 0,
  },
  periodNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  periodNavPressed: {
    opacity: 0.92,
  },
  periodNavBtnDisabled: {
    opacity: 0.35,
  },
  periodNavLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cardList: {
    width: '100%',
    gap: 8,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 0,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
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
