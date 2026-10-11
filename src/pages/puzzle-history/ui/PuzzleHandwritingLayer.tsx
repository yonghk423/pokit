import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import {
  PUZZLE_INK_MAX_POINTS,
  PUZZLE_INK_MIN_DISTANCE,
  type PuzzleInkColor,
  type PuzzleInkPoint,
  type PuzzleInkStroke,
} from '@entities/puzzle-history';
import { PuzzleInkSvg } from '@widgets/puzzle-history-board';

type Props = {
  width: number;
  height: number;
  strokes: readonly PuzzleInkStroke[];
  color: PuzzleInkColor;
  enabled: boolean;
  onCommitStroke: (stroke: PuzzleInkStroke) => void;
};

function clampUnit(value: number, size: number): number {
  if (size <= 0) return 0;
  return Math.min(1, Math.max(0, value / size));
}

/** 완성 사진 위 손가락 획. 손글씨가 꺼져 있으면 터치를 페이지 스크롤에 넘긴다. */
export function PuzzleHandwritingLayer({
  width,
  height,
  strokes,
  color,
  enabled,
  onCommitStroke,
}: Props) {
  const [draft, setDraft] = useState<PuzzleInkStroke | null>(null);
  const draftRef = useRef<PuzzleInkStroke | null>(null);
  const colorRef = useRef(color);
  const sizeRef = useRef({ width, height });
  const commitRef = useRef(onCommitStroke);
  const enabledRef = useRef(enabled);
  const wasEnabledRef = useRef(enabled);
  colorRef.current = color;
  sizeRef.current = { width, height };
  commitRef.current = onCommitStroke;
  enabledRef.current = enabled;

  const flush = useCallback(() => {
    const stroke = draftRef.current;
    if (!stroke || stroke.points.length === 0) {
      draftRef.current = null;
      return;
    }
    draftRef.current = null;
    setDraft(null);
    commitRef.current(stroke);
  }, []);

  const beginStroke = useCallback((x: number, y: number) => {
    if (!enabledRef.current) return;
    const { width: boardW, height: boardH } = sizeRef.current;
    const point: PuzzleInkPoint = {
      x: clampUnit(x, boardW),
      y: clampUnit(y, boardH),
    };
    const next = { color: colorRef.current, points: [point] };
    draftRef.current = next;
    setDraft(next);
  }, []);

  const extendStroke = useCallback((x: number, y: number) => {
    const current = draftRef.current;
    if (!current || !enabledRef.current) return;
    if (current.points.length >= PUZZLE_INK_MAX_POINTS) return;
    const { width: boardW, height: boardH } = sizeRef.current;
    const point: PuzzleInkPoint = {
      x: clampUnit(x, boardW),
      y: clampUnit(y, boardH),
    };
    const prev = current.points[current.points.length - 1];
    if (prev && Math.hypot(point.x - prev.x, point.y - prev.y) < PUZZLE_INK_MIN_DISTANCE) {
      return;
    }
    const next = { color: current.color, points: [...current.points, point] };
    draftRef.current = next;
    setDraft(next);
  }, []);

  useEffect(() => {
    if (wasEnabledRef.current && !enabled) flush();
    wasEnabledRef.current = enabled;
  }, [enabled, flush]);

  useEffect(() => {
    return () => {
      const stroke = draftRef.current;
      draftRef.current = null;
      if (!stroke || stroke.points.length === 0) return;
      commitRef.current(stroke);
    };
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onStart((event) => {
          runOnJS(beginStroke)(event.x, event.y);
        })
        .onUpdate((event) => {
          runOnJS(extendStroke)(event.x, event.y);
        })
        .onFinalize(() => {
          runOnJS(flush)();
        }),
    [beginStroke, extendStroke, flush],
  );
  pan.enabled(enabled);

  return (
    <GestureDetector gesture={pan}>
      <View
        pointerEvents={enabled ? 'auto' : 'none'}
        style={styles.pad}
        collapsable={false}>
        <PuzzleInkSvg width={width} height={height} strokes={strokes} draft={draft} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
});
