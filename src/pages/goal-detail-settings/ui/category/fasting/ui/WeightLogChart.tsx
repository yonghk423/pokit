import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import {
  buildWeeklyLossGuideline,
  buildWeightChartSeries,
  daysBetweenWeightLogKeys,
  type FastingWeightLogs,
  type WeightChartPoint,
} from '@entities/day-plan/lib/weightLog';
import { useTranslation } from '@shared/lib/i18n';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const CHART_HEIGHT = 132;
const CHART_PAD_X = 8;
const CHART_PAD_Y_TOP = 12;
const CHART_PAD_Y_BOTTOM = 22;
const WEEKLY_LABEL_BELOW = 14;
const ACTUAL_LINE = 'rgb(0, 0, 0)';
const TARGET_LINE = '#0891b2';
const WEEKLY_LINE = '#14b8a6';

type Props = {
  weightLogs: FastingWeightLogs;
  targetWeightKg: number;
  weeklyLossTargetKg: number;
  palette: Palette;
};

function xForDate(dateKey: string, firstKey: string, lastKey: string, width: number): number {
  const spanDays = daysBetweenWeightLogKeys(firstKey, lastKey);
  if (spanDays <= 0) return width / 2;
  const innerW = Math.max(1, width - CHART_PAD_X * 2);
  return CHART_PAD_X + (daysBetweenWeightLogKeys(firstKey, dateKey) / spanDays) * innerW;
}

function pickWeeklyLabelIndexes(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count === 2) return [0, 1];
  return [0, Math.floor((count - 1) / 2), count - 1];
}

function layoutPoints(
  points: WeightChartPoint[],
  weeklyPoints: WeightChartPoint[],
  targetWeightKg: number,
  width: number,
): {
  polyline: string;
  weeklyPolyline: string;
  dots: { x: number; y: number }[];
  weeklyLabels: { x: number; y: number; kg: number; alignEnd: boolean }[];
  targetY: number;
  minLabel: string;
  maxLabel: string;
} | null {
  if (points.length === 0 || width <= 0) return null;

  const weights = [
    ...points.map((p) => p.weightKg),
    ...weeklyPoints.map((p) => p.weightKg),
    targetWeightKg,
  ];
  const minW = Math.min(...weights) - 0.5;
  const maxW = Math.max(...weights) + 0.5;
  const span = Math.max(0.5, maxW - minW);
  const innerH = CHART_HEIGHT - CHART_PAD_Y_TOP - CHART_PAD_Y_BOTTOM;
  const firstKey = points[0]!.dateKey;
  const lastKey = points[points.length - 1]!.dateKey;

  const toY = (w: number) => CHART_PAD_Y_TOP + ((maxW - w) / span) * innerH;
  const toX = (dateKey: string) => xForDate(dateKey, firstKey, lastKey, width);

  const dots = points.map((p) => ({
    x: toX(p.dateKey),
    y: toY(p.weightKg),
  }));
  const weeklyDots = weeklyPoints.map((p) => ({
    x: toX(p.dateKey),
    y: toY(p.weightKg),
    kg: p.weightKg,
  }));
  const labelIndexes = pickWeeklyLabelIndexes(weeklyDots.length);
  const weeklyLabels = labelIndexes.map((index) => {
    const point = weeklyDots[index]!;
    const alignEnd = index === weeklyDots.length - 1 || point.x > width - 36;
    return {
      x: alignEnd ? point.x - 5 : point.x + 5,
      y: Math.min(CHART_HEIGHT - 3, point.y + WEEKLY_LABEL_BELOW),
      kg: point.kg,
      alignEnd,
    };
  });

  return {
    polyline: dots.map((d) => `${d.x},${d.y}`).join(' '),
    weeklyPolyline: weeklyDots.map((d) => `${d.x},${d.y}`).join(' '),
    dots,
    weeklyLabels,
    targetY: toY(targetWeightKg),
    minLabel: minW.toFixed(1),
    maxLabel: maxW.toFixed(1),
  };
}

