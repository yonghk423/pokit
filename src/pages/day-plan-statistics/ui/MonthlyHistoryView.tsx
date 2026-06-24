import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { addDaysToLocalDateKey } from '@entities/day-plan';
import type { HistoryDailyStat } from '@entities/history';
import type { HorizonCompletionEntry } from '@shared/lib/storage/horizonCompletionsStorage';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import {
  buildGrowthTrendPath,
  buildMonthlyClosingNote,
  buildMonthlyCompletionRate,
  buildMonthlyHeatCells,
  buildMonthlyRateDeltaLabel,
  buildMonthlySuccessSummary,
  buildMonthlyTopFlow,
  buildMonthlyVisualSnapshots,
  chunkHeatRows,
} from '../lib/monthlyMilestone';

type Tone = {
  card: string;
  border: string;
  muted: string;
  ink: string;
  level0: string;
  barTrack: string;
  barFill: string;
  heat: string[];
  highlightCard: string;
  highlightCardBorder: string;
  highlightFg: string;
  highlightMuted: string;
};

type Props = {
  tone: Tone;
  todayDateKey: string;
  monthRange: { startDateKey: string; endDateKey: string };
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  streak: number;
  monthlyCompletionEntries: HorizonCompletionEntry[];
  formatMonthLabelKo: (dateKey: string) => string;
  formatDateKeyKo: (dateKey: string) => string;
  categoryLabel: (key: string) => string;
};

