import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { ThemedText } from '@shared/ui/themed-text';

import type { WeeklyAxisRow } from '../lib/weeklyBalanceRadar';

type Props = {
  rows: WeeklyAxisRow[];
  balanceScore: number;
  ink: string;
  muted: string;
};

const DONUT_COLORS = [
  '#1A1A1A',
  '#4A4A4A',
  '#7A7A7A',
  '#A8A8A8',
  '#D0D0D0',
  '#3A3A3A',
  '#5C5C5C',
  '#8E8E8E',
];

const SIZE = 180;
const STROKE_WIDTH = 28;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEGREES = 3;

type ArcSegment = {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  offset: number;
  length: number;
};

function buildDonutSegments(rows: WeeklyAxisRow[]): ArcSegment[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total <= 0) return [];

  const activeRows = rows.filter((r) => r.value > 0);
  const gapTotal = activeRows.length * GAP_DEGREES;
  const availableDegrees = 360 - gapTotal;

  let currentOffset = 0;
  return activeRows.map((row, idx) => {
    const percent = Math.round((row.value / total) * 100);
    const degrees = (row.value / total) * availableDegrees;
    const length = (degrees / 360) * CIRCUMFERENCE;
    const offset = currentOffset;
    currentOffset += length + (GAP_DEGREES / 360) * CIRCUMFERENCE;
    return {
      key: row.key,
      label: row.label,
      value: row.value,
      percent,
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
      offset,
      length,
    };
  });
}

export function WeeklyBalanceDonut({ rows, balanceScore, ink, muted }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const chartSize = Math.min(SIZE, windowWidth - 80);
  const scale = chartSize / SIZE;

  const segments = useMemo(() => buildDonutSegments(rows), [rows]);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const hasData = total > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.chartWrap, { width: chartSize, height: chartSize }]}>
        <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {!hasData ? (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={muted}
              strokeWidth={STROKE_WIDTH}
              opacity={0.2}
            />
          ) : (
            <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
              {segments.map((seg) => (
                <Circle
                  key={seg.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="butt"
                />
              ))}
            </G>
          )}
        </Svg>
        <View style={styles.centerLabel}>
          <ThemedText style={[styles.centerValue, { color: ink }]}>
            {hasData ? `${total}` : '0'}
          </ThemedText>
          <ThemedText style={[styles.centerUnit, { color: muted }]}>
            {hasData ? '회 완료' : '기록 없음'}
          </ThemedText>
        </View>
      </View>

      {hasData ? (
        <View style={styles.legend}>
          {segments.map((seg) => (
            <View key={seg.key} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <ThemedText style={[styles.legendLabel, { color: ink }]} numberOfLines={1}>
                {seg.label}
              </ThemedText>
              <ThemedText style={[styles.legendValue, { color: muted }]}>
                {seg.percent}%
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  chartWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 38,
  },
  centerUnit: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  legend: {
    width: '100%',
    gap: 8,
    paddingHorizontal: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  legendValue: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
});