function ChartLegend({
  targetWeightKg,
  weeklyLossTargetKg,
  showWeekly,
  palette,
}: {
  targetWeightKg: number;
  weeklyLossTargetKg: number;
  showWeekly: boolean;
  palette: Palette;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.legendList}>
      <View style={styles.legendRow}>
        <View style={[styles.legendBar, { backgroundColor: ACTUAL_LINE }]} />
        <ThemedText style={[styles.legendText, { color: palette.onVariant }]}>
          {t('goalDetail.fasting.chartLegendActual')}
        </ThemedText>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendBar, { backgroundColor: TARGET_LINE }]} />
        <ThemedText style={[styles.legendText, { color: palette.onVariant }]}>
          {t('goalDetail.fasting.chartLegendTarget', { kg: targetWeightKg.toFixed(1) })}
        </ThemedText>
      </View>
      {showWeekly ? (
        <View style={styles.legendRow}>
          <View style={[styles.legendBar, { backgroundColor: WEEKLY_LINE }]} />
          <ThemedText style={[styles.legendText, { color: palette.onVariant }]}>
            {t('goalDetail.fasting.chartLegendWeekly', {
              weekly: weeklyLossTargetKg.toFixed(1),
            })}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function WeightLogChartInner({
  points,
  targetWeightKg,
  weeklyLossTargetKg,
  palette,
}: {
  points: WeightChartPoint[];
  targetWeightKg: number;
  weeklyLossTargetKg: number;
  palette: Palette;
}) {
  const { t } = useTranslation();
  const isNote = useUiSurfacePresentation() === 'note';
  const [width, setWidth] = useState(0);
  const weeklyPoints = useMemo(
    () => buildWeeklyLossGuideline(points, weeklyLossTargetKg, targetWeightKg),
    [points, targetWeightKg, weeklyLossTargetKg],
  );
  const layout = useMemo(
    () => layoutPoints(points, weeklyPoints, targetWeightKg, width),
    [points, targetWeightKg, weeklyPoints, width],
  );
  const wrapStyle = [
    styles.wrap,
    !isNote && { borderColor: palette.outline },
    isNote && styles.wrapNote,
  ];

  const showWeekly = weeklyLossTargetKg > 0;

  if (points.length < 2) {
    return (
      <View style={wrapStyle}>
        <ThemedText style={[styles.title, { color: palette.onSurface }]}>{t('goalDetail.fasting.chartTitle')}</ThemedText>
        <ChartLegend
          targetWeightKg={targetWeightKg}
          weeklyLossTargetKg={weeklyLossTargetKg}
          showWeekly={showWeekly}
          palette={palette}
        />
        <ThemedText style={[styles.empty, { color: palette.onVariant }]}>
          {t('goalDetail.fasting.chartHint')}
        </ThemedText>
      </View>
    );
  }

  const firstLabel = points[0]!.dateKey.slice(5).replace('-', '/');
  const lastLabel = points[points.length - 1]!.dateKey.slice(5).replace('-', '/');

  return (
    <View style={wrapStyle}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.title, { color: palette.onSurface }]}>{t('goalDetail.fasting.chartTitle')}</ThemedText>
        <ThemedText style={[styles.range, { color: palette.onVariant }]}>
          {firstLabel} – {lastLabel}
        </ThemedText>
      </View>
      <ChartLegend
        targetWeightKg={targetWeightKg}
        weeklyLossTargetKg={weeklyLossTargetKg}
        showWeekly={showWeekly && weeklyPoints.length > 0}
        palette={palette}
      />
      <View style={styles.chartBox} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {layout && width > 0 ? (
          <>
            <ThemedText style={[styles.axisLabel, styles.axisTop, { color: palette.onVariant }]}>
              {layout.maxLabel}
            </ThemedText>
            <ThemedText style={[styles.axisLabel, styles.axisBottom, { color: palette.onVariant }]}>
              {layout.minLabel}
            </ThemedText>
            <Svg width={width} height={CHART_HEIGHT}>
              {layout.weeklyPolyline.length > 0 ? (
                <Polyline
                  points={layout.weeklyPolyline}
                  fill="none"
                  stroke={WEEKLY_LINE}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
              {layout.weeklyLabels.map((label, i) => (
                <SvgText
                  key={`weekly-kg-${i}`}
                  x={label.x}
                  y={label.y}
                  fill={WEEKLY_LINE}
                  fontSize={10}
                  fontWeight="400"
                  textAnchor={label.alignEnd ? 'end' : 'start'}>
                  {label.kg.toFixed(1)}
                </SvgText>
              ))}
              <Line
                x1={CHART_PAD_X}
                y1={layout.targetY}
                x2={width - CHART_PAD_X}
                y2={layout.targetY}
                stroke={TARGET_LINE}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <SvgText
                x={width - CHART_PAD_X}
                y={Math.max(11, layout.targetY - 5)}
                fill={TARGET_LINE}
                fontSize={10}
                fontWeight="600"
                textAnchor="end">
                {targetWeightKg.toFixed(1)}
              </SvgText>
              <Polyline
                points={layout.polyline}
                fill="none"
                stroke={ACTUAL_LINE}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {layout.dots.map((dot, i) => (
                <Circle key={`${points[i]!.dateKey}-${i}`} cx={dot.x} cy={dot.y} r={3.5} fill={ACTUAL_LINE} />
              ))}
            </Svg>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function WeightLogChart({
  weightLogs,
  targetWeightKg,
  weeklyLossTargetKg,
  palette,
}: Props) {
  const points = useMemo(() => buildWeightChartSeries(weightLogs, 30), [weightLogs]);
  return (
    <WeightLogChartInner
      points={points}
      targetWeightKg={targetWeightKg}
      weeklyLossTargetKg={weeklyLossTargetKg}
      palette={palette}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  wrapNote: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { fontSize: 14, fontWeight: '800' },
  range: { fontSize: 11, fontWeight: '600' },
  empty: { fontSize: 12, fontWeight: '600', lineHeight: 18, paddingVertical: 8 },
  chartBox: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  axisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 9,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
  axisTop: { top: 0 },
  axisBottom: { bottom: 0 },
  legendList: { gap: 4, paddingBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBar: { width: 18, height: 4, borderRadius: 1 },
  legendText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
