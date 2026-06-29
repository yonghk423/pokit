import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import {
  COMPLETION_TREND_CHART_VIEWBOX,
  type CompletionTrendChartPaths,
} from '../lib/completionTrendChart';

type Props = {
  paths: CompletionTrendChartPaths;
  stroke: string;
  trackColor: string;
  surfaceColor: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const GRID_LINES = [0.25, 0.5, 0.75] as const;

export function CompletionTrendChart({
  paths,
  stroke,
  trackColor,
  surfaceColor,
  height = 76,
  style,
}: Props) {
  const gradientId = useId().replace(/:/g, '');
  const { width, height: viewHeight } = COMPLETION_TREND_CHART_VIEWBOX;
  const padY = 12;
  const innerHeight = viewHeight - padY * 2;
  const hasArea = paths.areaD.length > 0;

  return (
    <View style={[styles.wrap, { backgroundColor: surfaceColor }, style]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="0.55" stopColor={stroke} stopOpacity={0.1} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {GRID_LINES.map((level) => {
          const y = padY + (1 - level) * innerHeight;
          return (
            <Line
              key={level}
              x1={14}
              y1={y}
              x2={width - 14}
              y2={y}
              stroke={trackColor}
              strokeWidth={1}
              strokeDasharray="3 5"
            />
          );
        })}

        {hasArea ? <Path d={paths.areaD} fill={`url(#${gradientId})`} /> : null}

        <Path
          d={paths.lineD}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hasArea ? (
          <>
            <Circle
              cx={paths.endX}
              cy={paths.endY}
              r={5.5}
              fill={surfaceColor}
              opacity={0.95}
            />
            <Circle cx={paths.endX} cy={paths.endY} r={3.25} fill={stroke} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 4,
  },
});
