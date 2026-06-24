import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { categoryReminderLabelKo } from '@entities/day-plan';
import type { HistoryDailyStat } from '@entities/history';
import type { HorizonCompletionEntry } from '@shared/lib/storage/horizonCompletionsStorage';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { buildWeeklyCoreGoals } from '../lib/weeklyCoreGoals';
import {
  buildWeeklyAxisScores,
  buildWeeklyEditorialInsight,
  getIsoWeekLabel,
  type WeeklyAxisRow,
} from '../lib/weeklyBalanceRadar';
import { WeeklyBalanceDonut } from './WeeklyBalanceDonut';

type Tone = {
  card: string;
  border: string;
  muted: string;
  ink: string;
  level0: string;
  barTrack: string;
  barFill: string;
};

type Props = {
  tone: Tone;
  todayDateKey: string;
  weekRange: { startDateKey: string; endDateKey: string };
  prevWeekRange: { startDateKey: string; endDateKey: string };
  weeklyBalanceRows: WeeklyAxisRow[];
  weeklyBalanceScore: number;
  streak: number;
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  weeklyCompletionEntries: HorizonCompletionEntry[];
  formatDateKeyKo: (dateKey: string) => string;
};

function streakSubtitle(streak: number): string {
  if (streak >= 14) return '추진력을 얻는 중';
  if (streak >= 7) return '꾸준히 이어가는 중';
  if (streak > 0) return '기록을 쌓는 중';
  return '오늘부터 시작해 보세요';
}

