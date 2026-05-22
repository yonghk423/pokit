import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import type { DayPlanStatsDayRow } from '@shared/lib/storage/dayPlanStatsHistoryStorage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import {
  buildDaysInCalendarMonthSeries,
  countDaysInMonth,
} from '../lib/buildDaysInCalendarMonthSeries';
import { getChartGrassPalette } from '../lib/chartGrassColors';
import { parseDayPlanDateKey, resolveYearMonthFromDateKey } from '../lib/planDateKeyParse';

const CHART_HEIGHT = 196;
const CHART_PAD = { top: 10, right: 8, bottom: 6, left: 0 };

type Props = {
  mergedRows: DayPlanStatsDayRow[];
  todayDateKey: string;
  isDark: boolean;
  cardBorderColor: string;
  cardSurfaceColor: string;
};

function compareYearMonth(
  a: { year: number; month: number },
  b: { year: number; month: number },
): number {
  const ay = Number.isFinite(a.year) ? a.year : 0;
  const am = Number.isFinite(a.month) ? a.month : 1;
  const by = Number.isFinite(b.year) ? b.year : 0;
  const bm = Number.isFinite(b.month) ? b.month : 1;
  if (ay !== by) return ay - by;
  return am - bm;
}

function shiftMonth(year: number, month1: number, delta: -1 | 1): { year: number; month: number } {
  const y = Number.isFinite(year) ? Math.floor(year) : new Date().getFullYear();
  const m = Number.isFinite(month1) ? Math.min(12, Math.max(1, Math.floor(month1))) : 1;
  const d = new Date(y, m - 1 + delta, 1, 12, 0, 0, 0);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function buildLinePathD(xs: number[], ys: number[]): string {
  if (xs.length === 0 || xs.length !== ys.length) return '';
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    d += ` L ${xs[i]} ${ys[i]}`;
  }
  return d;
}

function buildAreaPathD(xs: number[], ys: number[], bottomY: number): string {
  if (xs.length === 0) return '';
  const line = buildLinePathD(xs, ys);
  return `${line} L ${xs[xs.length - 1]} ${bottomY} L ${xs[0]} ${bottomY} Z`;
}

