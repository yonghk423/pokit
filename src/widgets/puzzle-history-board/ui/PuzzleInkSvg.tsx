import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { PUZZLE_INK_WIDTH, type PuzzleInkStroke } from '@entities/puzzle-history';

type Props = {
  width: number;
  height: number;
  strokes: readonly PuzzleInkStroke[];
  draft?: PuzzleInkStroke | null;
};

function strokePoints(stroke: PuzzleInkStroke, width: number, height: number): string {
  return stroke.points.map((point) => `${point.x * width},${point.y * height}`).join(' ');
}

function InkStrokeMark({
  stroke,
  width,
  height,
}: {
  stroke: PuzzleInkStroke;
  width: number;
  height: number;
}) {
  const strokeWidth = PUZZLE_INK_WIDTH * width;
  const only = stroke.points[0];
  if (!only) return null;
  if (stroke.points.length === 1) {
    return (
      <Circle
        cx={only.x * width}
        cy={only.y * height}
        r={strokeWidth / 2}
        fill={stroke.color}
      />
    );
  }
  return (
    <Polyline
      points={strokePoints(stroke, width, height)}
      fill="none"
      stroke={stroke.color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** 저장된 손글씨. 터치는 받지 않는다. */
export function PuzzleInkSvg({ width, height, strokes, draft }: Props) {
  if (width <= 0 || height <= 0) return null;
  const visible =
    draft && draft.points.length > 0 ? [...strokes, draft] : strokes;
  if (visible.length === 0) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        {visible.map((stroke, index) => (
          <InkStrokeMark key={index} stroke={stroke} width={width} height={height} />
        ))}
      </Svg>
    </View>
  );
}
