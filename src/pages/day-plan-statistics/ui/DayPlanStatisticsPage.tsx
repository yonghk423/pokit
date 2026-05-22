import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  categoryReminderLabelKo,
  getLocalDateKey,
} from '@entities/day-plan';
import { getCategoryCompletions, useHistoryStore } from '@entities/history';

import {
  buildCategoryGrowthDisplayRows,
  sortCategoryBreakdownRows,
} from '../lib/categoryGrowthDisplay';
import { getChartGrassPalette } from '../lib/chartGrassColors';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 하단 탭바 아래 끝 여백 — `DayPlanCustomTabBar`가 세이프 영역을 이미 담당 */
const SCROLL_END_GAP_PX = 6;

type ConsistencyMode = 'week' | 'month';
type CategorySortMode = 'share' | 'growth' | 'recent';
type StatisticsMainTab = 'history' | 'categoryAnalysis';

const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatCountKo(count: number): string {
  return `${Math.max(0, Math.round(count))}개`;
}

function formatDateKeyKo(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

function formatDeltaPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '0%';
  const pct = Math.round(ratio * 100);
  if (pct > 0) return `+${pct}%`;
  return `${pct}%`;
}

function formatRatePercent(rate: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, Number(rate) || 0)) * 100);
  return `${pct}%`;
}