export function StatisticsTrendChartCard({
  mergedRows,
  todayDateKey,
  isDark,
  cardBorderColor,
  cardSurfaceColor,
}: Props) {
  const todayYm = useMemo(() => resolveYearMonthFromDateKey(todayDateKey), [todayDateKey]);

  const [viewYm, setViewYm] = useState(() => resolveYearMonthFromDateKey(todayDateKey));

  useEffect(() => {
    setViewYm((prev) => {
      if (!Number.isFinite(prev.year) || !Number.isFinite(prev.month)) {
        return { year: todayYm.year, month: todayYm.month };
      }
      if (prev.month < 1 || prev.month > 12) {
        return { year: todayYm.year, month: todayYm.month };
      }
      return prev;
    });
  }, [todayYm.month, todayYm.year]);

  const [chartW, setChartW] = useState(0);

  const viewYear = Number.isFinite(viewYm.year) ? viewYm.year : todayYm.year;
  const viewMonth = Number.isFinite(viewYm.month) ? viewYm.month : todayYm.month;

  const series = useMemo(
    () => buildDaysInCalendarMonthSeries(mergedRows, viewYear, viewMonth),
    [mergedRows, viewMonth, viewYear],
  );

  const dim = useMemo(() => countDaysInMonth(viewYear, viewMonth), [viewMonth, viewYear]);

  const todayParsed = useMemo(() => parseDayPlanDateKey(todayDateKey), [todayDateKey]);

  const isViewingCurrentMonth =
    todayParsed != null && viewYear === todayParsed.y && viewMonth === todayParsed.m;

  const canGoNext = compareYearMonth({ year: viewYear, month: viewMonth }, todayYm) < 0;

  const highlightDayIndex = useMemo(() => {
    if (series.length === 0) return 0;
    if (todayParsed && viewYear === todayParsed.y && viewMonth === todayParsed.m) {
      return Math.max(0, Math.min(series.length - 1, todayParsed.d - 1));
    }
    return series.length - 1;
  }, [series.length, todayParsed, viewMonth, viewYear]);

  const maxY = useMemo(() => {
    const peak = series.reduce((m, p) => Math.max(m, p.total), 0);
    return Math.max(4, Math.ceil(peak * 1.12) || 1);
  }, [series]);

  const midY = Math.round(maxY / 2);

  const onLayoutChart = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setChartW((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
  }, []);

  const { linePath, areaPath, gridLines, highlightX, highlightY } = useMemo(() => {
    const innerW = Math.max(1, chartW - CHART_PAD.left - CHART_PAD.right);
    const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
    const bottomY = CHART_PAD.top + innerH;
    const n = series.length;
    const xsLocal: number[] = [];
    const ysLocal: number[] = [];
    for (let i = 0; i < n; i++) {
      const x = CHART_PAD.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
      const t = series[i]?.total ?? 0;
      const y = CHART_PAD.top + innerH - (t / maxY) * innerH;
      xsLocal.push(x);
      ysLocal.push(y);
    }
    const grids: { y: number; key: string }[] = [];
    for (let g = 0; g <= 4; g++) {
      const y = CHART_PAD.top + (innerH * g) / 4;
      grids.push({ y, key: `g-${g}` });
    }
    const hi = Math.max(0, Math.min(n - 1, highlightDayIndex));
    return {
      linePath: buildLinePathD(xsLocal, ysLocal),
      areaPath: buildAreaPathD(xsLocal, ysLocal, bottomY + 0.5),
      gridLines: grids,
      highlightX: xsLocal[hi] ?? CHART_PAD.left,
      highlightY: ysLocal[hi] ?? bottomY,
    };
  }, [chartW, highlightDayIndex, maxY, series]);

  const { lineStroke, areaTop } = getChartGrassPalette(isDark);
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const headerInk = isDark ? '#a1a1aa' : '#71717a';

  const xLabels = useMemo(() => {
    if (series.length === 0) return [];
    const first = series[0]!;
    const last = series[series.length - 1]!;
    const midIdx = Math.floor((series.length - 1) / 2);
    const mid = series[midIdx]!;
    return [
      { key: 'a', text: first.axisLabel, align: 'left' as const },
      { key: 'b', text: mid.axisLabel, align: 'center' as const },
      { key: 'c', text: last.axisLabel, align: 'right' as const },
    ];
  }, [series]);

  const summaryPoint = useMemo(() => {
    if (series.length === 0) return null;
    if (todayParsed && viewYear === todayParsed.y && viewMonth === todayParsed.m) {
      return series[Math.min(series.length - 1, Math.max(0, todayParsed.d - 1))]!;
    }
    return series[series.length - 1]!;
  }, [series, todayParsed, viewMonth, viewYear]);

  const onPrevMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewYm((v) => shiftMonth(v.year, v.month, -1));
  }, []);

  const onNextMonth = useCallback(() => {
    if (!canGoNext) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewYm((v) => shiftMonth(v.year, v.month, 1));
  }, [canGoNext]);

  const onJumpThisMonth = useCallback(() => {
    if (isViewingCurrentMonth) return;
    void Haptics.selectionAsync();
    setViewYm({ ...todayYm });
  }, [isViewingCurrentMonth, todayYm]);

  const rangeCaption = `${viewYear}년 ${viewMonth}월 · ${viewMonth}월 1일 – ${viewMonth}월 ${dim}일`;

  return (
    <View style={[styles.card, { backgroundColor: cardSurfaceColor, borderColor: cardBorderColor }]}>
      <ThemedText style={styles.sectionTitle}>추이</ThemedText>
      <ThemedText style={styles.sectionDesc} lightColor="#52525b" darkColor="#a1a1aa">
        선택한 달의 1일부터 말일까지, 날마다 완료한 플로우 개수를 이어 보여줘요.
      </ThemedText>

      <ThemedText style={styles.rangeCaption} lightColor="#3f3f46" darkColor="#d4d4d8">
        {rangeCaption}
      </ThemedText>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 달"
          hitSlop={10}
          onPress={onPrevMonth}
          style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.65 }]}>
          <IconSymbol name="chevron.left" size={22} color={headerInk} />
        </Pressable>
        <ThemedText style={styles.monthTitle}>
          {viewYear}년 {viewMonth}월
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="다음 달"
          hitSlop={10}
          onPress={onNextMonth}
          disabled={!canGoNext}
          style={({ pressed }) => [
            styles.navBtn,
            (!canGoNext || pressed) && { opacity: canGoNext ? 0.65 : 0.35 },
          ]}>
          <IconSymbol name="chevron.right" size={22} color={headerInk} />
        </Pressable>
      </View>

      {!isViewingCurrentMonth ? (
        <Pressable
          accessibilityRole="button"
          onPress={onJumpThisMonth}
          style={({ pressed }) => [
            styles.thisMonthBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' },
            pressed && { opacity: 0.88 },
          ]}>
          <ThemedText style={styles.thisMonthBtnText} lightColor="#18181b" darkColor="#e4e4e7">
            이번 달로
          </ThemedText>
        </Pressable>
      ) : null}

      <View style={styles.chartRow}>
        <View style={styles.yAxis}>
          <ThemedText style={[styles.yLab, { top: 0 }]} lightColor="#71717a" darkColor="#a1a1aa">
            {maxY}
          </ThemedText>
          <ThemedText
            style={[styles.yLab, { top: CHART_HEIGHT / 2 - 8 }]}
            lightColor="#71717a"
            darkColor="#a1a1aa">
            {midY}
          </ThemedText>
          <ThemedText style={[styles.yLab, { bottom: 0 }]} lightColor="#71717a" darkColor="#a1a1aa">
            0
          </ThemedText>
        </View>
        <View style={styles.chartArea} onLayout={onLayoutChart}>
          {chartW > 8 ? (
            <Svg width={chartW} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="statAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={areaTop} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={areaTop} stopOpacity={0.02} />
                </LinearGradient>
              </Defs>
              {gridLines.map((g) => (
                <Line
                  key={g.key}
                  x1={CHART_PAD.left}
                  y1={g.y}
                  x2={chartW - CHART_PAD.right}
                  y2={g.y}
                  stroke={gridStroke}
                  strokeWidth={1}
                />
              ))}
              {areaPath ? (
                <Path d={areaPath} fill="url(#statAreaGrad)" stroke="none" />
              ) : null}
              {linePath ? (
                <Path
                  d={linePath}
                  fill="none"
                  stroke={lineStroke}
                  strokeWidth={2.25}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {series.length > 0 ? (
                <Circle
                  cx={highlightX}
                  cy={highlightY}
                  r={4.5}
                  fill={lineStroke}
                  stroke={isDark ? '#09090b' : '#ffffff'}
                  strokeWidth={1.5}
                />
              ) : null}
            </Svg>
          ) : null}
        </View>
      </View>

      <View style={styles.xAxisRow}>
        {xLabels.map((lab) => (
          <ThemedText
            key={lab.key}
            style={[
              styles.xLab,
              lab.align === 'left' && { textAlign: 'left' },
              lab.align === 'center' && { textAlign: 'center' },
              lab.align === 'right' && { textAlign: 'right' },
            ]}
            lightColor="#71717a"
            darkColor="#a1a1aa">
            {lab.text}
          </ThemedText>
        ))}
      </View>

      <View style={[styles.summary, { borderTopColor: cardBorderColor }]}>
        <ThemedText style={styles.summaryLabel} lightColor="#52525b" darkColor="#a1a1aa">
          {summaryPoint && todayParsed && viewYear === todayParsed.y && viewMonth === todayParsed.m
            ? `${todayParsed.m}월 ${todayParsed.d}일 (오늘)`
            : summaryPoint
              ? `${viewMonth}월 ${summaryPoint.dayOfMonth}일`
              : '—'}
        </ThemedText>
        <ThemedText style={styles.summaryValue}>
          완료 {(summaryPoint?.total ?? 0).toLocaleString('ko-KR')}건
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  rangeCaption: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  navBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  thisMonthBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  thisMonthBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'stretch',
  },
  yAxis: {
    width: 28,
    height: CHART_HEIGHT,
    position: 'relative',
    marginRight: 4,
  },
  yLab: {
    position: 'absolute',
    right: 2,
    fontSize: 10,
    fontWeight: '700',
  },
  chartArea: {
    flex: 1,
    height: CHART_HEIGHT,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 2,
  },
  xLab: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
  },
  summary: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
});
