import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import {
  buildWeightChartSeries,
  type FastingWeightLogs,
  type WeightChartPoint,
} from '@entities/day-plan/lib/weightLog';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

const CHART_HEIGHT = 132;
const CHART_PAD_X = 8;
const CHART_PAD_Y = 12;
const PRIMARY = 'rgb(0, 0, 0)';

type Props = {
  weightLogs: FastingWeightLogs;
  targetWeightKg: number;
  palette: Palette;
};

function layoutPoints(
  points: WeightChartPoint[],
  targetWeightKg: number,
  width: number,
): {
  polyline: string;
  dots: { x: number; y: number }[];
  targetY: number;
  minLabel: string;
  maxLabel: string;
} | null {
  if (points.length === 0 || width <= 0) return null;

  const weights = points.map((p) => p.weightKg);
  const minW = Math.min(...weights, targetWeightKg) - 0.5;
  const maxW = Math.max(...weights, targetWeightKg) + 0.5;
  const span = Math.max(0.5, maxW - minW);
  const innerW = Math.max(1, width - CHART_PAD_X * 2);
  const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;

  const toY = (w: number) => CHART_PAD_Y + ((maxW - w) / span) * innerH;
  const toX = (index: number) =>
    points.length === 1 ? width / 2 : CHART_PAD_X + (index / (points.length - 1)) * innerW;

  const dots = points.map((p, i) => ({
    x: toX(i),
    y: toY(p.weightKg),
  }));

  return {
    polyline: dots.map((d) => `${d.x},${d.y}`).join(' '),
    dots,
    targetY: toY(targetWeightKg),
    minLabel: minW.toFixed(1),
    maxLabel: maxW.toFixed(1),
  };
}

function WeightLogChartInner({
  points,
  targetWeightKg,
  palette,
}: {
  points: WeightChartPoint[];
  targetWeightKg: number;
  palette: Palette;
}) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const layout = useMemo(
    () => layoutPoints(points, targetWeightKg, width),
    [points, targetWeightKg, width],
  );

  if (points.length < 2) {
    return (
      <View style={[styles.wrap, { borderColor: palette.outline }]}>
        <ThemedText style={[styles.title, { color: palette.onSurface }]}>{t('goalDetail.fasting.chartTitle')}</ThemedText>
        <ThemedText style={[styles.empty, { color: palette.onVariant }]}>
          {t('goalDetail.fasting.chartHint')}
        </ThemedText>
      </View>
    );
  }

  const firstLabel = points[0]!.dateKey.slice(5).replace('-', '/');
  const lastLabel = points[points.length - 1]!.dateKey.slice(5).replace('-', '/');

  return (
    <View style={[styles.wrap, { borderColor: palette.outline }]}>
      <View style={styles.headerRow}>
        <ThemedText style={[styles.title, { color: palette.onSurface }]}>{t('goalDetail.fasting.chartTitle')}</ThemedText>
        <ThemedText style={[styles.range, { color: palette.onVariant }]}>
          {firstLabel} – {lastLabel}
        </ThemedText>
      </View>
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
              <Line
                x1={CHART_PAD_X}
                y1={layout.targetY}
                x2={width - CHART_PAD_X}
                y2={layout.targetY}
                stroke="rgba(34, 211, 238, 0.55)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <Polyline
                points={layout.polyline}
                fill="none"
                stroke={PRIMARY}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {layout.dots.map((dot, i) => (
                <Circle key={`${points[i]!.dateKey}-${i}`} cx={dot.x} cy={dot.y} r={3.5} fill={PRIMARY} />
              ))}
            </Svg>
          </>
        ) : null}
      </View>
      <ThemedText style={[styles.legend, { color: palette.onVariant }]}>
        {t('goalDetail.fasting.targetLine', { kg: targetWeightKg.toFixed(1) })}
      </ThemedText>
    </View>
  );
}

export function WeightLogChart({ weightLogs, targetWeightKg, palette }: Props) {
  const points = useMemo(() => buildWeightChartSeries(weightLogs, 30), [weightLogs]);
  return <WeightLogChartInner points={points} targetWeightKg={targetWeightKg} palette={palette} />;
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
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
  legend: { fontSize: 10, fontWeight: '600' },
});