export function WeeklyHistoryView({
  tone,
  todayDateKey,
  weekRange,
  prevWeekRange,
  weeklyBalanceRows,
  weeklyBalanceScore,
  streak,
  dailyStatsByDate,
  weeklyCompletionEntries,
  formatDateKeyKo,
}: Props) {
  const axisScores = useMemo(() => buildWeeklyAxisScores(weeklyBalanceRows), [weeklyBalanceRows]);
  const editorial = useMemo(() => buildWeeklyEditorialInsight(axisScores, streak), [axisScores, streak]);
  const weekLabel = useMemo(() => getIsoWeekLabel(todayDateKey), [todayDateKey]);
  const coreGoals = useMemo(
    () =>
      buildWeeklyCoreGoals({
        dailyStatsByDate,
        weekStartKey: weekRange.startDateKey,
        weekEndKey: weekRange.endDateKey,
        prevWeekStartKey: prevWeekRange.startDateKey,
        prevWeekEndKey: prevWeekRange.endDateKey,
        categoryLabel: categoryReminderLabelKo,
      }),
    [dailyStatsByDate, prevWeekRange, weekRange],
  );

  const onPrimary = '#FAFAFA';

  return (
    <>
      <View style={styles.balanceSection}>
        <View style={styles.balanceHeader}>
          <View>
            <ThemedText style={styles.kicker} lightColor={tone.muted} darkColor={tone.muted}>
              인사이트
            </ThemedText>
            <ThemedText style={styles.balanceTitle}>주간 밸런스</ThemedText>
          </View>
          <View style={styles.alignBadge}>
            <ThemedText style={styles.alignValue}>{weeklyBalanceScore}%</ThemedText>
            <ThemedText style={styles.alignLabel} lightColor={tone.muted} darkColor={tone.muted}>
              정렬도
            </ThemedText>
          </View>
        </View>
        <WeeklyBalanceDonut
          rows={weeklyBalanceRows}
          balanceScore={weeklyBalanceScore}
          ink={tone.ink}
          muted={tone.muted}
        />
      </View>

      <View style={[styles.streakCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <View style={styles.streakCopy}>
          <ThemedText style={styles.streakTitle}>연속 달성</ThemedText>
          <ThemedText style={styles.streakHint} lightColor={tone.muted} darkColor={tone.muted}>
            {streakSubtitle(streak)}
          </ThemedText>
        </View>
        <View style={styles.streakMetric}>
          <IconSymbol name="flame.fill" size={28} color={tone.barFill} />
          <ThemedText style={styles.streakValue}>{streak}</ThemedText>
          <ThemedText style={styles.streakUnit} lightColor={tone.muted} darkColor={tone.muted}>
            일
          </ThemedText>
        </View>
      </View>

      <View style={styles.goalsSection}>
        <View style={styles.goalsHead}>
          <ThemedText style={styles.goalsTitle}>핵심 목표</ThemedText>
          <ThemedText style={styles.weekChip} lightColor={tone.muted} darkColor={tone.muted}>
            {weekLabel}
          </ThemedText>
        </View>
        {coreGoals.length === 0 ? (
          <View style={[styles.goalCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
            <ThemedText style={styles.emptyNote} lightColor={tone.muted} darkColor={tone.muted}>
              이번 주 완료 기록이 쌓이면 핵심 목표가 표시돼요.
            </ThemedText>
          </View>
        ) : (
          coreGoals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.completed / Math.max(1, goal.target)) * 100));
            const categoryColor = activeIconColorByCategory(goal.categoryKey);
            return (
              <View
                key={goal.categoryKey}
                style={[styles.goalCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
                <View style={styles.goalTop}>
                  <View style={styles.goalLeft}>
                    <View style={[styles.goalIconWrap, { backgroundColor: tone.level0 }]}>
                      <IconSymbol name={goal.icon} size={20} color={categoryColor} />
                    </View>
                    <View style={styles.goalMeta}>
                      <ThemedText style={styles.goalName}>{goal.title}</ThemedText>
                      <View style={styles.sparkRow}>
                        <Svg width={48} height={14} viewBox="0 0 40 10">
                          <Path
                            d={goal.sparklinePath}
                            fill="none"
                            stroke={categoryColor}
                            strokeWidth={1.5}
                            strokeLinecap="round"
                          />
                        </Svg>
                        <ThemedText style={[styles.sparkDelta, { color: categoryColor }]}>{goal.deltaLabel}</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.goalRight}>
                    <ThemedText style={styles.goalFraction}>{goal.completed}회</ThemedText>
                    <ThemedText style={styles.goalFractionLabel} lightColor={tone.muted} darkColor={tone.muted}>
                      {goal.deltaLabel}
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.goalTrack, { backgroundColor: tone.barTrack }]}>
                  <View style={[styles.goalFill, { width: `${progress}%`, backgroundColor: categoryColor }]} />
                </View>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.editorialCard}>
        <ThemedText style={[styles.editorialKicker, { color: onPrimary }]}>에디토리얼 인사이트</ThemedText>
        <ThemedText style={[styles.editorialTitle, { color: onPrimary }]}>{editorial.title}</ThemedText>
        <ThemedText style={[styles.editorialBody, { color: 'rgba(250,250,250,0.82)' }]}>{editorial.body}</ThemedText>
        {editorial.recommendPriority ? (
          <View style={styles.editorialFooter}>
            <View style={styles.editorialIconWrap}>
              <IconSymbol name="lightbulb.fill" size={16} color={onPrimary} />
            </View>
            <ThemedText style={[styles.editorialFooterLabel, { color: onPrimary }]}>우선순위 변경 권장</ThemedText>
          </View>
        ) : null}
      </View>

      {weeklyCompletionEntries.length > 0 ? (
        <View style={[styles.card, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <ThemedText style={styles.sectionTitle}>주간 완료 기록</ThemedText>
          {weeklyCompletionEntries.map((row) => (
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
  balanceSection: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  balanceTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
    marginTop: 2,
  },
  alignBadge: {
    alignItems: 'flex-end',
    gap: 2,
  },
  alignValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  alignLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  streakCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  streakCopy: {
    flex: 1,
    gap: 4,
  },
  streakTitle: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  streakHint: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '500',
  },
  streakMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 40,
  },
  streakUnit: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  goalsSection: {
    width: '100%',
    gap: 12,
  },
  goalsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalsTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  weekChip: {
    fontSize: 11,
    fontWeight: '700',
  },
  goalCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 14,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  goalLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMeta: {
    flex: 1,
    gap: 4,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkDelta: {
    fontSize: 10,
    fontWeight: '800',
  },
  goalRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  goalFraction: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  goalFractionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  goalTrack: {
    width: '100%',
    height: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  editorialCard: {
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#000000',
    padding: 24,
    gap: 10,
  },
  editorialKicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.65,
  },
  editorialTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 30,
    marginTop: 4,
  },
  editorialBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  editorialFooter: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(250,250,250,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editorialIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(250,250,250,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialFooterLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  emptyNote: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
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