function formatRatePercent(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(1, rate)) * 100)}%`;
}

export function MonthlyHistoryView({
  tone,
  todayDateKey,
  monthRange,
  dailyStatsByDate,
  streak,
  monthlyCompletionEntries,
  formatMonthLabelKo,
  formatDateKeyKo,
  categoryLabel,
}: Props) {
  const monthRate = useMemo(
    () => buildMonthlyCompletionRate(dailyStatsByDate, monthRange.startDateKey, monthRange.endDateKey),
    [dailyStatsByDate, monthRange],
  );
  const previousMonthRate = useMemo(() => {
    const start = addDaysToLocalDateKey(monthRange.startDateKey, -30);
    const end = addDaysToLocalDateKey(monthRange.endDateKey, -30);
    return buildMonthlyCompletionRate(dailyStatsByDate, start, end);
  }, [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey]);

  const heatCells = useMemo(() => buildMonthlyHeatCells(todayDateKey, dailyStatsByDate), [dailyStatsByDate, todayDateKey]);
  const heatRows = useMemo(() => chunkHeatRows(heatCells, 7), [heatCells]);
  const growthTrend = useMemo(() => buildGrowthTrendPath(dailyStatsByDate, todayDateKey), [dailyStatsByDate, todayDateKey]);
  const rateDeltaLabel = useMemo(
    () => buildMonthlyRateDeltaLabel(monthRate, previousMonthRate),
    [monthRate, previousMonthRate],
  );
  const successSummary = useMemo(() => {
    const delta = Number.parseInt(rateDeltaLabel.replace(/[+%]/g, ''), 10) || 0;
    return buildMonthlySuccessSummary(monthRate, delta, streak);
  }, [monthRate, rateDeltaLabel, streak]);
  const topFlow = useMemo(
    () => buildMonthlyTopFlow(dailyStatsByDate, todayDateKey, categoryLabel),
    [categoryLabel, dailyStatsByDate, todayDateKey],
  );
  const visualSnapshots = useMemo(
    () => buildMonthlyVisualSnapshots(dailyStatsByDate, todayDateKey),
    [dailyStatsByDate, todayDateKey],
  );
  const closingNote = useMemo(
    () => buildMonthlyClosingNote(monthRate, streak, topFlow?.title ?? null),
    [monthRate, streak, topFlow?.title],
  );

  const showZenBadge = monthRate >= 0.65;
  const showPowerBadge = streak >= 7;
  const rateDeltaPositive = !rateDeltaLabel.startsWith('-');

  return (
    <>
      <View style={styles.headerSection}>
        <ThemedText style={styles.monthKicker} lightColor={tone.muted} darkColor={tone.muted}>
          {formatMonthLabelKo(monthRange.endDateKey)}
        </ThemedText>
        <ThemedText style={styles.monthTitle}>월간 마일스톤</ThemedText>
      </View>

      <View style={[styles.successCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <View style={styles.successTop}>
          <View style={styles.successLeft}>
            <ThemedText style={styles.successKicker} lightColor={tone.muted} darkColor={tone.muted}>
              목표 달성률
            </ThemedText>
            <View style={styles.successRateRow}>
              <ThemedText style={styles.successRate}>{formatRatePercent(monthRate)}</ThemedText>
              <View style={styles.deltaRow}>
                <IconSymbol
                  name={rateDeltaPositive ? 'arrow.up.right' : 'arrow.down.right'}
                  size={14}
                  color={tone.barFill}
                />
                <ThemedText style={[styles.deltaText, { color: tone.barFill }]}>{rateDeltaLabel}</ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.trendWrap}>
            <Svg width={120} height={48} viewBox="0 0 100 40">
              <Path d={growthTrend.d} fill="none" stroke={tone.barFill} strokeWidth={2.5} opacity={0.35} />
              <Path d={growthTrend.d} fill="none" stroke={tone.barFill} strokeWidth={2.5} strokeLinecap="round" />
              <Circle cx={growthTrend.endX} cy={growthTrend.endY} r={3} fill={tone.barFill} />
            </Svg>
            <ThemedText style={styles.trendCaption} lightColor={tone.muted} darkColor={tone.muted}>
              성장 트렌드
            </ThemedText>
          </View>
        </View>
        <ThemedText style={styles.successBody} lightColor={tone.muted} darkColor={tone.muted}>
          {successSummary}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>활동 밀도</ThemedText>
        <View style={styles.heatGrid}>
          {heatRows.map((row, rowIdx) => (
            <View key={`heat-row-${rowIdx}`} style={styles.heatRow}>
              {row.map((cell) => (
                <View
                  key={cell.dateKey}
                  style={[styles.heatCell, { backgroundColor: tone.heat[cell.level] ?? tone.heat[0] }]}
                />
              ))}
              {row.length < 7
                ? Array.from({ length: 7 - row.length }).map((_, padIdx) => (
                  <View key={`pad-${rowIdx}-${padIdx}`} style={styles.heatCellPad} />
                ))
                : null}
            </View>
          ))}
        </View>
        <View style={styles.heatRangeRow}>
          <ThemedText style={styles.heatRangeLabel} lightColor={tone.muted} darkColor={tone.muted}>
            {formatDateKeyKo(monthRange.startDateKey)}
          </ThemedText>
          <ThemedText style={styles.heatRangeLabel} lightColor={tone.muted} darkColor={tone.muted}>
            {formatDateKeyKo(monthRange.endDateKey)}
          </ThemedText>
        </View>
        <View style={[styles.legendRow, { borderTopColor: tone.border }]}>
          <ThemedText style={styles.legendEdge} lightColor={tone.muted} darkColor={tone.muted}>
            낮음
          </ThemedText>
          <View style={styles.legendSwatches}>
            {tone.heat.map((color, idx) => (
              <View key={`legend-${idx}`} style={[styles.legendCell, { backgroundColor: color }]} />
            ))}
          </View>
          <ThemedText style={styles.legendEdge} lightColor={tone.muted} darkColor={tone.muted}>
            높음
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>주요 플로우</ThemedText>
        {topFlow ? (
          <View style={styles.flowGrid}>
            <View style={[styles.flowHero, { backgroundColor: tone.card, borderColor: tone.border }]}>
              <View style={styles.flowBadge}>
                <IconSymbol name="rosette" size={12} color="#FAFAFA" />
                <ThemedText style={styles.flowBadgeText}>최장 연속 달성</ThemedText>
              </View>
              <IconSymbol
                name={topFlow.icon}
                size={30}
                color={activeIconColorByCategory(topFlow.categoryKey)}
              />
              <View style={styles.flowHeroCopy}>
                <ThemedText style={styles.flowHeroTitle}>{topFlow.title}</ThemedText>
                <ThemedText style={styles.flowHeroSub} lightColor={tone.muted} darkColor={tone.muted}>
                  {topFlow.totalDays}일 중 {topFlow.hitDays}일 달성
                </ThemedText>
              </View>
            </View>
            <View style={styles.flowSideCol}>
              <View style={[styles.flowSideCard, { backgroundColor: tone.level0 }]}>
                <IconSymbol name="sparkles" size={22} color={tone.muted} />
                <ThemedText style={styles.flowSideLabel} lightColor={tone.muted} darkColor={tone.muted}>
                  {showZenBadge ? '집중 마스터' : '다음 목표'}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.flowSideCard,
                  styles.flowSidePrimary,
                  {
                    backgroundColor: tone.highlightCard,
                    borderColor: tone.highlightCardBorder,
                    borderWidth: tone.highlightCardBorder === 'transparent' ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}>
                <IconSymbol name="bolt.fill" size={22} color={tone.highlightFg} />
                <ThemedText style={[styles.flowSideLabelPrimary, { color: tone.highlightFg }]}>
                  {showPowerBadge ? '파워 스트릭' : '스트릭 쌓기'}
                </ThemedText>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              이번 달 완료 기록이 쌓이면 주요 플로우가 표시돼요.
            </ThemedText>
          </View>
        )}
      </View>

      {visualSnapshots.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>시각적 기록</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.visualScroll}
            snapToInterval={208}
            decelerationRate="fast">
            {visualSnapshots.map((snap) => {
              const onDark = snap.level >= 3;
              return (
                <View
                  key={snap.dateKey}
                  style={[styles.visualCard, { backgroundColor: tone.heat[snap.level] ?? tone.level0 }]}>
                  <ThemedText style={[styles.visualTitle, { color: onDark ? '#FAFAFA' : tone.ink }]}>
                    {snap.title}
                  </ThemedText>
                  <ThemedText
                    style={[styles.visualSub, { color: onDark ? 'rgba(250,250,250,0.85)' : tone.muted }]}>
                    {snap.subtitle}
                  </ThemedText>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={[styles.closingCard, { backgroundColor: tone.level0 }]}>
        <ThemedText style={styles.closingText} lightColor={tone.muted} darkColor={tone.muted}>
          {closingNote}
        </ThemedText>
      </View>

      {monthlyCompletionEntries.length > 0 ? (
        <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>월간 완료 기록</ThemedText>
          {monthlyCompletionEntries.map((row) => (
            <View key={row.periodKey} style={[styles.entryRow, { borderTopColor: tone.border }]}>
              <View style={styles.entryTop}>
                <ThemedText style={styles.entryTitle}>{row.label}</ThemedText>
                <ThemedText style={styles.entryDate} lightColor={tone.muted} darkColor={tone.muted}>
                  {formatDateKeyKo(row.completedAt.slice(0, 10))}
                </ThemedText>
              </View>
              {row.summaryText ? (
                <ThemedText style={styles.entrySummary} lightColor={tone.muted} darkColor={tone.muted}>
                  {row.summaryText}
                </ThemedText>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerSection: {
    width: '100%',
    gap: 4,
    marginBottom: 4,
  },
  monthKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  monthTitle: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  successCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    gap: 16,
  },
  successTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  successLeft: {
    flex: 1,
    gap: 6,
  },
  successKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  successRateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
  },
  successRate: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 56,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  trendWrap: {
    alignItems: 'flex-end',
    gap: 2,
    marginBottom: 4,
  },
  trendCaption: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
  successBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  section: {
    width: '100%',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  heatGrid: {
    gap: 8,
  },
  heatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heatCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 4,
    maxHeight: 28,
  },
  heatCellPad: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 28,
    opacity: 0,
  },
  heatRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  heatRangeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  legendEdge: {
    fontSize: 10,
    fontWeight: '600',
  },
  legendSwatches: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  flowGrid: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 180,
  },
  flowHero: {
    flex: 1.35,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  flowBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
  },
  flowBadgeText: {
    color: '#FAFAFA',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  flowHeroCopy: {
    gap: 4,
    marginTop: 12,
  },
  flowHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  flowHeroSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  flowSideCol: {
    flex: 0.85,
    gap: 12,
  },
  flowSideCard: {
    flex: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  flowSidePrimary: {},
  flowSideLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  flowSideLabelPrimary: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  emptyNote: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  visualScroll: {
    gap: 12,
    paddingRight: 4,
  },
  visualCard: {
    width: 196,
    height: 260,
    borderRadius: 16,
    padding: 20,
    justifyContent: 'flex-end',
    gap: 8,
  },
  visualTitle: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  visualSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  closingCard: {
    width: '100%',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  closingText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '300',
    textAlign: 'center',
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
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
    gap: 8,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  entryDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  entrySummary: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
