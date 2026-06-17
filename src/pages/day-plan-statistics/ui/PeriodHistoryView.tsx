import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { addDaysToLocalDateKey, categoryReminderLabelKo, useDayPlanDraftStore } from '@entities/day-plan';
import { getCategoryCompletions, type HistoryDailyStat } from '@entities/history';
import type { HorizonCompletionEntry } from '@shared/lib/storage/horizonCompletionsStorage';
import { useShallow } from 'zustand/react/shallow';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { HorizonDocumentReadView } from '@shared/ui/horizon-document-read-view/HorizonDocumentReadView';

import {
  buildTrendDeltaContextLabel,
  buildTrendGraphCaption,
  buildTrendRateSubtitle,
  countDaysInCompletionRateAverage,
} from '../lib/historyTrendCardCopy';
import {
  buildDailyRoutineHistory,
  resolveDailyRoutinePlannedKeys,
} from '../lib/dailyRoutineHistory';
import { formatHistoryFrequencyKo } from '../lib/historyDisplayFormat';
import {
  buildHistoryCalendarDensityLegend,
  calendarDensityCellBackground,
  calendarDensityDayTextColor,
  completionDensityLevel,
  getHistoryCalendarDensityColors,
} from '../lib/historyCalendarDensity';
import { buildMonthlyRateDeltaLabel } from '../lib/monthlyMilestone';
import { HistoryMetricsInfoSheet } from './HistoryMetricsInfoSheet';
import {
  buildWeeklyAxisScores,
  buildWeeklyEditorialInsight,
  type WeeklyAxisRow,
} from '../lib/weeklyBalanceRadar';

type Tone = {
  card: string;
  border: string;
  muted: string;
  ink: string;
  level0: string;
  barTrack: string;
  barFill: string;
  highlightCard: string;
  highlightCardBorder: string;
  highlightFg: string;
  highlightMuted: string;
  highlightBadge: string;
};

type Props = {
  tone: Tone;
  isDark: boolean;
  anchorDateKey: string;
  flowMonthPrefix: string;
  monthRange: { startDateKey: string; endDateKey: string };
  weeklyBalanceRows: WeeklyAxisRow[];
  weeklyBalanceScore: number;
  monthlyRate: number;
  previousMonthlyRate: number;
  dailyStatsByDate: Record<string, HistoryDailyStat>;
  weeklyCompletionEntries: HorizonCompletionEntry[];
  monthlyCompletionEntries: HorizonCompletionEntry[];
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthPicker: () => void;
  onSelectDateKey: (dateKey: string) => void;
  todayDateKey: string;
  formatDateKeyKo: (dateKey: string) => string;
  formatMonthLabelKo: (dateKey: string) => string;
};

type MonthDay = {
  dateKey: string;
  day: number;
  inMonth: boolean;
  completionRate: number;
  completedFlowCount: number;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const RING_SIZE = 44;
const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function parseDateKey(dateKey: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, dayDelta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + dayDelta);
  return next;
}

function formatRatePercent(rate: number): string {
  return `${Math.round(Math.max(0, Math.min(1, rate)) * 100)}%`;
}

function buildMonthCalendarDays(
  monthStartDateKey: string,
  dailyStatsByDate: Record<string, HistoryDailyStat>,
): MonthDay[] {
  const monthStart = parseDateKey(monthStartDateKey);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  return Array.from({ length: 42 }, (_, idx) => {
    const date = addDays(gridStart, idx);
    const dateKey = toDateKey(date);
    const row = dailyStatsByDate[dateKey];
    const count = row?.completedFlowCount ?? 0;
    return {
      dateKey,
      day: date.getDate(),
      inMonth: date.getMonth() === monthStart.getMonth(),
      completionRate: row?.completionRate ?? 0,
      completedFlowCount: count,
    };
  });
}

