import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  categoryReminderIconName,
  categoryReminderLabelKo,
  getLocalDateKey,
} from '@entities/day-plan';
import { getCategoryCompletions, useHistoryStore } from '@entities/history';
import { useHorizonCompletionStore } from '@entities/horizon-completion';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import {
  buildMonthRangeFromPrefix,
  previousMonthPrefixFromPrefix,
  shiftMonthPrefix,
} from '../lib/historyCalendarGrid';
import { buildMonthlyCompletionRate } from '../lib/monthlyMilestone';
import { buildWeeklyGroupRows, computeBalanceScore } from '../lib/weeklyBalanceRadar';
import { HistoryCalendarOverlay } from './HistoryCalendarOverlay';
import { HistoryMonthPickerOverlay } from './HistoryMonthPickerOverlay';
import { InsightsHistoryView } from './InsightsHistoryView';
import { PeriodHistoryView } from './PeriodHistoryView';

/** 하단 탭바 아래 끝 여백 — `DayPlanCustomTabBar`가 세이프 영역을 이미 담당 */
const SCROLL_END_GAP_PX = 6;

/** 통계 탭 = 데일리 / 흐름(주간+월간 통합) / 인사이트(종합) */
type HistoryPeriod = 'today' | 'flow' | 'insights';

type HistoryFeedRow = {
  dateKey: string;
  headline: string;
  summary: string;
  rateLabel: string;
  categoryLabel: string;
  completedFlowCount: number;
  focusLabel: string;
};

function formatDateKeyKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

function formatMonthLabelKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(dateKey.trim());
  if (!m) return dateKey;
  return `${m[1]}년 ${Number(m[2])}월`;
}

function parseDateKey(dateKey: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCountKo(count: number): string {
  return `${Math.max(0, Math.round(count))}개`;
}

function formatRatePercent(rate: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, Number(rate) || 0)) * 100);
  return `${pct}%`;
}

function formatDurationKo(totalMinutes: number): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  if (hour <= 0) return `${minute}분`;
  if (minute === 0) return `${hour}시간`;
  return `${hour}시간 ${minute}분`;
}

function resolveHistoryHeadline(rate: number, completedCount: number): string {
  if (completedCount >= 6 && rate >= 0.85) return '완벽한 몰입의 날';
  if (completedCount >= 4 && rate >= 0.7) return '균형 있게 채운 하루';
  if (completedCount >= 2) return '작은 완수를 이어간 날';
  if (completedCount >= 1) return '기록을 다시 시작한 날';
  return '회복을 준비한 날';
}

function resolveHistorySummary(rate: number, completedCount: number): string {
  if (completedCount >= 6) return '핵심 플로우를 꾸준히 마무리하며 긴 호흡의 집중을 만들었어요.';
  if (completedCount >= 4) return '여러 카테고리를 균형 있게 챙기며 안정적인 페이스를 유지했어요.';
  if (rate >= 0.6) return '우선순위를 지키며 필요한 흐름을 놓치지 않았어요.';
  if (completedCount > 0) return '작은 완료를 만들며 다음 페이스를 위한 기반을 쌓았어요.';
  return '완료 기록은 없지만 흐름을 점검한 하루였어요.';
}

