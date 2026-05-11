import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  buildCompletedCountByCategoryKey,
  categoryReminderLabelKo,
  getLocalDateKey,
  useDayPlanStore,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { loadDayPlanStatsHistory } from '@shared/lib/storage/dayPlanStatsHistoryStorage';
import type { DayPlanStatsDayRow } from '@shared/lib/storage/dayPlanStatsHistoryStorage';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { aggregateByCategory, mergeHistoryWithTodayRow } from '../lib/aggregateDayPlanStats';
import { coerceDayPlanDateKey } from '../lib/planDateKeyParse';
import { StatisticsTrendChartCard } from './StatisticsTrendChartCard';

/** 하단 탭바 아래 끝 여백 — `DayPlanCustomTabBar`가 세이프 영역을 이미 담당 */
const SCROLL_END_GAP_PX = 6;

type SegmentMode = 'trend' | 'category';

/** 데이플랜 하단 탭 — 추이 그래프·카테고리별 완료 히스토리 */
export function DayPlanStatisticsPage() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [segment, setSegment] = useState<SegmentMode>('trend');
  const [historyEpoch, bumpHistoryEpoch] = useState(0);

  const { blocks, completedBlockIds, dateKey, isHydrated } = useDayPlanStore(
    useShallow((s) => ({
      blocks: s.blocks,
      completedBlockIds: s.completedBlockIds,
      dateKey: s.dateKey,
      isHydrated: s.isHydrated,
    })),
  );

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useFocusEffect(
    useCallback(() => {
      bumpHistoryEpoch((n) => n + 1);
    }, []),
  );

  const anchorDateKey = useMemo(
    () => coerceDayPlanDateKey(dateKey, getLocalDateKey),
    [dateKey],
  );

  const mergedRows = useMemo(() => {
    void historyEpoch;
    const history = loadDayPlanStatsHistory();
    const todayRow: DayPlanStatsDayRow = {
      dateKey: anchorDateKey,
      completedByCategory: buildCompletedCountByCategoryKey(blocks, completedBlockIds),
    };
    return mergeHistoryWithTodayRow(history, todayRow);
  }, [anchorDateKey, blocks, completedBlockIds, historyEpoch]);

  const categoryRows = useMemo(() => aggregateByCategory(mergedRows), [mergedRows]);

  const cardStyle = useMemo(
    () => ({
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    }),
    [isDark],
  );

  const segmentWrap = useMemo(
    () => ({
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    }),
    [isDark],
  );

  const onSegment = useCallback((next: SegmentMode) => {
    if (next === segment) return;
    void Haptics.selectionAsync();
    setSegment(next);
  }, [segment]);

  const hasAnyCompletion = categoryRows.length > 0;

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
        <View style={[styles.segmentShell, segmentWrap]}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: segment === 'trend' }}
            onPress={() => onSegment('trend')}
            style={({ pressed }) => [
              styles.segmentBtn,
              segment === 'trend' && styles.segmentBtnActive,
              segment === 'trend' && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              pressed && { opacity: 0.9 },
            ]}>
            <ThemedText
              style={styles.segmentLabel}
              lightColor={segment === 'trend' ? '#ffffff' : '#52525b'}
              darkColor={segment === 'trend' ? '#18181b' : '#a1a1aa'}>
              그래프
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: segment === 'category' }}
            onPress={() => onSegment('category')}
            style={({ pressed }) => [
              styles.segmentBtn,
              segment === 'category' && styles.segmentBtnActive,
              segment === 'category' && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
              pressed && { opacity: 0.9 },
            ]}>
            <ThemedText
              style={styles.segmentLabel}
              lightColor={segment === 'category' ? '#ffffff' : '#52525b'}
              darkColor={segment === 'category' ? '#18181b' : '#a1a1aa'}>
              카테고리별
            </ThemedText>
          </Pressable>
        </View>

        {segment === 'trend' ? (
          <StatisticsTrendChartCard
            mergedRows={mergedRows}
            todayDateKey={anchorDateKey}
            isDark={isDark}
            cardBorderColor={cardStyle.borderColor}
            cardSurfaceColor={cardStyle.backgroundColor}
          />
        ) : (
          <View style={[styles.card, cardStyle]}>
            <ThemedText style={styles.sectionTitle}>카테고리별 달성</ThemedText>
            <ThemedText style={styles.sectionDesc} lightColor="#52525b" darkColor="#a1a1aa">
              저장된 기간 동안 항목별 완료 횟수와, 완료가 있었던 날 수를 모았어요.
            </ThemedText>
            {!isHydrated ? (
              <ThemedText style={styles.emptyNote} lightColor="#71717a" darkColor="#a1a1aa">
                불러오는 중…
              </ThemedText>
            ) : !hasAnyCompletion ? (
              <ThemedText style={styles.emptyNote} lightColor="#71717a" darkColor="#a1a1aa">
                아직 기록된 완료가 없어요. 집중 세션에서 플로우를 완료하면 여기에 쌓여요.
              </ThemedText>
            ) : (
              <>
                <View style={styles.tableHeader}>
                  <ThemedText style={[styles.th, styles.thCat]} lightColor="#71717a" darkColor="#a1a1aa">
                    항목
                  </ThemedText>
                  <ThemedText style={[styles.th, styles.thNum]} lightColor="#71717a" darkColor="#a1a1aa">
                    완료 합계
                  </ThemedText>
                  <ThemedText style={[styles.th, styles.thLast]} lightColor="#71717a" darkColor="#a1a1aa">
                    달성 일수
                  </ThemedText>
                </View>
                {categoryRows.map((row) => (
                  <View
                    key={row.categoryKey}
                    style={[styles.tableRow, { borderTopColor: cardStyle.borderColor }]}>
                    <ThemedText style={[styles.td, styles.thCat]} numberOfLines={1}>
                      {categoryReminderLabelKo(row.categoryKey)}
                    </ThemedText>
                    <ThemedText style={[styles.td, styles.thNum]}>
                      {row.totalCompletions.toLocaleString('ko-KR')}
                    </ThemedText>
                    <ThemedText style={[styles.td, styles.thLast]}>
                      {row.daysWithCompletion.toLocaleString('ko-KR')}일
                    </ThemedText>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        <ThemedText style={styles.footnote} lightColor="#71717a" darkColor="#71717a">
          「완료」는 집중 세션에서 완료하거나, 지정한 루틴 시간이 끝나면 자동으로 올라가요. 날짜가 바뀌면 전날 일정은 히스토리에 남고, 오늘은 실시간으로 반영돼요.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  segmentShell: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {},
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
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
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    gap: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  td: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  thCat: { flex: 1.2, minWidth: 0 },
  thNum: { flex: 0.85, textAlign: 'right' },
  thLast: { flex: 1, textAlign: 'right' },
  emptyNote: {
    fontSize: 14,
    lineHeight: 21,
    paddingVertical: 8,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
});