function buildTrendPath(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
  width = 100,
  height = 40,
  padX = 5,
): { d: string; endX: number; endY: number } {
  const keys: string[] = [];
  let cursor = startDateKey;
  while (cursor <= endDateKey) {
    keys.push(cursor);
    if (cursor === endDateKey) break;
    cursor = addDaysToLocalDateKey(cursor, 1);
  }
  const pointCount = Math.min(keys.length, 14);
  const step = Math.max(1, Math.floor(Math.max(1, keys.length - 1) / Math.max(1, pointCount - 1)));
  const values = Array.from({ length: pointCount }, (_, idx) => {
    const key = keys[Math.min(keys.length - 1, idx * step)];
    const row = key ? dailyStatsByDate[key] : null;
    return row ? Math.max(0, Math.min(1, Number(row.completionRate) || 0)) : 0;
  });
  const innerWidth = width - padX * 2;
  if (values.every((v) => v === 0)) {
    const y = height - 4;
    return { d: `M${padX} ${y} L${width - padX} ${y}`, endX: width - padX, endY: y };
  }
  const max = Math.max(0.01, ...values);
  const xStep = values.length <= 1 ? 0 : innerWidth / (values.length - 1);
  const coords = values.map((v, idx) => ({
    x: padX + idx * xStep,
    y: height - 4 - (v / max) * (height - 10),
  }));
  let d = `M${coords[0].x} ${coords[0].y}`;
  for (let idx = 1; idx < coords.length; idx += 1) {
    const prev = coords[idx - 1];
    const curr = coords[idx];
    const cx = (prev.x + curr.x) / 2;
    d += ` Q${cx} ${prev.y}, ${curr.x} ${curr.y}`;
  }
  const last = coords[coords.length - 1];
  return { d, endX: last.x, endY: last.y };
}