/** 하단 통계 탭 — 히스토리(기간별 조회) */
export function DayPlanStatisticsPage() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const todayDateKey = getLocalDateKey();

  const [period, setPeriod] = useState<HistoryPeriod>('today');
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);
  const [flowMonthPrefix, setFlowMonthPrefix] = useState(() => todayDateKey.slice(0, 7));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  const {
    isHydrated,
    hydrate,
    reloadFromStorage,
    dailyStatsByDate,
    selectCurrentStreak,
    selectGrowthVsPreviousWeek,
  } = useHistoryStore(
    useShallow((s) => ({
      isHydrated: s.isHydrated,
      hydrate: s.hydrate,
      reloadFromStorage: s.reloadFromStorage,
      dailyStatsByDate: s.dailyStatsByDate,
      selectCurrentStreak: s.selectCurrentStreak,
      selectGrowthVsPreviousWeek: s.selectGrowthVsPreviousWeek,
    })),
  );

  const reloadHorizonCompletions = useHorizonCompletionStore((s) => s.reloadFromStorage);
  const weeklyByKey = useHorizonCompletionStore((s) => s.weeklyByKey);
  const monthlyByKey = useHorizonCompletionStore((s) => s.monthlyByKey);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      reloadFromStorage();
      reloadHorizonCompletions();
    }, [reloadFromStorage, reloadHorizonCompletions]),
  );

  const weekRange = useMemo(
    () => ({
      startDateKey: addDaysToLocalDateKey(selectedDateKey, -6),
      endDateKey: selectedDateKey,
    }),
    [selectedDateKey],
  );
  const prevWeekRange = useMemo(
    () => ({
      startDateKey: addDaysToLocalDateKey(selectedDateKey, -13),
      endDateKey: addDaysToLocalDateKey(selectedDateKey, -7),
    }),
    [selectedDateKey],
  );
  const monthRange = useMemo(() => {
    if (period === 'flow') {
      return buildMonthRangeFromPrefix(flowMonthPrefix, todayDateKey);
    }
    const selected = parseDateKey(selectedDateKey);
    const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    const isCurrentMonth = selectedDateKey.slice(0, 7) === todayDateKey.slice(0, 7);
    const end = isCurrentMonth
      ? parseDateKey(todayDateKey)
      : new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
    return {
      startDateKey: toDateKey(start),
      endDateKey: toDateKey(end),
    };
  }, [flowMonthPrefix, period, selectedDateKey, todayDateKey]);

  const tone = useMemo(
    () => ({
      card: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      muted: isDark ? '#a1a1aa' : '#71717a',
      ink: isDark ? '#f5f5f5' : '#1f2937',
      level0: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      barTrack: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      barFill: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.72)',
      heat: isDark
        ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0.34)', 'rgba(255,255,255,0.52)', 'rgba(255,255,255,0.72)']
        : ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.26)', 'rgba(0,0,0,0.42)', 'rgba(0,0,0,0.62)'],
    }),
    [isDark],
  );

  const streak = useMemo(() => selectCurrentStreak(todayDateKey), [dailyStatsByDate, selectCurrentStreak, todayDateKey]);
  const growth = useMemo(
    () => selectGrowthVsPreviousWeek(todayDateKey),
    [dailyStatsByDate, selectGrowthVsPreviousWeek, todayDateKey],
  );
  const monthlyRate = useMemo(
    () => buildMonthlyCompletionRate(dailyStatsByDate, monthRange.startDateKey, monthRange.endDateKey),
    [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey],
  );
  const previousMonthlyRate = useMemo(() => {
    const prefix =
      period === 'flow' ? flowMonthPrefix : selectedDateKey.slice(0, 7);
    const prevPrefix = previousMonthPrefixFromPrefix(prefix);
    const prevRange = buildMonthRangeFromPrefix(prevPrefix, todayDateKey);
    return buildMonthlyCompletionRate(
      dailyStatsByDate,
      prevRange.startDateKey,
      prevRange.endDateKey,
    );
  }, [dailyStatsByDate, flowMonthPrefix, period, selectedDateKey, todayDateKey]);
  const activeDaysInMonth = useMemo(() => {
    let count = 0;
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < monthRange.startDateKey || row.dateKey > monthRange.endDateKey) continue;
      if (row.completedFlowCount > 0 || row.completionRate > 0) count += 1;
    }
    return count;
  }, [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey]);

  const weeklyCategoryCompletions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < weekRange.startDateKey || row.dateKey > weekRange.endDateKey) continue;
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        map[key] = (map[key] ?? 0) + count;
      }
    }
    return map;
  }, [dailyStatsByDate, weekRange.endDateKey, weekRange.startDateKey]);
  const weeklyBalanceRows = useMemo(
    () => buildWeeklyGroupRows(weeklyCategoryCompletions),
    [weeklyCategoryCompletions],
  );

  const weeklyBalanceScore = useMemo(() => computeBalanceScore(weeklyBalanceRows), [weeklyBalanceRows]);

  const weeklyCompletionEntries = useMemo(
    () => Object.values(weeklyByKey).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [weeklyByKey],
  );
  const monthlyCompletionEntries = useMemo(
    () => Object.values(monthlyByKey).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [monthlyByKey],
  );

  const historyRows = useMemo<HistoryFeedRow[]>(
    () =>
      Object.values(dailyStatsByDate)
        .slice()
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
        .map((row) => {
          const topCategory = Object.entries(getCategoryCompletions(row)).sort((a, b) => b[1] - a[1])[0];
          return {
            dateKey: row.dateKey,
            headline: resolveHistoryHeadline(row.completionRate, row.completedFlowCount),
            summary: resolveHistorySummary(row.completionRate, row.completedFlowCount),
            rateLabel: formatRatePercent(row.completionRate),
            categoryLabel: topCategory ? categoryReminderLabelKo(topCategory[0]) : '기록 없음',
            completedFlowCount: row.completedFlowCount,
            focusLabel: formatDurationKo(row.focusMinutes),
          };
        }),
    [dailyStatsByDate],
  );

  const historyFilterChips = useMemo(() => {
    const set = new Set<string>();
    for (const row of historyRows) {
      if (row.categoryLabel === '기록 없음') continue;
      set.add(row.categoryLabel);
      if (set.size >= 5) break;
    }
    return ['all', ...Array.from(set)];
  }, [historyRows]);

  const filteredHistoryRows = useMemo(() => {
    const keyword = historyQuery.trim();
    return historyRows.filter((row) => {
      if (historyFilter !== 'all' && row.categoryLabel !== historyFilter) return false;
      if (!keyword) return true;
      return (
        row.headline.includes(keyword) ||
        row.summary.includes(keyword) ||
        row.categoryLabel.includes(keyword) ||
        formatDateKeyKo(row.dateKey).includes(keyword)
      );
    });
  }, [historyFilter, historyQuery, historyRows]);
  const todayRow = dailyStatsByDate[selectedDateKey] ?? {
    dateKey: selectedDateKey,
    focusMinutes: 0,
    completedFlowCount: 0,
    sessionCount: 0,
    completionRate: 0,
    categoryMinutes: {},
    categoryCompletions: {},
  };
  const focusScore = Math.round(Math.max(0, Math.min(1, todayRow.completionRate || 0)) * 100);
  const sameWeekdayAverageScore = useMemo(() => {
    const scores: number[] = [];
    for (const daysAgo of [7, 14, 21, 28]) {
      const key = addDaysToLocalDateKey(selectedDateKey, -daysAgo);
      const row = dailyStatsByDate[key];
      if (!row) continue;
      scores.push(Math.round(Math.max(0, Math.min(1, row.completionRate || 0)) * 100));
    }
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [dailyStatsByDate, selectedDateKey]);
  const focusDelta = focusScore - sameWeekdayAverageScore;
  const todayCompletedCategories = useMemo(
    () =>
      Object.entries(getCategoryCompletions(todayRow))
        .filter(([, count]) => count > 0)
        .map(([categoryKey]) => ({ categoryKey }))
        .sort((a, b) =>
          categoryReminderLabelKo(a.categoryKey).localeCompare(categoryReminderLabelKo(b.categoryKey), 'ko'),
        ),
    [todayRow],
  );
  const todayTopCategoryLabel = todayCompletedCategories[0]
    ? categoryReminderLabelKo(todayCompletedCategories[0].categoryKey)
    : '핵심 플로우';
  const reflectionText =
    todayRow.completedFlowCount > 0
      ? `${todayTopCategoryLabel} 중심으로 ${formatCountKo(todayRow.completedFlowCount)}를 마무리했어요. 현재 완료율은 ${focusScore}%이며, 내일은 오늘 가장 약했던 구간을 먼저 채워 보세요.`
      : '오늘은 완료 기록이 없어요. 내일은 가장 부담이 적은 플로우 1개부터 시작해 흐름을 만들어 보세요.';
  const reflectionTags =
    todayRow.completedFlowCount > 0
      ? ['성취감', focusDelta >= 0 ? '안정감' : '회복집중']
      : ['재정비', '작은시작'];
  const periodLabel = formatDateKeyKo(selectedDateKey);
  const calendarHint = '날짜를 선택하면 해당 날의 기록을 보여요.';
  const historyMinYear = useMemo(() => {
    const keys = Object.keys(dailyStatsByDate);
    const currentYear = Number(todayDateKey.slice(0, 4));
    if (keys.length === 0) return currentYear;
    const minFromData = keys.reduce((min, key) => Math.min(min, Number(key.slice(0, 4))), currentYear);
    return Math.min(minFromData, currentYear);
  }, [dailyStatsByDate, todayDateKey]);
  const canFlowGoPrevMonth = useMemo(() => {
    const prev = shiftMonthPrefix(flowMonthPrefix, -1);
    return Number(prev.slice(0, 4)) >= historyMinYear;
  }, [flowMonthPrefix, historyMinYear]);
  const canFlowGoNextMonth = flowMonthPrefix < todayDateKey.slice(0, 7);
  const onSelectCalendarDateKey = useCallback(
    (dateKey: string) => {
      const next = dateKey > todayDateKey ? todayDateKey : dateKey;
      setSelectedDateKey(next);
      if (period === 'flow') {
        setFlowMonthPrefix(next.slice(0, 7));
      }
    },
    [period, todayDateKey],
  );
  const applyFlowMonthPrefix = useCallback(
    (prefix: string) => {
      if (prefix > todayDateKey.slice(0, 7)) return;
      setFlowMonthPrefix(prefix);
      const range = buildMonthRangeFromPrefix(prefix, todayDateKey);
      setSelectedDateKey(range.endDateKey);
    },
    [todayDateKey],
  );
  const onFlowPrevMonth = useCallback(() => {
    if (!canFlowGoPrevMonth) return;
    applyFlowMonthPrefix(shiftMonthPrefix(flowMonthPrefix, -1));
  }, [applyFlowMonthPrefix, canFlowGoPrevMonth, flowMonthPrefix]);
  const onFlowNextMonth = useCallback(() => {
    if (!canFlowGoNextMonth) return;
    applyFlowMonthPrefix(shiftMonthPrefix(flowMonthPrefix, 1));
  }, [applyFlowMonthPrefix, canFlowGoNextMonth, flowMonthPrefix]);
  const onSelectFlowMonth = useCallback(
    (year: number, month: number) => {
      applyFlowMonthPrefix(`${year}-${String(month).padStart(2, '0')}`);
    },
    [applyFlowMonthPrefix],
  );

  return (
    <ThemedView style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: SCROLL_END_GAP_PX + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.pageDesc} lightColor={tone.muted} darkColor={tone.muted}>
          데일리로 오늘을 보고, 흐름에서 주간과 월간 패턴을 함께 확인해요.
        </ThemedText>

        <View style={styles.mainTabRow}>
          {(
            [
              { id: 'today' as const, label: '데일리' },
              { id: 'flow' as const, label: '흐름' },
              { id: 'insights' as const, label: '인사이트' },
            ] as const
          ).map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                setPeriod(tab.id);
                if (tab.id === 'flow') {
                  setFlowMonthPrefix(selectedDateKey.slice(0, 7));
                }
              }}
              style={[
                styles.mainTabBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                period === tab.id && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              ]}>
              <ThemedText
                style={styles.mainTabLabel}
                lightColor={period === tab.id ? '#ffffff' : '#52525b'}
                darkColor={period === tab.id ? '#18181b' : '#a1a1aa'}>
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {period === 'today' || period === 'flow' ? (
          <View style={styles.periodPickerRow}>
            <ThemedText style={styles.periodPickerDate} lightColor={tone.muted} darkColor={tone.muted}>
              {period === 'flow' ? formatMonthLabelKo(`${flowMonthPrefix}-01`) : periodLabel}
            </ThemedText>
            {period === 'today' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="날짜 선택"
                onPress={() => setIsDatePickerOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.periodPickerIconBtn, pressed && { opacity: 0.6 }]}>
                <IconSymbol name="calendar" size={15} color={tone.muted} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="월 선택"
                onPress={() => setIsMonthPickerOpen(true)}
                hitSlop={8}
                style={({ pressed }) => [styles.periodPickerIconBtn, pressed && { opacity: 0.6 }]}>
                <IconSymbol name="line.3.horizontal.decrease.circle" size={15} color={tone.muted} />
              </Pressable>
            )}
          </View>
        ) : null}

        {period === 'today' ? (
          <>
            <View style={[styles.card, styles.dailyHeroCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
              <View style={styles.focusRingWrap}>
                <Svg width={180} height={180}>
                  <G transform="rotate(-90 90 90)">
                    <Circle
                      cx={90}
                      cy={90}
                      r={76}
                      stroke={tone.barTrack}
                      strokeWidth={8}
                      fill="none"
                    />
                    <Circle
                      cx={90}
                      cy={90}
                      r={76}
                      stroke={tone.barFill}
                      strokeWidth={8}
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 76}`}
                      strokeDashoffset={`${2 * Math.PI * 76 * (1 - Math.max(0, Math.min(1, focusScore / 100)))}`}
                      strokeLinecap="round"
                    />
                  </G>
                </Svg>
                <View style={styles.focusRingCenter}>
                  <ThemedText style={styles.focusScoreValue}>{focusScore}</ThemedText>
                  <ThemedText style={styles.focusScoreLabel} lightColor={tone.muted} darkColor={tone.muted}>
                    집중도 점수
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.focusDeltaText} lightColor={tone.muted} darkColor={tone.muted}>
                오늘 집중도는 최근 동일 요일 평균보다{' '}
                <ThemedText style={styles.focusDeltaEmphasis}>
                  {focusDelta >= 0 ? `+${focusDelta}%` : `${focusDelta}%`}
                </ThemedText>{' '}
                {focusDelta >= 0 ? '높아요.' : '낮아요.'}
              </ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
              <View style={styles.sectionHeadRow}>
                <ThemedText style={styles.sectionTitle}>오늘 활동 분석</ThemedText>
                <ThemedText style={styles.sectionKicker} lightColor={tone.muted} darkColor={tone.muted}>
                  {todayCompletedCategories.length > 0
                    ? todayCompletedCategories.length > 5
                      ? `오늘 ${todayCompletedCategories.length}개 · 옆으로 밀어 보기`
                      : `오늘 ${todayCompletedCategories.length}개`
                    : '오늘 현황'}
                </ThemedText>
              </View>
              {todayCompletedCategories.length === 0 ? (
                <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
                  오늘 분석할 활동 기록이 아직 없어요.
                </ThemedText>
              ) : (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dailyActivityScroll}>
                    {todayCompletedCategories.map((row) => (
                      <View key={row.categoryKey} style={styles.dailyActivityCol}>
                        <View style={styles.dailyActivityIconSlot}>
                          <View style={[styles.dailyActivityIconWrap, { backgroundColor: tone.level0 }]}>
                            <IconSymbol
                              name={categoryReminderIconName(row.categoryKey) as never}
                              size={28}
                              color={tone.barFill}
                            />
                          </View>
                          <ThemedText style={[styles.dailyActivityDone, { color: tone.barFill }]}>완료</ThemedText>
                        </View>
                        <ThemedText
                          style={styles.dailyActivityLabel}
                          lightColor={tone.muted}
                          darkColor={tone.muted}
                          numberOfLines={2}>
                          {categoryReminderLabelKo(row.categoryKey)}
                        </ThemedText>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={[styles.dailyStatCard, { backgroundColor: tone.level0, borderColor: tone.border }]}>
                    <View style={styles.dailyStatRow}>
                      <ThemedText style={styles.dailyStatLabel} lightColor={tone.muted} darkColor={tone.muted}>
                        오늘 완료 수
                      </ThemedText>
                      <ThemedText style={styles.dailyStatValue}>{formatCountKo(todayRow.completedFlowCount)}</ThemedText>
                    </View>
                    <View style={[styles.dailyStatRow, styles.dailyStatRowDivider, { borderTopColor: tone.border }]}>
                      <ThemedText style={styles.dailyStatLabel} lightColor={tone.muted} darkColor={tone.muted}>
                        집중 지속 시간
                      </ThemedText>
                      <ThemedText style={styles.dailyStatValue}>{formatDurationKo(todayRow.focusMinutes)}</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
              <ThemedText style={styles.sectionTitle}>오늘의 성찰</ThemedText>
              <ThemedText style={styles.reflectionBody}>{reflectionText}</ThemedText>
              <View style={styles.reflectionTags}>
                {reflectionTags.map((tag) => (
                  <View key={tag} style={[styles.reflectionTag, { backgroundColor: tone.level0 }]}>
                    <ThemedText style={styles.reflectionTagText} lightColor={tone.muted} darkColor={tone.muted}>
                      {tag}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        {period === 'insights' ? (
          <InsightsHistoryView
            tone={tone}
            isDark={isDark}
            isHydrated={isHydrated}
            todayCompletionRate={todayRow.completionRate}
            todayCompletedCount={todayRow.completedFlowCount}
            sameWeekdayAverageScore={sameWeekdayAverageScore}
            weeklyBalanceScore={weeklyBalanceScore}
            weeklyBalanceRows={weeklyBalanceRows}
            monthlyRate={monthlyRate}
            previousMonthlyRate={previousMonthlyRate}
            activeDaysInMonth={activeDaysInMonth}
            streak={streak}
            weekCompletionDelta={growth.diffCompletions}
            historyRows={historyRows}
            historyQuery={historyQuery}
            onHistoryQueryChange={setHistoryQuery}
            historyFilter={historyFilter}
            onHistoryFilterChange={setHistoryFilter}
            historyFilterChips={historyFilterChips}
            filteredHistoryRows={filteredHistoryRows}
            formatDateKeyKo={formatDateKeyKo}
            formatCountKo={formatCountKo}
          />
        ) : null}

        {period === 'flow' ? (
          <PeriodHistoryView
            tone={tone}
            anchorDateKey={selectedDateKey}
            flowMonthPrefix={flowMonthPrefix}
            weekRange={weekRange}
            prevWeekRange={prevWeekRange}
            weeklyBalanceRows={weeklyBalanceRows}
            weeklyBalanceScore={weeklyBalanceScore}
            monthlyRate={monthlyRate}
            previousMonthlyRate={previousMonthlyRate}
            streak={streak}
            dailyStatsByDate={dailyStatsByDate}
            weeklyCompletionEntries={weeklyCompletionEntries}
            monthRange={monthRange}
            monthlyCompletionEntries={monthlyCompletionEntries}
            canGoPrevMonth={canFlowGoPrevMonth}
            canGoNextMonth={canFlowGoNextMonth}
            onPrevMonth={onFlowPrevMonth}
            onNextMonth={onFlowNextMonth}
            onOpenMonthPicker={() => setIsMonthPickerOpen(true)}
            onSelectDateKey={onSelectCalendarDateKey}
            todayDateKey={todayDateKey}
            formatMonthLabelKo={formatMonthLabelKo}
            formatDateKeyKo={formatDateKeyKo}
            formatCountKo={formatCountKo}
          />
        ) : null}

        <ThemedText style={styles.footnote} lightColor={tone.muted} darkColor={tone.muted}>
          모든 화면은 플로우 완료 기록을 기반으로 자동 생성돼요.
        </ThemedText>
      </ScrollView>
      {period === 'today' ? (
        <HistoryCalendarOverlay
          visible={isDatePickerOpen}
          isDark={isDark}
          period="today"
          focusDateKey={selectedDateKey}
          todayDateKey={todayDateKey}
          sheetBg={tone.card}
          ink={tone.ink}
          muted={tone.muted}
          border={tone.border}
          hint={calendarHint}
          onClose={() => setIsDatePickerOpen(false)}
          onSelectDateKey={onSelectCalendarDateKey}
        />
      ) : null}
      {period === 'flow' ? (
        <HistoryMonthPickerOverlay
          visible={isMonthPickerOpen}
          isDark={isDark}
          selectedMonthPrefix={flowMonthPrefix}
          todayDateKey={todayDateKey}
          minYear={historyMinYear}
          sheetBg={tone.card}
          ink={tone.ink}
          muted={tone.muted}
          border={tone.border}
          onClose={() => setIsMonthPickerOpen(false)}
          onSelectMonth={onSelectFlowMonth}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    gap: 14,
  },
  pageDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    marginBottom: 4,
  },
  mainTabRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  mainTabBtn: {
    flex: 1,
    minHeight: 34,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTabLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  periodPickerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  periodPickerDate: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  periodPickerIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  dailyHeroCard: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 20,
    paddingBottom: 18,
  },
  focusRingWrap: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusRingCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  focusScoreValue: {
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: -1.4,
    lineHeight: 62,
  },
  focusScoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  focusDeltaText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  focusDeltaEmphasis: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeadRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  dailyActivityScroll: {
    gap: 10,
    paddingRight: 4,
  },
  dailyActivityCol: {
    width: 72,
    alignItems: 'center',
    gap: 8,
  },
  dailyActivityIconSlot: {
    width: '100%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dailyActivityDone: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  dailyActivityIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyActivityLabel: {
    width: '100%',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 13,
  },
  dailyStatCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dailyStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dailyStatRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  dailyStatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dailyStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  reportRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportAvgRow: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  reportValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  reportDeltaChip: {
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reportDeltaUp: {
    backgroundColor: 'rgba(16,185,129,0.14)',
  },
  reportDeltaDown: {
    backgroundColor: 'rgba(239,68,68,0.14)',
  },
  reportDeltaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  monthlySummaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  monthlySummaryItem: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 3,
    alignItems: 'center',
  },
  monthlySummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  monthlySummaryValue: {
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  monthlySummaryHint: {
    fontSize: 10,
    fontWeight: '600',
  },
  streakCard: {
    marginTop: 2,
    borderRadius: 14,
    backgroundColor: '#111827',
    padding: 14,
    gap: 10,
  },
  streakCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  streakEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  streakRow: {
    gap: 6,
  },
  streakRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  streakName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
  },
  streakValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  streakTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  streakFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  reflectionBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  reflectionTags: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reflectionTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reflectionTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  searchInput: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyCard: {
    gap: 8,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyRate: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  historyHeadline: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  historySummary: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyMetaChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  scoreBadge: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  balanceList: {
    gap: 8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  balanceFill: {
    height: '100%',
    borderRadius: 4,
  },
  balanceValue: {
    width: 44,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
  insightCard: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  insightBody: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  monthlyHeroCard: {
    gap: 10,
    paddingVertical: 18,
  },
  monthlyMeta: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  monthlyTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  monthlyRate: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 48,
    marginTop: 2,
  },
  monthlyDelta: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  monthlyBody: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  monthlyHeatWrap: {
    gap: 6,
  },
  monthlyHeatRow: {
    flexDirection: 'row',
    gap: 6,
  },
  monthlyHeatCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    maxHeight: 26,
  },
  entryRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 4,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  entryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  entryValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  entryDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  entrySummary: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  emptyNote: {
    fontSize: 14,
    lineHeight: 21,
  },
  footnote: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingBottom: 8,
  },
});
