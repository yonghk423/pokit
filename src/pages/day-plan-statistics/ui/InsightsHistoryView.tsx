import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { buildHistoryInsights } from '../lib/historyInsights';
import type { WeeklyAxisRow } from '../lib/weeklyBalanceRadar';

type Tone = {
  card: string;
  border: string;
  muted: string;
  ink: string;
  level0: string;
  barFill: string;
  highlightCard: string;
  highlightCardBorder: string;
  highlightFg: string;
  highlightMuted: string;
};

type HistoryFeedRow = {
  dateKey: string;
  headline: string;
  summary: string;
  rateLabel: string;
  categoryLabel: string;
};

type Props = {
  tone: Tone;
  isDark: boolean;
  isHydrated: boolean;
  todayCompletionRate: number;
  todayCompletedCount: number;
  sameWeekdayAverageScore: number;
  weeklyCompletionRate: number;
  previousWeeklyCompletionRate: number;
  weeklyBalanceScore: number;
  weeklyBalanceRows: WeeklyAxisRow[];
  monthlyRate: number;
  previousMonthlyRate: number;
  activeDaysInMonth: number;
  streak: number;
  weekCompletionDelta: number;
  historyRows: HistoryFeedRow[];
  historyQuery: string;
  onHistoryQueryChange: (value: string) => void;
  historyFilter: string;
  onHistoryFilterChange: (value: string) => void;
  historyFilterChips: string[];
  filteredHistoryRows: HistoryFeedRow[];
  formatDateKeyKo: (dateKey: string) => string;
};