function buildTopCategories(
  dailyStatsByDate: Record<string, HistoryDailyStat>,
  startDateKey: string,
  endDateKey: string,
) {
  const totals = new Map<string, number>();
  for (const row of Object.values(dailyStatsByDate)) {
    if (row.dateKey < startDateKey || row.dateKey > endDateKey) continue;
    for (const [key, count] of Object.entries(getCategoryCompletions(row))) {
      if (count <= 0) continue;
      totals.set(key, (totals.get(key) ?? 0) + count);
    }
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = Math.max(1, ranked[0]?.[1] ?? 0);
  return ranked.map(([categoryKey, count]) => ({
    categoryKey,
    label: categoryReminderLabelKo(categoryKey),
    count,
    percent: Math.max(8, Math.round((count / max) * 100)),
  }));
}

export function PeriodHistoryView({
  tone,
  isDark,
  anchorDateKey,
  flowMonthPrefix,
  monthRange,
  weeklyBalanceRows,
  weeklyBalanceScore,
  monthlyRate,
  previousMonthlyRate,
  dailyStatsByDate,
  weeklyCompletionEntries,
  monthlyCompletionEntries,
  canGoPrevMonth,
  canGoNextMonth,
  onPrevMonth,
  onNextMonth,
  onOpenMonthPicker,
  onSelectDateKey,
  todayDateKey,
  formatDateKeyKo,
  formatMonthLabelKo,
}: Props) {
  const [expandedWeeklyKey, setExpandedWeeklyKey] = useState<string | null>(null);
  const [expandedMonthlyKey, setExpandedMonthlyKey] = useState<string | null>(null);
  const [activeHorizonTab, setActiveHorizonTab] = useState<'weekly' | 'monthly' | null>(null);
  const [metricsInfoOpen, setMetricsInfoOpen] = useState(false);

  const { routineHistoryPlannedKeysByDate, priorityCategoryOrder } = useDayPlanDraftStore(
    useShallow((s) => ({
      routineHistoryPlannedKeysByDate: s.routineHistoryPlannedKeysByDate,
      priorityCategoryOrder: s.priorityCategoryOrder,
    })),
  );

  // 달력 flowMonthPrefix와 직접 연동 — 별도 탭 상태 없음
  const filteredWeeklyEntries = useMemo(
    () => weeklyCompletionEntries.filter((e) => e.periodKey.slice(0, 7) === flowMonthPrefix),
    [weeklyCompletionEntries, flowMonthPrefix],
  );
  const filteredMonthlyEntries = useMemo(
    () => monthlyCompletionEntries.filter((e) => e.periodKey.slice(0, 7) === flowMonthPrefix),
    [monthlyCompletionEntries, flowMonthPrefix],
  );

  useEffect(() => {
    setActiveHorizonTab(null);
    setExpandedWeeklyKey(null);
    setExpandedMonthlyKey(null);
  }, [flowMonthPrefix]);

  const monthCalendarDays = useMemo(
    () => buildMonthCalendarDays(monthRange.startDateKey, dailyStatsByDate),
    [dailyStatsByDate, monthRange.startDateKey],
  );
  const topCategories = useMemo(
    () => buildTopCategories(dailyStatsByDate, monthRange.startDateKey, monthRange.endDateKey),
    [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey],
  );
  const monthDeltaLabel = useMemo(
    () => buildMonthlyRateDeltaLabel(monthlyRate, previousMonthlyRate),
    [monthlyRate, previousMonthlyRate],
  );
  const trendPath = useMemo(
    () => buildTrendPath(dailyStatsByDate, monthRange.startDateKey, monthRange.endDateKey),
    [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey],
  );
  const dailyRoutineHistory = useMemo(() => {
    const row = dailyStatsByDate[anchorDateKey];
    const completedCategoryKeys = row
      ? Object.entries(getCategoryCompletions(row))
          .filter(([, count]) => (count ?? 0) > 0)
          .map(([key]) => key)
      : [];
    const plannedCategoryKeys = resolveDailyRoutinePlannedKeys({
      dateKey: anchorDateKey,
      todayDateKey,
      plannedKeysByDate: routineHistoryPlannedKeysByDate,
      priorityCategoryOrder,
      completedCategoryKeys,
    });
    return buildDailyRoutineHistory({
      dailyStatsByDate,
      dateKey: anchorDateKey,
      categoryLabel: categoryReminderLabelKo,
      plannedCategoryKeys,
    });
  }, [
    anchorDateKey,
    dailyStatsByDate,
    priorityCategoryOrder,
    routineHistoryPlannedKeysByDate,
    todayDateKey,
  ]);
  const axisScores = useMemo(() => buildWeeklyAxisScores(weeklyBalanceRows), [weeklyBalanceRows]);
  const maxCategoryStreak = useMemo(
    () => dailyRoutineHistory.reduce((max, row) => Math.max(max, row.consecutiveDays), 0),
    [dailyRoutineHistory],
  );
  const editorial = useMemo(
    () => buildWeeklyEditorialInsight(axisScores, maxCategoryStreak),
    [axisScores, maxCategoryStreak],
  );
  const rateDeltaPositive = !monthDeltaLabel.startsWith('-');
  const recordedDayCount = useMemo(
    () =>
      countDaysInCompletionRateAverage(
        dailyStatsByDate,
        monthRange.startDateKey,
        monthRange.endDateKey,
      ),
    [dailyStatsByDate, monthRange.endDateKey, monthRange.startDateKey],
  );
  const trendRateSubtitle = useMemo(
    () =>
      buildTrendRateSubtitle({
        recordedDayCount,
        startDateKey: monthRange.startDateKey,
        endDateKey: monthRange.endDateKey,
        formatDateKeyKo,
      }),
    [formatDateKeyKo, monthRange.endDateKey, monthRange.startDateKey, recordedDayCount],
  );
  const trendDeltaContextLabel = useMemo(
    () => buildTrendDeltaContextLabel(monthlyRate, previousMonthlyRate),
    [monthlyRate, previousMonthlyRate],
  );
  const trendGraphCaption = useMemo(
    () => buildTrendGraphCaption(recordedDayCount),
    [recordedDayCount],
  );
  const showTrendDeltaValue =
    trendDeltaContextLabel === '지난달 대비' || monthlyRate > 0 || previousMonthlyRate > 0;
  const calendarDensityColors = useMemo(() => getHistoryCalendarDensityColors(isDark), [isDark]);
  const calendarDensityLegend = useMemo(() => buildHistoryCalendarDensityLegend(isDark), [isDark]);

  // 공통 기록 카드 렌더러
  const renderEntryCard = (
    entry: (typeof filteredWeeklyEntries)[number],
    expanded: boolean,
    onToggle: () => void,
  ) => (
    <Pressable
      key={entry.periodKey}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.horizonEntryCard,
        { backgroundColor: tone.card, borderColor: tone.border },
        pressed && { opacity: 0.8 },
      ]}>
      <View style={styles.horizonEntryHead}>
        <View style={styles.horizonEntryLeft}>
          <ThemedText style={styles.horizonEntryPeriod}>{entry.label}</ThemedText>
          <ThemedText style={styles.horizonEntryDate} lightColor={tone.muted} darkColor={tone.muted}>
            {new Date(entry.completedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 완료
          </ThemedText>
        </View>
        <View style={[styles.horizonCompleteBadge, { backgroundColor: tone.level0 }]}>
          <IconSymbol name="checkmark.circle.fill" size={14} color={tone.barFill} />
          <ThemedText style={styles.horizonCompleteText} lightColor={tone.barFill} darkColor={tone.barFill}>
            완료
          </ThemedText>
        </View>
        <IconSymbol name={expanded ? 'chevron.up' : 'chevron.down'} size={14} color={tone.muted} />
      </View>
      {expanded && entry.document && (
        <View style={styles.horizonEntryDoc}>
          <HorizonDocumentReadView
            document={entry.document}
            ink={tone.ink}
            muted={tone.muted}
            isDark={false}
          />
        </View>
      )}
      {expanded && !entry.document && entry.summaryText ? (
        <ThemedText style={styles.horizonEntrySummary} lightColor={tone.muted} darkColor={tone.muted}>
          {entry.summaryText}
        </ThemedText>
      ) : null}
    </Pressable>
  );

  return (
    <>
      {/* Month Nav — < 2026년 6월 > */}
      <View style={styles.monthNavRow}>
        <Pressable
          disabled={!canGoPrevMonth}
          onPress={onPrevMonth}
          hitSlop={8}
          style={({ pressed }) => [styles.monthNavBtn, pressed && canGoPrevMonth && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="이전 달">
          <IconSymbol name="chevron.left" size={16} color={canGoPrevMonth ? tone.ink : tone.muted} />
        </Pressable>
        <Pressable
          onPress={onOpenMonthPicker}
          style={({ pressed }) => [styles.monthNavLabelBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="월 선택">
          <ThemedText style={styles.monthNavLabel}>
            {formatMonthLabelKo(`${flowMonthPrefix}-01`)}
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={!canGoNextMonth}
          onPress={onNextMonth}
          hitSlop={8}
          style={({ pressed }) => [styles.monthNavBtn, pressed && canGoNextMonth && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="다음 달">
          <IconSymbol name="chevron.right" size={16} color={canGoNextMonth ? tone.ink : tone.muted} />
        </Pressable>
      </View>

      {/* 위클리 / 먼슬리 기록 — 가로 탭, 기본 접힘 */}
      <View style={styles.historyTabSection}>
        <View style={styles.historyTabRow}>
          {(['weekly', 'monthly'] as const).map((tab) => {
            const isWeekly = tab === 'weekly';
            const active = activeHorizonTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  setActiveHorizonTab(active ? null : tab);
                  setExpandedWeeklyKey(null);
                  setExpandedMonthlyKey(null);
                }}
                style={({ pressed }) => [
                  styles.historyTabChip,
                  {
                    backgroundColor: active ? tone.barFill : tone.level0,
                    borderColor: active ? tone.barFill : tone.border,
                  },
                  pressed && { opacity: 0.75 },
                ]}>
                <ThemedText
                  style={styles.historyTabChipText}
                  lightColor={active ? '#ffffff' : tone.ink}
                  darkColor={active ? '#18181b' : tone.ink}>
                  {isWeekly ? '위클리' : '먼슬리'}
                </ThemedText>
                {isWeekly && filteredWeeklyEntries.length > 0 && (
                  <View
                    style={[
                      styles.historyTabCount,
                      { backgroundColor: active ? 'rgba(255,255,255,0.25)' : tone.barFill },
                    ]}>
                    <ThemedText
                      style={styles.historyTabCountText}
                      lightColor={active ? '#ffffff' : '#ffffff'}
                      darkColor={active ? '#18181b' : '#ffffff'}>
                      {filteredWeeklyEntries.length}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {activeHorizonTab === 'weekly' && (
          <View style={styles.historyTabContent}>
            {filteredWeeklyEntries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: tone.level0 }]}>
                <ThemedText style={styles.emptyText} lightColor={tone.muted} darkColor={tone.muted}>
                  {weeklyCompletionEntries.length === 0
                    ? '위클리 탭에서 전략을 작성하고 완료하면 여기에 기록돼요.'
                    : '이 달에 완료된 위클리 기록이 없어요.'}
                </ThemedText>
              </View>
            ) : (
              filteredWeeklyEntries.map((entry) =>
                renderEntryCard(
                  entry,
                  expandedWeeklyKey === entry.periodKey,
                  () => setExpandedWeeklyKey(expandedWeeklyKey === entry.periodKey ? null : entry.periodKey),
                ),
              )
            )}
          </View>
        )}

        {activeHorizonTab === 'monthly' && (
          <View style={styles.historyTabContent}>
            {filteredMonthlyEntries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: tone.level0 }]}>
                <ThemedText style={styles.emptyText} lightColor={tone.muted} darkColor={tone.muted}>
                  {monthlyCompletionEntries.length === 0
                    ? '먼슬리 탭에서 전략을 작성하고 완료하면 여기에 기록돼요.'
                    : '이 달에 완료된 먼슬리 기록이 없어요.'}
                </ThemedText>
              </View>
            ) : (
              filteredMonthlyEntries.map((entry) =>
                renderEntryCard(
                  entry,
                  expandedMonthlyKey === entry.periodKey,
                  () => setExpandedMonthlyKey(expandedMonthlyKey === entry.periodKey ? null : entry.periodKey),
                ),
              )
            )}
          </View>
        )}
      </View>

      {/* 달력 히트맵 */}
      <View style={styles.section}>
        <View style={[styles.calendarCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
          <View style={styles.calendarGrid}>
            {WEEKDAY_LABELS.map((label) => (
              <ThemedText key={label} style={styles.weekdayLabel} lightColor={tone.muted} darkColor={tone.muted}>
                {label}
              </ThemedText>
            ))}
            {monthCalendarDays.map((day) => {
              const selected = day.dateKey === anchorDateKey;
              const disabled = !day.inMonth || day.dateKey > todayDateKey;
              const densityLevel = day.inMonth ? completionDensityLevel(day.completedFlowCount) : 0;
              const bgColor = calendarDensityCellBackground(
                densityLevel,
                selected,
                isDark,
                calendarDensityColors,
                tone.barFill,
              );
              const dayTextColor = calendarDensityDayTextColor(densityLevel, selected, isDark, tone.ink);
              const cell = (
                <ThemedText
                  style={styles.calendarDayText}
                  lightColor={dayTextColor}
                  darkColor={dayTextColor}>
                  {day.day}
                </ThemedText>
              );
              if (disabled) {
                return (
                  <View
                    key={day.dateKey}
                    style={[styles.calendarDay, { backgroundColor: bgColor }, !day.inMonth && { opacity: 0.2 }]}>
                    {cell}
                  </View>
                );
              }
              return (
                <Pressable
                  key={day.dateKey}
                  onPress={() => onSelectDateKey(day.dateKey)}
                  style={({ pressed }) => [
                    styles.calendarDay,
                    { backgroundColor: bgColor },
                    pressed && !selected && { opacity: 0.7 },
                  ]}>
                  {cell}
                </Pressable>
              );
            })}
          </View>
          <View style={styles.densityLegendRow}>
            {calendarDensityLegend.map((item) => (
              <View key={item.level} style={styles.densityLegendItem}>
                <View style={[styles.densityLegendSwatch, { backgroundColor: item.color }]} />
                <ThemedText style={styles.densityLegendLabel} lightColor={tone.muted} darkColor={tone.muted}>
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 달성률 추세 그래프 */}
      <View style={[styles.trendCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
        <View style={styles.trendHeader}>
          <View style={styles.trendCopy}>
            <View style={styles.trendKickerRow}>
              <ThemedText style={styles.kicker} lightColor={tone.muted} darkColor={tone.muted}>
                달성률
              </ThemedText>
              <Pressable
                onPress={() => setMetricsInfoOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="달성률 안내"
                style={({ pressed }) => [styles.trendInfoBtn, pressed && { opacity: 0.65 }]}>
                <IconSymbol name="info.circle" size={15} color={tone.muted} />
              </Pressable>
            </View>
            <View style={styles.trendRateRow}>
              <ThemedText style={styles.trendRateValue}>{formatRatePercent(monthlyRate)}</ThemedText>
              <View style={styles.trendDelta}>
                <ThemedText style={styles.trendDeltaContext} lightColor={tone.muted} darkColor={tone.muted}>
                  {trendDeltaContextLabel}
                </ThemedText>
                {showTrendDeltaValue ? (
                  <>
                    <IconSymbol
                      name={rateDeltaPositive ? 'arrow.up.right' : 'arrow.down.right'}
                      size={12}
                      color={tone.barFill}
                    />
                    <ThemedText style={[styles.trendDeltaText, { color: tone.barFill }]}>
                      {monthDeltaLabel}
                    </ThemedText>
                  </>
                ) : null}
              </View>
            </View>
            <ThemedText style={styles.trendSubtitle} lightColor={tone.muted} darkColor={tone.muted}>
              {trendRateSubtitle}
            </ThemedText>
          </View>
        </View>
        <View style={styles.trendGraphWrap}>
          <Svg width="100%" height={52} viewBox="0 0 100 40" preserveAspectRatio="none">
            <Path d={trendPath.d} fill="none" stroke={tone.barFill} strokeWidth={2.5} opacity={0.25} />
            <Path d={trendPath.d} fill="none" stroke={tone.barFill} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx={trendPath.endX} cy={trendPath.endY} r={3} fill={tone.barFill} />
          </Svg>
        </View>
        <ThemedText style={styles.trendGraphCaption} lightColor={tone.muted} darkColor={tone.muted}>
          {trendGraphCaption}
        </ThemedText>
      </View>

      <HistoryMetricsInfoSheet
        visible={metricsInfoOpen}
        sheetBg={tone.card}
        ink={tone.ink}
        muted={tone.muted}
        border={tone.border}
        onClose={() => setMetricsInfoOpen(false)}
      />

      {/* 선택한 날 루틴 기록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>그날 루틴 기록</ThemedText>
          <ThemedText style={styles.sectionChip} lightColor={tone.muted} darkColor={tone.muted}>
            {formatDateKeyKo(anchorDateKey)}
          </ThemedText>
        </View>
        {dailyRoutineHistory.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tone.level0 }]}>
            <ThemedText style={styles.emptyText} lightColor={tone.muted} darkColor={tone.muted}>
              {anchorDateKey === todayDateKey
                ? '오늘 담은 루틴이 없어요.'
                : '이 날 담은 루틴 기록이 없어요.'}
            </ThemedText>
          </View>
        ) : (
          dailyRoutineHistory.map((item) => {
            const isCompleted = item.status === 'completed';
            return (
              <View
                key={item.categoryKey}
                style={[
                  styles.goalCard,
                  { backgroundColor: tone.card, borderColor: tone.border },
                  !isCompleted && { opacity: 0.88 },
                ]}>
                <View style={styles.goalTop}>
                  <View style={[styles.goalIconWrap, { backgroundColor: tone.level0 }]}>
                    <IconSymbol
                      name={item.icon}
                      size={18}
                      color={isCompleted ? tone.barFill : tone.muted}
                    />
                  </View>
                  <View style={styles.goalMeta}>
                    <ThemedText style={styles.goalTitle}>{item.title}</ThemedText>
                    <View style={styles.goalStreakRow}>
                      <IconSymbol
                        name="flame.fill"
                        size={12}
                        color={item.consecutiveDays > 0 ? tone.barFill : tone.muted}
                      />
                      <ThemedText style={styles.goalSub} lightColor={tone.muted} darkColor={tone.muted}>
                        {item.streakLabel}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    style={[
                      styles.routineStatusBadge,
                      { color: isCompleted ? tone.barFill : tone.muted },
                    ]}>
                    {item.statusLabel}
                  </ThemedText>
                </View>
                <View style={[styles.goalTrack, { backgroundColor: tone.barTrack }]}>
                  {isCompleted ? (
                    <View style={[styles.goalFill, { width: '100%', backgroundColor: tone.barFill }]} />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* 상위 카테고리 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>상위 카테고리</ThemedText>
          <ThemedText style={styles.sectionChip} lightColor={tone.muted} darkColor={tone.muted}>
            {formatMonthLabelKo(`${flowMonthPrefix}-01`)}
          </ThemedText>
        </View>
        {topCategories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: tone.level0 }]}>
            <ThemedText style={styles.emptyText} lightColor={tone.muted} darkColor={tone.muted}>
              완료 기록이 쌓이면 상위 카테고리가 표시돼요.
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.categoryCard, { backgroundColor: tone.card, borderColor: tone.border }]}>
            {topCategories.map((category, idx) => (
              <View key={category.categoryKey} style={styles.categoryRow}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: idx === 0 ? tone.barFill : idx === 1 ? tone.muted : tone.border },
                  ]}
                />
                <View style={styles.categoryMeta}>
                  <View style={styles.categoryTop}>
                    <ThemedText style={styles.categoryLabel}>{category.label}</ThemedText>
                    <ThemedText style={styles.categoryCount} lightColor={tone.muted} darkColor={tone.muted}>
                      {formatHistoryFrequencyKo(category.count)}
                    </ThemedText>
                  </View>
                  <View style={[styles.categoryTrack, { backgroundColor: tone.barTrack }]}>
                    <View
                      style={[
                        styles.categoryFill,
                        { width: `${category.percent}%`, backgroundColor: idx === 0 ? tone.barFill : tone.muted },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 에디토리얼 인사이트 */}
      <View
        style={[
          styles.editorialCard,
          {
            backgroundColor: tone.highlightCard,
            borderColor: tone.highlightCardBorder,
            borderWidth: tone.highlightCardBorder === 'transparent' ? 0 : StyleSheet.hairlineWidth,
          },
        ]}>
        <View style={styles.editorialTop}>
          <ThemedText style={[styles.editorialKicker, { color: tone.highlightMuted }]}>에디토리얼 인사이트</ThemedText>
          <View style={[styles.editorialBadge, { backgroundColor: tone.highlightBadge }]}>
            <ThemedText style={[styles.editorialBadgeText, { color: tone.highlightFg }]}>
              밸런스 {weeklyBalanceScore}%
            </ThemedText>
          </View>
        </View>
        <ThemedText style={[styles.editorialTitle, { color: tone.highlightFg }]}>{editorial.title}</ThemedText>
        <ThemedText style={[styles.editorialBody, { color: tone.highlightMuted }]}>{editorial.body}</ThemedText>
        {editorial.recommendPriority ? (
          <View style={styles.editorialFooter}>
            <IconSymbol name="lightbulb.fill" size={14} color={tone.highlightFg} />
            <ThemedText style={[styles.editorialFooterText, { color: tone.highlightFg }]}>우선순위 변경 권장</ThemedText>
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sectionChip: {
    fontSize: 10,
    fontWeight: '800',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavLabelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  monthNavLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  calendarCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 14,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 6,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    minHeight: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '800',
  },
  densityLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 10,
  },
  densityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  densityLegendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  densityLegendLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  trendCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 14,
  },
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  trendCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    paddingRight: 8,
  },
  trendKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendInfoBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendRateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: 8,
  },
  trendSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    letterSpacing: -0.15,
  },
  trendRateValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 38,
  },
  trendDelta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  trendDeltaContext: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  trendDeltaText: {
    fontSize: 12,
    fontWeight: '900',
  },
  trendGraphWrap: {
    width: '100%',
    height: 52,
  },
  trendGraphCaption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  goalCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMeta: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  goalStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routineStatusBadge: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  goalSub: {
    fontSize: 11,
    fontWeight: '700',
  },
  goalPercent: {
    fontSize: 15,
    fontWeight: '900',
  },
  goalTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 999,
  },
  categoryCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 14,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  categoryMeta: {
    flex: 1,
    gap: 6,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  categoryCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryTrack: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 999,
  },
  emptyCard: {
    borderRadius: 14,
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  editorialCard: {
    borderRadius: 18,
    padding: 22,
    gap: 12,
  },
  editorialTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorialKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  editorialBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editorialBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  editorialTitle: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  editorialBody: {
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '600',
  },
  editorialFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  editorialFooterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  horizonEntryCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  horizonEntryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  horizonEntryLeft: {
    flex: 1,
    gap: 2,
  },
  horizonEntryPeriod: {
    fontSize: 15,
    fontWeight: '700',
  },
  horizonEntryDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  horizonCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  horizonCompleteText: {
    fontSize: 11,
    fontWeight: '800',
  },
  horizonEntryDoc: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 10,
  },
  horizonEntrySummary: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 10,
  },
  historyTabSection: {
    gap: 10,
  },
  historyTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  historyTabChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyTabCount: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTabCountText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '800',
    textAlign: 'center',
    includeFontPadding: false,
  },
  historyTabContent: {
    gap: 8,
  },
});

