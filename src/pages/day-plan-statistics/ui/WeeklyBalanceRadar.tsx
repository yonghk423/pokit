import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { G, Line, Polygon } from 'react-native-svg';

import {
  buildRadarAxisLines,
  buildRadarLabelAnchors,
  buildRadarPolygonPoints,
  buildWeeklyAxisScores,
  type WeeklyAxisRow,
} from '../lib/weeklyBalanceRadar';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  rows: WeeklyAxisRow[];
  ink: string;
  muted: string;
  track: string;
  fill: string;
  fillMuted: string;
};

const VIEW_SIZE = 100;
const CHART_MAX = 300;
const CHART_MIN = 240;
const HORIZONTAL_GUTTER = 48;

export function WeeklyBalanceRadar({ rows, ink, muted, track, fill, fillMuted }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const chartSize = Math.min(CHART_MAX, Math.max(CHART_MIN, windowWidth - HORIZONTAL_GUTTER));

  const scores = useMemo(() => buildWeeklyAxisScores(rows), [rows]);
  const polygon = useMemo(() => buildRadarPolygonPoints(scores), [scores]);
  const axisLines = useMemo(() => buildRadarAxisLines(), []);
  const labels = useMemo(() => buildRadarLabelAnchors(scores), [scores]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.chartFrame, { width: chartSize, height: chartSize }]}>
        <View style={styles.guides} pointerEvents="none">
          <View style={[styles.guideOuter, { borderColor: track }]} />
          <View style={[styles.guideMid, { borderColor: track }]} />
          <View style={[styles.guideInner, { borderColor: track }]} />
        </View>
        <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}>
          <G>
            {axisLines.map((line, idx) => (
              <Line
                key={`axis-${idx}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={muted}
                strokeWidth={0.25}
                opacity={0.5}
              />
            ))}
            <Polygon points={polygon} fill={fillMuted} stroke={fill} strokeWidth={0.9} />
          </G>
        </Svg>
        <View style={styles.labelLayer} pointerEvents="none">
          {labels.map((row) => (
            <View
              key={row.key}
              style={[
                styles.labelAnchor,
                {
                  left: `${row.x}%`,
                  top: `${row.y}%`,
                  alignItems:
                    row.anchor === 'start' ? 'flex-start' : row.anchor === 'end' ? 'flex-end' : 'center',
                },
              ]}>
              <ThemedText style={[styles.labelText, { color: ink }]}>
                {row.label}{' '}
                <ThemedText style={[styles.labelPct, { color: ink }]}>{row.percent}%</ThemedText>
              </ThemedText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  chartFrame: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guides: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideOuter: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  guideMid: {
    position: 'absolute',
    width: '56%',
    height: '56%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  guideInner: {
    position: 'absolute',
    width: '32%',
    height: '32%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    opacity: 0.35,
  },
  labelLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  labelAnchor: {
    position: 'absolute',
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
    maxWidth: 76,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  labelPct: {
    fontSize: 9,
    fontWeight: '900',
  },
});