export function InsightsHistoryView({
  tone,
  isDark,
  isHydrated,
  todayCompletionRate,
  todayCompletedCount,
  sameWeekdayAverageScore,
  weeklyCompletionRate,
  previousWeeklyCompletionRate,
  weeklyBalanceScore,
  weeklyBalanceRows,
  monthlyRate,
  previousMonthlyRate,
  activeDaysInMonth,
  streak,
  weekCompletionDelta,
  historyRows,
  historyQuery,
  onHistoryQueryChange,
  historyFilter,
  onHistoryFilterChange,
  historyFilterChips,
  filteredHistoryRows,
  formatDateKeyKo,
}: Props) {
  const [dayLogOpen, setDayLogOpen] = useState(false);

  const report = useMemo(
    () =>
      buildHistoryInsights({
        todayCompletionRate,
        todayCompletedCount,
        sameWeekdayAverageScore,
        weeklyCompletionRate,
        previousWeeklyCompletionRate,
        weeklyBalanceScore,
        weeklyBalanceRows,
        monthlyRate,
        previousMonthlyRate,
        activeDaysInMonth,
        streak,
        weekCompletionDelta,
      }),
    [
      activeDaysInMonth,
      monthlyRate,
      previousMonthlyRate,
      sameWeekdayAverageScore,
      streak,
      todayCompletedCount,
      todayCompletionRate,
      weekCompletionDelta,
      weeklyBalanceRows,
      weeklyBalanceScore,
      weeklyCompletionRate,
      previousWeeklyCompletionRate,
    ],
  );

  return (
    <>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>종합 인사이트</ThemedText>
        <ThemedText style={styles.headerDesc} lightColor={tone.muted} darkColor={tone.muted}>
          데일리 · 위클리 · 먼슬리를 함께 보고 강점과 보완점을 정리해요.
        </ThemedText>
      </View>

      <View style={[styles.heroCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <ThemedText style={styles.heroKicker} lightColor={tone.muted} darkColor={tone.muted}>
          종합 점수
        </ThemedText>
        <ThemedText style={styles.heroScore}>{report.overallScore}%</ThemedText>
        <ThemedText style={styles.heroTitle}>{report.overallTitle}</ThemedText>
        <ThemedText style={styles.heroCaption} lightColor={tone.muted} darkColor={tone.muted}>
          {report.overallCaption}
        </ThemedText>
      </View>

      <View style={styles.dimensionRow}>
        {report.dimensions.map((dim) => (
          <View key={dim.scope} style={[styles.dimensionCard, { backgroundColor: tone.level0, borderColor: tone.border }]}>
            <ThemedText style={styles.dimensionScope} lightColor={tone.muted} darkColor={tone.muted}>
              {dim.scopeLabel}
            </ThemedText>
            <ThemedText style={styles.dimensionScore}>{dim.score}%</ThemedText>
            <ThemedText style={styles.dimensionCaption} lightColor={tone.muted} darkColor={tone.muted}>
              {dim.caption}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={[styles.blockCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <View style={styles.blockHead}>
          <IconSymbol name="hand.thumbsup.fill" size={18} color={tone.barFill} />
          <ThemedText style={styles.blockTitle}>잘하고 있어요</ThemedText>
        </View>
        {report.strengths.length === 0 ? (
          <ThemedText style={styles.blockEmpty} lightColor={tone.muted} darkColor={tone.muted}>
            기록이 쌓이면 강점이 표시돼요.
          </ThemedText>
        ) : (
          report.strengths.map((item) => (
            <View key={item.title} style={styles.bulletRow}>
              <ThemedText style={styles.bulletTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.bulletDetail} lightColor={tone.muted} darkColor={tone.muted}>
                {item.detail}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <View style={[styles.blockCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <View style={styles.blockHead}>
          <IconSymbol name="exclamationmark.circle" size={18} color={tone.muted} />
          <ThemedText style={styles.blockTitle}>아쉬운 점</ThemedText>
        </View>
        {report.weaknesses.length === 0 ? (
          <ThemedText style={styles.blockEmpty} lightColor={tone.muted} darkColor={tone.muted}>
            눈에 띄는 보완점이 없어요. 지금 페이스를 유지해 보세요.
          </ThemedText>
        ) : (
          report.weaknesses.map((item) => (
            <View key={item.title} style={styles.bulletRow}>
              <ThemedText style={styles.bulletTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.bulletDetail} lightColor={tone.muted} darkColor={tone.muted}>
                {item.detail}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      <View
        style={[
          styles.nextCard,
          {
            backgroundColor: tone.highlightCard,
            borderColor: tone.highlightCardBorder,
            borderWidth: tone.highlightCardBorder === 'transparent' ? 0 : StyleSheet.hairlineWidth,
          },
        ]}>
        <ThemedText style={[styles.nextKicker, { color: tone.highlightMuted }]}>다음 제안</ThemedText>
        <ThemedText style={[styles.nextBody, { color: tone.highlightFg }]}>{report.nextStep}</ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <Pressable onPress={() => setDayLogOpen((v) => !v)} style={styles.dayLogHead}>
          <ThemedText style={styles.sectionTitle}>일별 기록</ThemedText>
          <View style={styles.dayLogMeta}>
            <ThemedText style={styles.dayLogCount} lightColor={tone.muted} darkColor={tone.muted}>
              {historyRows.length}일
            </ThemedText>
            <IconSymbol name={dayLogOpen ? 'chevron.up' : 'chevron.down'} size={16} color={tone.muted} />
          </View>
        </Pressable>
        {dayLogOpen ? (
          <>
            <TextInput
              value={historyQuery}
              onChangeText={onHistoryQueryChange}
              placeholder="과거 플로우 또는 노트를 검색해요"
              placeholderTextColor={tone.muted}
              style={[
                styles.searchInput,
                {
                  color: tone.ink,
                  borderColor: tone.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                },
              ]}
            />
            <View style={styles.filterRow}>
              {historyFilterChips.map((chip) => {
                const active = historyFilter === chip;
                const label = chip === 'all' ? '전체' : chip;
                return (
                  <Pressable
                    key={chip}
                    onPress={() => onHistoryFilterChange(chip)}
                    style={[
                      styles.filterChip,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                      active && { backgroundColor: isDark ? '#fafafa' : '#18181b' },
                    ]}>
                    <ThemedText
                      style={styles.filterChipLabel}
                      lightColor={active ? '#ffffff' : '#52525b'}
                      darkColor={active ? '#18181b' : '#a1a1aa'}>
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {!isHydrated ? (
              <ThemedText style={styles.blockEmpty} lightColor={tone.muted} darkColor={tone.muted}>
                히스토리를 불러오는 중이에요.
              </ThemedText>
            ) : filteredHistoryRows.length === 0 ? (
              <ThemedText style={styles.blockEmpty} lightColor={tone.muted} darkColor={tone.muted}>
                조건에 맞는 기록이 없어요.
              </ThemedText>
            ) : (
              filteredHistoryRows.slice(0, 30).map((row) => (
                <View key={row.dateKey} style={[styles.feedRow, { borderTopColor: tone.border }]}>
                  <View style={styles.feedTop}>
                    <ThemedText style={styles.feedDate} lightColor={tone.muted} darkColor={tone.muted}>
                      {formatDateKeyKo(row.dateKey)}
                    </ThemedText>
                    <ThemedText style={styles.feedRate}>{row.rateLabel}</ThemedText>
                  </View>
                  <ThemedText style={styles.feedHeadline}>{row.headline}</ThemedText>
                  <ThemedText style={styles.feedSummary} lightColor={tone.muted} darkColor={tone.muted}>
                    {row.summary}
                  </ThemedText>
                  <View style={styles.feedMetaRow}>
                    <View style={[styles.feedChip, { backgroundColor: tone.level0 }]}>
                      <ThemedText style={styles.feedChipText}>{row.categoryLabel}</ThemedText>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <ThemedText style={styles.blockEmpty} lightColor={tone.muted} darkColor={tone.muted}>
            펼치면 날짜별 기록을 검색할 수 있어요.
          </ThemedText>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  headerDesc: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 6,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroScore: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1.5,
    lineHeight: 52,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    marginTop: 4,
  },
  heroCaption: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
  dimensionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dimensionCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
    minHeight: 88,
  },
  dimensionScope: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dimensionScore: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  dimensionCaption: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '600',
  },
  blockCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  blockEmpty: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  bulletRow: {
    gap: 4,
  },
  bulletTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  bulletDetail: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  nextCard: {
    borderRadius: 14,
    padding: 18,
    gap: 8,
  },
  nextKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  dayLogHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayLogCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 6,
  },
  feedTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedRate: {
    fontSize: 16,
    fontWeight: '900',
  },
  feedHeadline: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  feedSummary: {
    fontSize: 13,
    lineHeight: 19,
  },
  feedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  feedChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  feedChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