/** 데이플랜 하단 탭 — 히스토리 대시보드 */
export function DayPlanStatisticsPage() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [mainTab, setMainTab] = useState<StatisticsMainTab>('history');
  const [consistencyMode, setConsistencyMode] = useState<ConsistencyMode>('week');
  const [categorySortMode, setCategorySortMode] = useState<CategorySortMode>('share');
  const [selectedHeatDateKey, setSelectedHeatDateKey] = useState<string | null>(null);
  const [detailSheetDateKey, setDetailSheetDateKey] = useState<string | null>(null);
  const [detailCategoryKey, setDetailCategoryKey] = useState<string | null>(null);

  const {
    isHydrated,
    hydrate,
    dailyStatsByDate,
    selectCurrentStreak,
    selectWeeklyHeatMap,
    selectCategoryBreakdown,
    selectConsistencyByWeekday,
    selectGrowthVsPreviousWeek,
  } = useHistoryStore(
    useShallow((s) => ({
      isHydrated: s.isHydrated,
      hydrate: s.hydrate,
      dailyStatsByDate: s.dailyStatsByDate,
      selectCurrentStreak: s.selectCurrentStreak,
      selectWeeklyHeatMap: s.selectWeeklyHeatMap,
      selectCategoryBreakdown: s.selectCategoryBreakdown,
      selectConsistencyByWeekday: s.selectConsistencyByWeekday,
      selectGrowthVsPreviousWeek: s.selectGrowthVsPreviousWeek,
    })),
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, []),
  );

  const todayDateKey = getLocalDateKey();
  const weekRange = useMemo(
    () => ({
      startDateKey: addDaysToLocalDateKey(todayDateKey, -6),
      endDateKey: todayDateKey,
    }),
    [todayDateKey],
  );
  const monthRange = useMemo(
    () => ({
      startDateKey: addDaysToLocalDateKey(todayDateKey, -29),
      endDateKey: todayDateKey,
    }),
    [todayDateKey],
  );
  const prevWeekRange = useMemo(
    () => ({
      startDateKey: addDaysToLocalDateKey(todayDateKey, -13),
      endDateKey: addDaysToLocalDateKey(todayDateKey, -7),
    }),
    [todayDateKey],
  );

  useEffect(() => {
    if (selectedHeatDateKey) return;
    setSelectedHeatDateKey(todayDateKey);
  }, [selectedHeatDateKey, todayDateKey]);

  const streak = useMemo(
    () => selectCurrentStreak(todayDateKey),
    [dailyStatsByDate, selectCurrentStreak, todayDateKey],
  );
  const growth = useMemo(
    () => selectGrowthVsPreviousWeek(todayDateKey),
    [dailyStatsByDate, selectGrowthVsPreviousWeek, todayDateKey],
  );
  const heatMapCells = useMemo(
    () => selectWeeklyHeatMap(4, todayDateKey),
    [dailyStatsByDate, selectWeeklyHeatMap, todayDateKey],
  );
  const heatMapRows = useMemo(() => {
    const rows: typeof heatMapCells[] = [];
    for (let i = 0; i < heatMapCells.length; i += 7) {
      rows.push(heatMapCells.slice(i, i + 7));
    }
    return rows;
  }, [heatMapCells]);
  const categoryRowsBase = useMemo(
    () => selectCategoryBreakdown(monthRange),
    [dailyStatsByDate, monthRange, selectCategoryBreakdown],
  );
  const currentWeekCategoryCompletions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < weekRange.startDateKey || row.dateKey > weekRange.endDateKey) continue;
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        map[key] = (map[key] ?? 0) + count;
      }
    }
    return map;
  }, [dailyStatsByDate, weekRange.endDateKey, weekRange.startDateKey]);
  const categoryAnalysisRows = useMemo(() => {
    const map = new Map<
      string,
      { totalCompletions: number; activeDays: number; last7Completions: number }
    >();
    const last7Start = addDaysToLocalDateKey(todayDateKey, -6);
    for (const [dateKey, row] of Object.entries(dailyStatsByDate)) {
      for (const [categoryKey, countRaw] of Object.entries(getCategoryCompletions(row))) {
        const count = Math.max(0, Math.floor(Number(countRaw) || 0));
        if (count <= 0) continue;
        const prev = map.get(categoryKey) ?? { totalCompletions: 0, activeDays: 0, last7Completions: 0 };
        prev.totalCompletions += count;
        prev.activeDays += 1;
        if (dateKey >= last7Start && dateKey <= todayDateKey) prev.last7Completions += count;
        map.set(categoryKey, prev);
      }
    }
    return [...map.entries()]
      .map(([categoryKey, stat]) => ({ categoryKey, ...stat }))
      .sort((a, b) => b.totalCompletions - a.totalCompletions)
      .slice(0, 8);
  }, [dailyStatsByDate, todayDateKey]);
  const prevWeekCategoryCompletions = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < prevWeekRange.startDateKey || row.dateKey > prevWeekRange.endDateKey) continue;
      for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
        map[key] = (map[key] ?? 0) + count;
      }
    }
    return map;
  }, [dailyStatsByDate, prevWeekRange.endDateKey, prevWeekRange.startDateKey]);
  const selectedHeatDetail = useMemo(() => {
    const key = selectedHeatDateKey ?? todayDateKey;
    const row = dailyStatsByDate[key];
    if (!row) {
      return {
        dateKey: key,
        focusMinutes: 0,
        completedFlowCount: 0,
        sessionCount: 0,
        completionRate: 0,
        categoryMinutes: {},
        categoryCompletions: {},
      };
    }
    return row;
  }, [dailyStatsByDate, selectedHeatDateKey, todayDateKey]);
  const prevDateKey = useMemo(
    () => addDaysToLocalDateKey(selectedHeatDetail.dateKey, -1),
    [selectedHeatDetail.dateKey],
  );
  const selectedHeatPrev = dailyStatsByDate[prevDateKey];
  const selectedHeatDiffCompletions =
    selectedHeatDetail.completedFlowCount - (selectedHeatPrev?.completedFlowCount ?? 0);
  const selectedHeatTopCategories = useMemo(
    () =>
      Object.entries(getCategoryCompletions(selectedHeatDetail))
        .map(([categoryKey, completions]) => ({ categoryKey, completions }))
        .filter((row) => row.completions > 0)
        .sort((a, b) => b.completions - a.completions)
        .slice(0, 3),
    [selectedHeatDetail],
  );
  const detailSheetRow = useMemo(() => {
    if (!detailSheetDateKey) return null;
    return (
      dailyStatsByDate[detailSheetDateKey] ?? {
        dateKey: detailSheetDateKey,
        focusMinutes: 0,
        completedFlowCount: 0,
        sessionCount: 0,
        completionRate: 0,
        categoryMinutes: {},
        categoryCompletions: {},
      }
    );
  }, [dailyStatsByDate, detailSheetDateKey]);
  const detailSheetCategories = useMemo(
    () =>
      detailSheetRow
        ? Object.entries(getCategoryCompletions(detailSheetRow))
            .map(([categoryKey, completions]) => ({ categoryKey, completions }))
            .filter((row) => row.completions > 0)
            .sort((a, b) => b.completions - a.completions)
        : [],
    [detailSheetRow],
  );
  const detailCategorySeries = useMemo(() => {
    if (!detailSheetDateKey || !detailCategoryKey) return [];
    const out: Array<{ dateKey: string; completions: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dateKey = addDaysToLocalDateKey(detailSheetDateKey, -i);
      const row = dailyStatsByDate[dateKey];
      out.push({
        dateKey,
        completions: row ? (getCategoryCompletions(row)[detailCategoryKey] ?? 0) : 0,
      });
    }
    return out;
  }, [dailyStatsByDate, detailCategoryKey, detailSheetDateKey]);
  const detailCategoryMax = Math.max(1, ...detailCategorySeries.map((row) => row.completions));
  const consistencyRows = useMemo(
    () => selectConsistencyByWeekday(consistencyMode === 'week' ? weekRange : monthRange),
    [consistencyMode, dailyStatsByDate, monthRange, selectConsistencyByWeekday, weekRange],
  );

  const consistencyMax = Math.max(
    1,
    ...consistencyRows.map((row) => row.averageCompletions),
  );
  const coachingMessage = useMemo(() => {
    if (!isHydrated) return '히스토리를 불러오는 중이에요.';
    if (streak >= 14) return `연속 ${streak}일째에요. 지금 페이스를 유지하면 이번 달 최고 기록을 만들 수 있어요.`;
    if (growth.diffCompletions > 0) {
      return `지난주보다 ${formatCountKo(growth.diffCompletions)} 더 달성했어요. 완료 흐름이 좋아요.`;
    }
    if (growth.diffCompletions < 0) {
      return `지난주보다 ${formatCountKo(Math.abs(growth.diffCompletions))} 줄었어요. 오늘 한 가지라도 완료하면 회복이 빨라요.`;
    }
    return '오늘 첫 완료를 만들면 히스토리 그래프가 더 선명해져요.';
  }, [growth.diffCompletions, isHydrated, streak]);
  const streakRiskMessage = useMemo(() => {
    const todayCompletions = dailyStatsByDate[todayDateKey]?.completedFlowCount ?? 0;
    if (!isHydrated) return '오늘 기록을 계산 중이에요.';
    if (streak === 0) return '오늘 루틴을 하나라도 완료하면 새 스트릭이 시작돼요.';
    if (todayCompletions > 0) return `좋아요! 오늘 이미 ${formatCountKo(todayCompletions)} 달성했어요.`;
    return '오늘 아직 완료 기록이 없어요. 스트릭을 유지하려면 한 가지를 마무리해 주세요.';
  }, [dailyStatsByDate, isHydrated, streak, todayDateKey]);
  const categorySortDesc = useMemo(() => {
    if (categorySortMode === 'growth') {
      return '지난주 대비 이번 주 성장률이에요. 숫자와 막대 모두 성장률 기준으로 바뀌어요.';
    }
    if (categorySortMode === 'recent') {
      return '이번 주(7일) 완료 비중이에요. 탭을 바꾸면 퍼센트와 막대가 주간 기준으로 달라져요.';
    }
    return '최근 30일 전체 완료 중 비중이에요.';
  }, [categorySortMode]);

  const categoryRows = useMemo(() => {
    const sorted = sortCategoryBreakdownRows(
      categoryRowsBase,
      categorySortMode,
      currentWeekCategoryCompletions,
      prevWeekCategoryCompletions,
    ).slice(0, 8);
    return buildCategoryGrowthDisplayRows(
      sorted,
      categorySortMode,
      currentWeekCategoryCompletions,
      prevWeekCategoryCompletions,
      formatDeltaPercent,
      formatCountKo,
    );
  }, [
    categoryRowsBase,
    categorySortMode,
    currentWeekCategoryCompletions,
    prevWeekCategoryCompletions,
  ]);
  const selectedIsToday = selectedHeatDetail.dateKey === todayDateKey;

  useEffect(() => {
    if (!detailSheetDateKey) {
      setDetailCategoryKey(null);
      return;
    }
    const sheetRow = detailSheetDateKey ? dailyStatsByDate[detailSheetDateKey] : null;
    const firstKey =
      Object.entries(sheetRow ? getCategoryCompletions(sheetRow) : {})
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    setDetailCategoryKey(firstKey);
  }, [dailyStatsByDate, detailSheetDateKey]);

  const tone = useMemo(() => {
    const grass = getChartGrassPalette(isDark);
    return {
      card: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      muted: isDark ? '#a1a1aa' : '#71717a',
      ink: isDark ? '#f5f5f5' : '#1f2937',
      level0: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      level1: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)',
      level2: isDark ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.32)',
      level3: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.52)',
      heatGrass: grass.heatGrass,
      barTrack: grass.barTrack,
      barFill: grass.barFill,
    };
  }, [isDark]);

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
        <View style={styles.mainTabRow}>
          <Pressable
            onPress={() => setMainTab('history')}
            style={[
              styles.mainTabBtn,
              mainTab === 'history' && {
                backgroundColor: isDark ? '#fafafa' : '#18181b',
              },
            ]}>
            <ThemedText
              style={styles.mainTabLabel}
              lightColor={mainTab === 'history' ? '#ffffff' : '#52525b'}
              darkColor={mainTab === 'history' ? '#18181b' : '#a1a1aa'}>
              히스토리
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setMainTab('categoryAnalysis')}
            style={[
              styles.mainTabBtn,
              mainTab === 'categoryAnalysis' && {
                backgroundColor: isDark ? '#fafafa' : '#18181b',
              },
            ]}>
            <ThemedText
              style={styles.mainTabLabel}
              lightColor={mainTab === 'categoryAnalysis' ? '#ffffff' : '#52525b'}
              darkColor={mainTab === 'categoryAnalysis' ? '#18181b' : '#a1a1aa'}>
              카테고리 분석
            </ThemedText>
          </Pressable>
        </View>
        {mainTab === 'history' ? (
          <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>오늘의 히스토리 요약</ThemedText>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>{streak}일</ThemedText>
              <ThemedText style={styles.summaryLabel} lightColor={tone.muted} darkColor={tone.muted}>
                연속 달성
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {formatCountKo(growth.currentWeekCompletions)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel} lightColor={tone.muted} darkColor={tone.muted}>
                이번 주 완료
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {growth.previousWeekCompletions <= 0
                  ? growth.currentWeekCompletions > 0
                    ? '+100%'
                    : '0%'
                  : `${Math.round(growth.diffRatio * 100)}%`}
              </ThemedText>
              <ThemedText style={styles.summaryLabel} lightColor={tone.muted} darkColor={tone.muted}>
                지난주 대비
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.coachingMessage} lightColor={tone.muted} darkColor={tone.muted}>
            {coachingMessage}
          </ThemedText>
          <View style={[styles.riskCard, { borderColor: tone.border, backgroundColor: tone.level0 }]}>
            <ThemedText style={styles.riskTitle}>스트릭 리스크</ThemedText>
            <ThemedText style={styles.riskBody} lightColor={tone.muted} darkColor={tone.muted}>
              {streakRiskMessage}
            </ThemedText>
          </View>
          </View>
        ) : null}

        {mainTab === 'categoryAnalysis' ? (
          <>
            <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>카테고리 성장</ThemedText>
          <ThemedText style={styles.sectionDesc} lightColor={tone.muted} darkColor={tone.muted}>
            {categorySortDesc}
          </ThemedText>
          <View style={styles.categorySortRow}>
            <Pressable
              onPress={() => setCategorySortMode('share')}
              style={[
                styles.categorySortBtn,
                categorySortMode === 'share' && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              ]}>
              <ThemedText
                style={styles.categorySortLabel}
                lightColor={categorySortMode === 'share' ? '#ffffff' : '#52525b'}
                darkColor={categorySortMode === 'share' ? '#18181b' : '#a1a1aa'}>
                비중순
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setCategorySortMode('growth')}
              style={[
                styles.categorySortBtn,
                categorySortMode === 'growth' && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              ]}>
              <ThemedText
                style={styles.categorySortLabel}
                lightColor={categorySortMode === 'growth' ? '#ffffff' : '#52525b'}
                darkColor={categorySortMode === 'growth' ? '#18181b' : '#a1a1aa'}>
                성장률순
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setCategorySortMode('recent')}
              style={[
                styles.categorySortBtn,
                categorySortMode === 'recent' && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              ]}>
              <ThemedText
                style={styles.categorySortLabel}
                lightColor={categorySortMode === 'recent' ? '#ffffff' : '#52525b'}
                darkColor={categorySortMode === 'recent' ? '#18181b' : '#a1a1aa'}>
                최근활동순
              </ThemedText>
            </Pressable>
          </View>
          {!isHydrated ? (
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              불러오는 중…
            </ThemedText>
          ) : categoryRows.length === 0 ? (
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              아직 기록이 없어요. 오늘 플로우를 완료하면 성장 그래프가 시작돼요.
            </ThemedText>
          ) : (
            categoryRows.map((row) => (
              <View key={row.categoryKey} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <ThemedText style={styles.categoryTitle}>
                    {categoryReminderLabelKo(row.categoryKey)}
                  </ThemedText>
                  <View style={styles.categoryStatCol}>
                    <ThemedText style={styles.categoryValue}>{row.primaryLabel}</ThemedText>
                    <ThemedText
                      style={styles.categoryDelta}
                      lightColor={tone.muted}
                      darkColor={tone.muted}>
                      {row.secondaryLabel}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.track, { backgroundColor: tone.barTrack }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${row.barPercent}%`,
                        backgroundColor: tone.barFill,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
            </View>

            <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>카테고리별 히스토리 분석</ThemedText>
          <ThemedText style={styles.sectionDesc} lightColor={tone.muted} darkColor={tone.muted}>
            누적 완료, 활동 일수, 최근 7일 완료를 함께 비교해요.
          </ThemedText>
          {categoryAnalysisRows.length === 0 ? (
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              분석할 카테고리 기록이 아직 없어요.
            </ThemedText>
          ) : (
            <>
              <View style={styles.analysisHeaderRow}>
                <ThemedText style={[styles.analysisHeaderCell, styles.analysisColCategory]} lightColor={tone.muted} darkColor={tone.muted}>
                  카테고리
                </ThemedText>
                <ThemedText style={[styles.analysisHeaderCell, styles.analysisColNum]} lightColor={tone.muted} darkColor={tone.muted}>
                  누적완료
                </ThemedText>
                <ThemedText style={[styles.analysisHeaderCell, styles.analysisColNum]} lightColor={tone.muted} darkColor={tone.muted}>
                  활동일
                </ThemedText>
                <ThemedText style={[styles.analysisHeaderCell, styles.analysisColNum]} lightColor={tone.muted} darkColor={tone.muted}>
                  최근7일
                </ThemedText>
              </View>
              {categoryAnalysisRows.map((row) => (
                <View key={row.categoryKey} style={[styles.analysisRow, { borderTopColor: tone.border }]}>
                  <ThemedText style={[styles.analysisCell, styles.analysisColCategory]} numberOfLines={1}>
                    {categoryReminderLabelKo(row.categoryKey)}
                  </ThemedText>
                  <ThemedText style={[styles.analysisCell, styles.analysisColNum]}>
                    {formatCountKo(row.totalCompletions)}
                  </ThemedText>
                  <ThemedText style={[styles.analysisCell, styles.analysisColNum]}>
                    {row.activeDays}일
                  </ThemedText>
                  <ThemedText style={[styles.analysisCell, styles.analysisColNum]}>
                    {formatCountKo(row.last7Completions)}
                  </ThemedText>
                </View>
              ))}
            </>
          )}
            </View>
          </>
        ) : null}

        {mainTab === 'history' ? (
          <>
          <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>주간 활동</ThemedText>
          <ThemedText style={styles.sectionDesc} lightColor={tone.muted} darkColor={tone.muted}>
            최근 4주 히트맵이에요. 잔디색이 진할수록 그날 달성이 많아요.
          </ThemedText>
          <View style={styles.heatMapWrap}>
            {heatMapRows.map((week, rowIdx) => (
              <View key={`week-${rowIdx}`} style={styles.heatMapRow}>
                {week.map((cell) => {
                  const levelColor = tone.heatGrass[cell.level] ?? tone.heatGrass[0];
                  const selected = selectedHeatDateKey === cell.dateKey;
                  return (
                    <Pressable
                      key={cell.dateKey}
                      onPress={() => setSelectedHeatDateKey(cell.dateKey)}
                      onLongPress={() => setDetailSheetDateKey(cell.dateKey)}
                      style={[
                        styles.heatCell,
                        { backgroundColor: levelColor },
                        selected && { borderColor: tone.ink, borderWidth: 1.5 },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          <View style={[styles.selectedDayCard, { borderColor: tone.border }]}>
            <View style={styles.selectedDayHeader}>
              <ThemedText style={styles.selectedDayTitle}>
                {formatDateKeyKo(selectedHeatDetail.dateKey)}
              </ThemedText>
              <View style={styles.selectedDayBadgeRow}>
                {selectedIsToday ? (
                  <View style={[styles.dayBadge, { backgroundColor: tone.level2 }]}>
                    <ThemedText style={styles.dayBadgeText}>오늘</ThemedText>
                  </View>
                ) : null}
                <View style={[styles.dayBadge, { backgroundColor: tone.level1 }]}>
                  <ThemedText style={styles.dayBadgeText}>선택일</ThemedText>
                </View>
              </View>
            </View>
            <ThemedText style={styles.selectedDayMeta} lightColor={tone.muted} darkColor={tone.muted}>
              완료 {formatCountKo(selectedHeatDetail.completedFlowCount)} · 달성률 {formatRatePercent(selectedHeatDetail.completionRate)}
            </ThemedText>
            <ThemedText style={styles.selectedDayMeta} lightColor={tone.muted} darkColor={tone.muted}>
              전일 대비 {selectedHeatDiffCompletions >= 0 ? '+' : ''}
              {formatCountKo(Math.abs(selectedHeatDiffCompletions))}
            </ThemedText>
            {selectedHeatTopCategories.length > 0 ? (
              <View style={styles.dayTopCategoryList}>
                {selectedHeatTopCategories.map((row, idx) => (
                  <ThemedText
                    key={`${row.categoryKey}-${idx}`}
                    style={styles.dayTopCategoryRow}
                    lightColor={tone.muted}
                    darkColor={tone.muted}>
                    {`${idx + 1}. ${categoryReminderLabelKo(row.categoryKey)} · ${formatCountKo(row.completions)}`}
                  </ThemedText>
                ))}
              </View>
            ) : (
              <ThemedText style={styles.dayTopCategoryRow} lightColor={tone.muted} darkColor={tone.muted}>
                아직 카테고리 기록이 없어요.
              </ThemedText>
            )}
          </View>
          <ThemedText style={styles.streakHint} lightColor={tone.ink} darkColor={tone.ink}>
            연속 {streak}일째 기록 중입니다. 작은 완수도 꾸준히 쌓여요.
          </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>요일별 활동성</ThemedText>
          <View style={styles.consistencySegment}>
            <Pressable
              onPress={() => setConsistencyMode('week')}
              style={[
                styles.consistencySegmentBtn,
                consistencyMode === 'week' && {
                  backgroundColor: isDark ? '#fafafa' : '#18181b',
                },
              ]}>
              <ThemedText
                style={styles.consistencySegmentLabel}
                lightColor={consistencyMode === 'week' ? '#ffffff' : '#52525b'}
                darkColor={consistencyMode === 'week' ? '#18181b' : '#a1a1aa'}>
                주간
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setConsistencyMode('month')}
              style={[
                styles.consistencySegmentBtn,
                consistencyMode === 'month' && {
                  backgroundColor: isDark ? '#fafafa' : '#18181b',
                },
              ]}>
              <ThemedText
                style={styles.consistencySegmentLabel}
                lightColor={consistencyMode === 'month' ? '#ffffff' : '#52525b'}
                darkColor={consistencyMode === 'month' ? '#18181b' : '#a1a1aa'}>
                월간
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.consistencyBarList}>
            {consistencyRows.map((row) => (
              <View key={`weekday-${row.weekday}`} style={styles.consistencyBarRow}>
                <ThemedText style={styles.consistencyDay} lightColor={tone.muted} darkColor={tone.muted}>
                  {WEEKDAY_LABELS_KO[row.weekday]}
                </ThemedText>
                <View style={[styles.consistencyTrack, { backgroundColor: tone.barTrack }]}>
                  <View
                    style={[
                      styles.consistencyFill,
                      {
                        width: `${Math.max(4, Math.round((row.averageCompletions / consistencyMax) * 100))}%`,
                        backgroundColor: tone.barFill,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.consistencyValue}>
                  {formatCountKo(row.averageCompletions)}
                </ThemedText>
              </View>
            ))}
          </View>
          </View>
          </>
        ) : null}

        <ThemedText style={styles.footnote} lightColor={tone.muted} darkColor={tone.muted}>
          히스토리는 루틴 완료 여부를 기준으로 쌓여요. 정해진 시간 안에 달성한 기록이 스트릭과 성장 지표에 반영됩니다.
        </ThemedText>
      </ScrollView>

      <Modal
        visible={detailSheetDateKey !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailSheetDateKey(null)}>
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetDim} onPress={() => setDetailSheetDateKey(null)} />
          <View style={[styles.sheetCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
            <ThemedText style={styles.sheetTitle}>
              {formatDateKeyKo(detailSheetRow?.dateKey ?? '')} 기록
            </ThemedText>
            <ThemedText style={styles.sheetMeta} lightColor={tone.muted} darkColor={tone.muted}>
              완료 {formatCountKo(detailSheetRow?.completedFlowCount ?? 0)} · 달성률{' '}
              {formatRatePercent(detailSheetRow?.completionRate ?? 0)}
            </ThemedText>
            <View style={styles.sheetList}>
              {detailSheetCategories.length === 0 ? (
                <ThemedText style={styles.sheetEmpty} lightColor={tone.muted} darkColor={tone.muted}>
                  카테고리 기록이 아직 없어요.
                </ThemedText>
              ) : (
                detailSheetCategories.map((row) => (
                  <Pressable
                    key={row.categoryKey}
                    onPress={() => setDetailCategoryKey(row.categoryKey)}
                    style={[
                      styles.sheetRow,
                      { borderTopColor: tone.border },
                      detailCategoryKey === row.categoryKey && {
                        backgroundColor: tone.level0,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                      },
                    ]}>
                    <ThemedText style={styles.sheetRowTitle}>
                      {categoryReminderLabelKo(row.categoryKey)}
                    </ThemedText>
                    <ThemedText style={styles.sheetRowValue}>
                      {formatCountKo(row.completions)}
                    </ThemedText>
                  </Pressable>
                ))
              )}
            </View>
            {detailCategoryKey && detailCategorySeries.length > 0 ? (
              <View style={styles.sheetMiniChart}>
                <ThemedText style={styles.sheetMiniChartTitle}>
                  {categoryReminderLabelKo(detailCategoryKey)} 최근 7일
                </ThemedText>
                <View style={styles.sheetMiniBars}>
                  {detailCategorySeries.map((row) => (
                    <View key={row.dateKey} style={styles.sheetMiniBarCol}>
                      <View style={[styles.sheetMiniBarTrack, { backgroundColor: tone.barTrack }]}>
                        <View
                          style={[
                            styles.sheetMiniBarFill,
                            {
                              height: `${Math.max(6, Math.round((row.completions / detailCategoryMax) * 100))}%`,
                              backgroundColor: tone.barFill,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.sheetMiniBarLabel} lightColor={tone.muted} darkColor={tone.muted}>
                        {formatDateKeyKo(row.dateKey).replace('월 ', '/').replace('일', '')}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <ThemedText style={styles.sheetHint} lightColor={tone.muted} darkColor={tone.muted}>
              셀을 길게 누르면 날짜별 상세를 확인할 수 있어요.
            </ThemedText>
          </View>
        </View>
      </Modal>
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
  mainTabRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
  },
  mainTabBtn: {
    flex: 1,
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mainTabLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 2,
  },
  summaryRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  coachingMessage: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  riskCard: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  riskTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  riskBody: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  categorySortRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  categorySortBtn: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  categorySortLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  analysisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  analysisHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  analysisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  analysisCell: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  analysisColCategory: {
    flex: 1.4,
    minWidth: 0,
  },
  analysisColNum: {
    flex: 1,
    textAlign: 'right',
  },
  categoryRow: {
    gap: 6,
    marginTop: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryStatCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  categoryDelta: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  heatMapWrap: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  heatMapRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
  },
  heatCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 40,
    borderRadius: 6,
  },
  selectedDayCard: {
    width: '100%',
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedDayBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  selectedDayMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayTopCategoryList: {
    marginTop: 4,
    gap: 2,
  },
  dayTopCategoryRow: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  streakHint: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  consistencySegment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  consistencySegmentBtn: {
    minHeight: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  consistencySegmentLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  consistencyBarList: {
    width: '100%',
    marginTop: 8,
    gap: 10,
  },
  consistencyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  consistencyDay: {
    width: 18,
    fontSize: 12,
    fontWeight: '700',
  },
  consistencyTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  consistencyFill: {
    height: '100%',
    borderRadius: 4,
  },
  consistencyValue: {
    width: 64,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyNote: {
    fontSize: 14,
    lineHeight: 21,
    paddingVertical: 8,
  },
  footnote: {
    width: '100%',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetCard: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetMeta: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  sheetList: {
    marginTop: 4,
  },
  sheetEmpty: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    paddingVertical: 8,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    gap: 10,
  },
  sheetRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  sheetRowValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  sheetMiniChart: {
    marginTop: 4,
    gap: 8,
  },
  sheetMiniChartTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  sheetMiniBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  sheetMiniBarCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  sheetMiniBarTrack: {
    width: '100%',
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sheetMiniBarFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 2,
  },
  sheetMiniBarLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});
