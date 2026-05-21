import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  addDaysToLocalDateKey,
  categoryReminderLabelKo,
  getLocalDateKey,
} from '@entities/day-plan';
import { useHistoryStore } from '@entities/history';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

/** 하단 탭바 아래 끝 여백 — `DayPlanCustomTabBar`가 세이프 영역을 이미 담당 */
const SCROLL_END_GAP_PX = 6;

type ConsistencyMode = 'week' | 'month';
type CategorySortMode = 'share' | 'growth' | 'recent';
type StatisticsMainTab = 'history' | 'categoryAnalysis';

const WEEKDAY_LABELS_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

function formatMinutesKo(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}분`;
  if (r === 0) return `${h}시간`;
  return `${h}시간 ${r}분`;
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

function growthRatio(current: number, prev: number): number {
  const c = Math.max(0, current);
  const p = Math.max(0, prev);
  if (p <= 0) return c > 0 ? 1 : 0;
  return c / p - 1;
}

function formatIsoDateKo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function milestoneConditionText(id: string): string {
  if (id === 'streak-7') return '조건: 연속 7일 집중';
  if (id === 'streak-30') return '조건: 연속 30일 집중';
  if (id === 'minutes-3000') return '조건: 누적 50시간 집중';
  return '조건: 누적 기록 달성';
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
  const [badgeToastText, setBadgeToastText] = useState<string | null>(null);
  const achievementIdsRef = useRef<Set<string> | null>(null);

  const {
    isHydrated,
    hydrate,
    dailyStatsByDate,
    achievements,
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
      achievements: s.achievements,
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
    () => selectCategoryBreakdown(monthRange).slice(0, 6),
    [dailyStatsByDate, monthRange, selectCategoryBreakdown],
  );
  const currentWeekCategoryMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < weekRange.startDateKey || row.dateKey > weekRange.endDateKey) continue;
      for (const [key, minutes] of Object.entries(row.categoryMinutes)) {
        map[key] = (map[key] ?? 0) + minutes;
      }
    }
    return map;
  }, [dailyStatsByDate, weekRange.endDateKey, weekRange.startDateKey]);
  const categoryAnalysisRows = useMemo(() => {
    const map = new Map<
      string,
      { totalMinutes: number; activeDays: number; last7Minutes: number }
    >();
    const last7Start = addDaysToLocalDateKey(todayDateKey, -6);
    for (const [dateKey, row] of Object.entries(dailyStatsByDate)) {
      for (const [categoryKey, minutesRaw] of Object.entries(row.categoryMinutes ?? {})) {
        const minutes = Math.max(0, Math.floor(Number(minutesRaw) || 0));
        if (minutes <= 0) continue;
        const prev = map.get(categoryKey) ?? { totalMinutes: 0, activeDays: 0, last7Minutes: 0 };
        prev.totalMinutes += minutes;
        prev.activeDays += 1;
        if (dateKey >= last7Start && dateKey <= todayDateKey) prev.last7Minutes += minutes;
        map.set(categoryKey, prev);
      }
    }
    return [...map.entries()]
      .map(([categoryKey, stat]) => ({ categoryKey, ...stat }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 8);
  }, [dailyStatsByDate, todayDateKey]);
  const prevWeekCategoryMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const row of Object.values(dailyStatsByDate)) {
      if (row.dateKey < prevWeekRange.startDateKey || row.dateKey > prevWeekRange.endDateKey) continue;
      for (const [key, minutes] of Object.entries(row.categoryMinutes)) {
        map[key] = (map[key] ?? 0) + minutes;
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
      };
    }
    return row;
  }, [dailyStatsByDate, selectedHeatDateKey, todayDateKey]);
  const prevDateKey = useMemo(
    () => addDaysToLocalDateKey(selectedHeatDetail.dateKey, -1),
    [selectedHeatDetail.dateKey],
  );
  const selectedHeatPrev = dailyStatsByDate[prevDateKey];
  const selectedHeatDiffMinutes = selectedHeatDetail.focusMinutes - (selectedHeatPrev?.focusMinutes ?? 0);
  const selectedHeatTopCategories = useMemo(
    () =>
      Object.entries(selectedHeatDetail.categoryMinutes ?? {})
        .map(([categoryKey, minutes]) => ({ categoryKey, minutes }))
        .filter((row) => row.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 3),
    [selectedHeatDetail],
  );
  const milestoneRows = useMemo(
    () => [...achievements].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)).slice(0, 4),
    [achievements],
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
      }
    );
  }, [dailyStatsByDate, detailSheetDateKey]);
  const detailSheetCategories = useMemo(
    () =>
      Object.entries(detailSheetRow?.categoryMinutes ?? {})
        .map(([categoryKey, minutes]) => ({ categoryKey, minutes }))
        .filter((row) => row.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes),
    [detailSheetRow],
  );
  const detailCategorySeries = useMemo(() => {
    if (!detailSheetDateKey || !detailCategoryKey) return [];
    const out: Array<{ dateKey: string; minutes: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const dateKey = addDaysToLocalDateKey(detailSheetDateKey, -i);
      const row = dailyStatsByDate[dateKey];
      out.push({
        dateKey,
        minutes: row?.categoryMinutes?.[detailCategoryKey] ?? 0,
      });
    }
    return out;
  }, [dailyStatsByDate, detailCategoryKey, detailSheetDateKey]);
  const detailCategoryMax = Math.max(1, ...detailCategorySeries.map((row) => row.minutes));
  const consistencyRows = useMemo(
    () => selectConsistencyByWeekday(consistencyMode === 'week' ? weekRange : monthRange),
    [consistencyMode, dailyStatsByDate, monthRange, selectConsistencyByWeekday, weekRange],
  );

  const consistencyMax = Math.max(
    1,
    ...consistencyRows.map((row) => row.averageMinutes),
  );
  const coachingMessage = useMemo(() => {
    if (!isHydrated) return '히스토리를 불러오는 중이에요.';
    if (streak >= 14) return `연속 ${streak}일째에요. 지금 페이스를 유지하면 이번 달 최고 기록을 만들 수 있어요.`;
    if (growth.diffMinutes > 0) return `지난주보다 ${formatMinutesKo(growth.diffMinutes)} 더 집중했어요. 성장 흐름이 좋아요.`;
    if (growth.diffMinutes < 0) return `지난주보다 ${formatMinutesKo(Math.abs(growth.diffMinutes))} 줄었어요. 오늘 15분만 더 쌓아보면 회복이 빨라요.`;
    return '오늘 첫 완료를 만들면 히스토리 성장 그래프가 더 선명해져요.';
  }, [growth.diffMinutes, isHydrated, streak]);
  const streakRiskMessage = useMemo(() => {
    const todayMinutes = dailyStatsByDate[todayDateKey]?.focusMinutes ?? 0;
    const targetMinutes = 15;
    if (!isHydrated) return '오늘 기록을 계산 중이에요.';
    if (streak === 0) return '오늘 15분 집중으로 새 스트릭을 시작해보세요.';
    if (todayMinutes >= targetMinutes) return `좋아요! 오늘 이미 ${formatMinutesKo(todayMinutes)}를 쌓았어요.`;
    return `스트릭 유지까지 ${formatMinutesKo(targetMinutes - todayMinutes)} 남았어요.`;
  }, [dailyStatsByDate, isHydrated, streak, todayDateKey]);
  const categoryRows = useMemo(() => {
    const rows = [...categoryRowsBase];
    if (categorySortMode === 'growth') {
      rows.sort((a, b) => {
        const bg = growthRatio(
          currentWeekCategoryMinutes[b.categoryKey] ?? 0,
          prevWeekCategoryMinutes[b.categoryKey] ?? 0,
        );
        const ag = growthRatio(
          currentWeekCategoryMinutes[a.categoryKey] ?? 0,
          prevWeekCategoryMinutes[a.categoryKey] ?? 0,
        );
        return bg - ag;
      });
      return rows;
    }
    if (categorySortMode === 'recent') {
      rows.sort(
        (a, b) =>
          (currentWeekCategoryMinutes[b.categoryKey] ?? 0) -
          (currentWeekCategoryMinutes[a.categoryKey] ?? 0),
      );
      return rows;
    }
    return rows;
  }, [
    categoryRowsBase,
    categorySortMode,
    currentWeekCategoryMinutes,
    prevWeekCategoryMinutes,
  ]);
  const selectedIsToday = selectedHeatDetail.dateKey === todayDateKey;

  useEffect(() => {
    if (!isHydrated) return;
    const currentIds = new Set(achievements.map((a) => a.id));
    if (achievementIdsRef.current === null) {
      achievementIdsRef.current = currentIds;
      return;
    }
    const prev = achievementIdsRef.current;
    const newlyUnlocked = achievements.find((a) => !prev.has(a.id));
    achievementIdsRef.current = currentIds;
    if (!newlyUnlocked) return;
    setBadgeToastText(`새 배지 달성: ${newlyUnlocked.title}`);
    const timer = setTimeout(() => setBadgeToastText(null), 2200);
    return () => clearTimeout(timer);
  }, [achievements, isHydrated]);

  useEffect(() => {
    if (!detailSheetDateKey) {
      setDetailCategoryKey(null);
      return;
    }
    const firstKey =
      Object.entries(dailyStatsByDate[detailSheetDateKey]?.categoryMinutes ?? {})
        .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    setDetailCategoryKey(firstKey);
  }, [dailyStatsByDate, detailSheetDateKey]);

  const tone = useMemo(
    () => ({
      card: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      border: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      muted: isDark ? '#a1a1aa' : '#71717a',
      ink: isDark ? '#f5f5f5' : '#1f2937',
      level0: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      level1: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)',
      level2: isDark ? 'rgba(255,255,255,0.34)' : 'rgba(0,0,0,0.32)',
      level3: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.52)',
    }),
    [isDark],
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
                연속 집중
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {formatMinutesKo(growth.currentWeekMinutes)}
              </ThemedText>
              <ThemedText style={styles.summaryLabel} lightColor={tone.muted} darkColor={tone.muted}>
                이번 주 집중
              </ThemedText>
            </View>
            <View style={styles.summaryItem}>
              <ThemedText style={styles.summaryValue}>
                {growth.previousWeekMinutes <= 0
                  ? growth.currentWeekMinutes > 0
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
            최근 30일 기준으로 어떤 영역에 시간을 쌓았는지 보여줘요.
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
                    <ThemedText style={styles.categoryValue}>
                      {Math.round(row.ratio * 100)}%
                    </ThemedText>
                    <ThemedText
                      style={styles.categoryDelta}
                      lightColor={tone.muted}
                      darkColor={tone.muted}>
                      {formatDeltaPercent(
                        growthRatio(
                          currentWeekCategoryMinutes[row.categoryKey] ?? 0,
                          prevWeekCategoryMinutes[row.categoryKey] ?? 0,
                        ),
                      )}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.track, { backgroundColor: tone.level0 }]}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.max(6, Math.round(row.ratio * 100))}%`,
                        backgroundColor: isDark ? '#d4d4d8' : '#737373',
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
            누적 집중 시간, 활동 일수, 최근 7일 시간을 함께 비교해요.
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
                  누적
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
                    {formatMinutesKo(row.totalMinutes)}
                  </ThemedText>
                  <ThemedText style={[styles.analysisCell, styles.analysisColNum]}>
                    {row.activeDays}일
                  </ThemedText>
                  <ThemedText style={[styles.analysisCell, styles.analysisColNum]}>
                    {formatMinutesKo(row.last7Minutes)}
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
            최근 4주 히트맵이에요. 색이 진할수록 집중 시간이 길어요.
          </ThemedText>
          <View style={styles.heatMapWrap}>
            {heatMapRows.map((week, rowIdx) => (
              <View key={`week-${rowIdx}`} style={styles.heatMapRow}>
                {week.map((cell) => {
                  const levelColor =
                    cell.level === 0
                      ? tone.level0
                      : cell.level === 1
                        ? tone.level1
                        : cell.level === 2
                          ? tone.level2
                          : tone.level3;
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
              집중 {formatMinutesKo(selectedHeatDetail.focusMinutes)} · 완료 {selectedHeatDetail.completedFlowCount}개 · 세션 {selectedHeatDetail.sessionCount}회
            </ThemedText>
            <ThemedText style={styles.selectedDayMeta} lightColor={tone.muted} darkColor={tone.muted}>
              달성률 {formatRatePercent(selectedHeatDetail.completionRate)} · 전일 대비 {selectedHeatDiffMinutes >= 0 ? '+' : ''}
              {formatMinutesKo(Math.abs(selectedHeatDiffMinutes))}
            </ThemedText>
            {selectedHeatTopCategories.length > 0 ? (
              <View style={styles.dayTopCategoryList}>
                {selectedHeatTopCategories.map((row, idx) => (
                  <ThemedText
                    key={`${row.categoryKey}-${idx}`}
                    style={styles.dayTopCategoryRow}
                    lightColor={tone.muted}
                    darkColor={tone.muted}>
                    {`${idx + 1}. ${categoryReminderLabelKo(row.categoryKey)} · ${formatMinutesKo(row.minutes)}`}
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
          <ThemedText style={styles.sectionTitle}>마일스톤 배지</ThemedText>
          {milestoneRows.length === 0 ? (
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              첫 마일스톤을 향해 기록을 쌓아보세요.
            </ThemedText>
          ) : (
            <View style={styles.badgeList}>
              {milestoneRows.map((badge) => (
                <View key={badge.id} style={[styles.badgeItem, { borderColor: tone.border }]}>
                  <ThemedText style={styles.badgeTitle}>{badge.title}</ThemedText>
                  <ThemedText style={styles.badgeDesc} lightColor={tone.muted} darkColor={tone.muted}>
                    {badge.description ?? '목표를 달성했어요.'}
                  </ThemedText>
                  <ThemedText style={styles.badgeMeta} lightColor={tone.muted} darkColor={tone.muted}>
                    {`${milestoneConditionText(badge.id)} · 달성일 ${formatIsoDateKo(badge.unlockedAt) || '-'}`}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
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
                <View style={[styles.consistencyTrack, { backgroundColor: tone.level0 }]}>
                  <View
                    style={[
                      styles.consistencyFill,
                      {
                        width: `${Math.max(4, Math.round((row.averageMinutes / consistencyMax) * 100))}%`,
                        backgroundColor: isDark ? '#d4d4d8' : '#737373',
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.consistencyValue}>
                  {formatMinutesKo(row.averageMinutes)}
                </ThemedText>
              </View>
            ))}
          </View>
          </View>
          </>
        ) : null}

        <ThemedText style={styles.footnote} lightColor={tone.muted} darkColor={tone.muted}>
          히스토리는 세션 완료와 자동 완료 이벤트를 함께 반영해요. 매일의 기록이 누적되어 스트릭과 성장 지표가 업데이트됩니다.
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
              집중 {formatMinutesKo(detailSheetRow?.focusMinutes ?? 0)} · 완료 {detailSheetRow?.completedFlowCount ?? 0}
              개 · 세션 {detailSheetRow?.sessionCount ?? 0}회
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
                      {formatMinutesKo(row.minutes)}
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
                      <View style={[styles.sheetMiniBarTrack, { backgroundColor: tone.level0 }]}>
                        <View
                          style={[
                            styles.sheetMiniBarFill,
                            {
                              height: `${Math.max(6, Math.round((row.minutes / detailCategoryMax) * 100))}%`,
                              backgroundColor: tone.level3,
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

      {badgeToastText ? (
        <View style={[styles.badgeToast, { backgroundColor: tone.ink }]}>
          <ThemedText style={styles.badgeToastText} lightColor={isDark ? '#18181b' : '#fafafa'} darkColor={isDark ? '#18181b' : '#fafafa'}>
            {badgeToastText}
          </ThemedText>
        </View>
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
  badgeList: {
    gap: 10,
  },
  badgeItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeDesc: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  badgeMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
  badgeToast: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeToastText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
