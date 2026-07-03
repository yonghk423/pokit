import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { formatHhmmClockKo, getLocalDateKey, useDayPlanDraftStore } from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { syncRoutineWindowCompletionsToHistory } from '@features/history-routine-sync';
import { PrimaryColor } from '@shared/config/theme';
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
  formatWeekRangeLabelKo,
  resolveWeekStartForAnchor,
} from '../lib/buildWeeklyFlowHistory';
import type { FlowHistoryPalette } from '../lib/flowHistoryPalette';
import {
  canGoNextMonth,
  formatMonthLabelKo,
  resolveMonthPrefix,
  shiftMonthPrefix,
  type HistoryPeriod,
} from '../lib/historyPeriodRange';
import { HistoryPeriodTabs } from './HistoryPeriodTabs';
import { MonthlyFlowHistoryCard } from './MonthlyFlowHistoryCard';
import { MonthlyHistorySummaryCard } from './MonthlyHistorySummaryCard';
import { WeeklyFlowHistoryCard } from './WeeklyFlowHistoryCard';

const SCROLL_END_GAP_PX = 6;

/** 하단 히스토리 탭 — 주간·월간 플로우 완료 기록 */
export function DayPlanStatisticsPage() {
  const router = useRouter();
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

  const palette = useMemo<FlowHistoryPalette>(
    () => ({
      card: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      muted: isDark ? '#a1a1aa' : '#71717a',
      ink: isDark ? '#f5f5f5' : '#1f2937',
      accent: isDark ? '#f4b4c8' : '#d9779a',
      accentSoft: isDark ? 'rgba(244,180,200,0.35)' : 'rgba(217,119,154,0.35)',
      weekdayIdle: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      fab: isDark ? '#2a2a2e' : PrimaryColor.rgb,
      fabIcon: '#FAFAFA',
    }),
    [isDark],
  );

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
        trackedCategoryKeys: priorityCategoryOrder,
        timeLabelByCategoryKey,
      }),
    [dailyStatsByDate, priorityCategoryOrder, timeLabelByCategoryKey, weekStartDateKey],
  );

  const monthlyRows = useMemo(
    () =>
      buildMonthlyFlowHistory({
        dailyStatsByDate,
        monthPrefix,
        trackedCategoryKeys: priorityCategoryOrder,
        timeLabelByCategoryKey,
      }),
    [dailyStatsByDate, monthPrefix, priorityCategoryOrder, timeLabelByCategoryKey],
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

  const openCategoryDetail = useCallback(
    (categoryKey: string) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [router],
  );

  const openCatalog = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/priority-catalog');
  }, [router]);

  const openMonthlyTab = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod('month');
  }, []);

  const flowRows = period === 'week' ? weeklyRows : monthlyRows;
  const emptyTitle =
    period === 'week' ? '이번 주 기록이 아직 없어요' : '이번 달 기록이 아직 없어요';
  const emptyBody =
    period === 'week'
      ? '오늘 탭에서 플로우를 완료하면 여기에 요일별로 쌓여요.'
      : '오늘 탭에서 플로우를 완료하면 여기에 날짜별로 쌓여요.';

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: SCROLL_END_GAP_PX + 88,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.pageDesc} lightColor={palette.muted} darkColor={palette.muted}>
          {historyPeriodDescription(period)}
        </ThemedText>

        <HistoryPeriodTabs
          period={period}
          onSelectPeriod={setPeriod}
          ink={palette.ink}
          muted={palette.muted}
          isDark={isDark}
        />

        <View style={styles.periodNavRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={period === 'week' ? '이전 주' : '이전 달'}
            hitSlop={8}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              shiftPeriod(-1);
            }}
            style={({ pressed }) => [styles.periodNavBtn, pressed && styles.pressed]}>
            <IconSymbol name="chevron.left" size={16} color={palette.ink} />
          </Pressable>
          <ThemedText style={[styles.periodNavLabel, { color: palette.ink }]}>
            {periodNavLabel}
          </ThemedText>
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
              !canGoNext && styles.periodNavBtnDisabled,
              pressed && canGoNext && styles.pressed,
            ]}>
            <IconSymbol
              name="chevron.right"
              size={16}
              color={canGoNext ? palette.ink : palette.muted}
            />
          </Pressable>
        </View>

        {period === 'month' ? (
          <MonthlyHistorySummaryCard summary={monthlySummary} palette={palette} />
        ) : null}

        {!isHydrated ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={styles.emptyTitle}>기록을 불러오는 중이에요</ThemedText>
          </View>
        ) : flowRows.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <ThemedText style={styles.emptyTitle}>{emptyTitle}</ThemedText>
            <ThemedText style={styles.emptyBody} lightColor={palette.muted} darkColor={palette.muted}>
              {emptyBody}
            </ThemedText>
          </View>
        ) : period === 'week' ? (
          weeklyRows.map((row) => (
            <WeeklyFlowHistoryCard
              key={row.categoryKey}
              row={row}
              palette={palette}
              isDark={isDark}
              onPressDetail={() => openCategoryDetail(row.categoryKey)}
            />
          ))
        ) : (
          monthlyRows.map((row) => (
            <MonthlyFlowHistoryCard
              key={row.categoryKey}
              row={row}
              monthPrefix={monthPrefix}
              palette={palette}
              onPressDetail={() => openCategoryDetail(row.categoryKey)}
            />
          ))
        )}

        <ThemedText style={styles.helperText} lightColor={palette.muted} darkColor={palette.muted}>
          히스토리는 완료 기록을 보여줘요. 체크와 실행은 오늘·투두 탭에서 할 수 있어요.
        </ThemedText>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8) + 8,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="월간 통계 보기"
          onPress={openMonthlyTab}
          style={({ pressed }) => [
            styles.monthChip,
            { borderColor: palette.border, backgroundColor: palette.card },
            period === 'month' && styles.monthChipActive,
            pressed && styles.pressed,
          ]}>
          <ThemedText style={[styles.monthChipLabel, { color: palette.ink }]}>월간진행률</ThemedText>
          <ThemedText style={[styles.monthChipValue, { color: palette.accent }]}>
            {monthlySummary.progressPercent}%
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="플로우 추가"
          onPress={openCatalog}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: palette.fab },
            pressed && styles.pressed,
          ]}>
          <IconSymbol name="plus" size={22} color={palette.fabIcon} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 14,
  },
  pageDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  periodNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  periodNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNavBtnDisabled: {
    opacity: 0.35,
  },
  periodNavLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'center',
    paddingTop: 4,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  monthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  monthChipActive: {
    borderWidth: 1.5,
  },
  monthChipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthChipValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pressed: {
    opacity: 0.82,
  },
});
