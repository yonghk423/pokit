import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { parseHHmmToMinutes } from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import {
  MIN_BLOCK_DURATION_MINUTES,
  PRIMARY,
  TIME_SNAP_MINUTES,
  formatMinutesToHHmm,
  getDaySliderPercents,
  snapMinutes,
} from '../lib/dayPlanEditorShared';

type Props = {
  startTime: string;
  endTime: string;
  onStartEndChange: (start: string, end: string) => void;
  c: DayPlanPalette;
};

const DAY_MIN = 24 * 60;

export function TimeRangeTimeline({ startTime, endTime, onStartEndChange, c }: Props) {
  const trackWRef = useRef(240);
  const baselineRef = useRef<{ startMin: number; endMin: number } | null>(null);
  const onChangeRef = useRef(onStartEndChange);
  const parsedRef = useRef({ startMin: 9 * 60, endMin: 10 * 60 });

  useEffect(() => {
    onChangeRef.current = onStartEndChange;
  }, [onStartEndChange]);

  const parsed = useMemo(() => {
    const s = parseHHmmToMinutes(startTime);
    const e = parseHHmmToMinutes(endTime);
    let startMin = s ?? 9 * 60;
    let endMin = e ?? startMin + MIN_BLOCK_DURATION_MINUTES;
    if (endMin <= startMin) endMin = startMin + MIN_BLOCK_DURATION_MINUTES;
    if (endMin - startMin < MIN_BLOCK_DURATION_MINUTES) {
      endMin = Math.min(DAY_MIN, startMin + MIN_BLOCK_DURATION_MINUTES);
    }
    return { startMin, endMin };
  }, [startTime, endTime]);

  useEffect(() => {
    parsedRef.current = parsed;
  }, [parsed]);

  const { startMin, endMin } = parsed;
  const { rangeLeftPct, rangeWidthPct, startPct, endPct } = getDaySliderPercents(
    formatMinutesToHHmm(startMin),
    formatMinutesToHHmm(endMin),
  );

  const startPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const p = parsedRef.current;
        baselineRef.current = { startMin: p.startMin, endMin: p.endMin };
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, g) => {
        const w = Math.max(trackWRef.current, 1);
        const base = baselineRef.current;
        if (!base) return;
        const deltaMin = (g.dx / w) * DAY_MIN;
        let next = snapMinutes(base.startMin + deltaMin);
        next = Math.max(0, Math.min(next, base.endMin - MIN_BLOCK_DURATION_MINUTES));
        onChangeRef.current(formatMinutesToHHmm(next), formatMinutesToHHmm(base.endMin));
      },
      onPanResponderRelease: () => {
        baselineRef.current = null;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderTerminate: () => {
        baselineRef.current = null;
      },
    }),
  ).current;

  const endPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const p = parsedRef.current;
        baselineRef.current = { startMin: p.startMin, endMin: p.endMin };
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, g) => {
        const w = Math.max(trackWRef.current, 1);
        const base = baselineRef.current;
        if (!base) return;
        const deltaMin = (g.dx / w) * DAY_MIN;
        let next = snapMinutes(base.endMin + deltaMin);
        next = Math.max(base.startMin + MIN_BLOCK_DURATION_MINUTES, Math.min(next, DAY_MIN));
        onChangeRef.current(formatMinutesToHHmm(base.startMin), formatMinutesToHHmm(next));
      },
      onPanResponderRelease: () => {
        baselineRef.current = null;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderTerminate: () => {
        baselineRef.current = null;
      },
    }),
  ).current;

  return (
    <View style={styles.sliderBlock}>
      <ThemedText style={[styles.timelineMeta, { color: c.outline }]}>
        {formatMinutesToHHmm(startMin)} → {formatMinutesToHHmm(endMin)} · {Math.max(0, endMin - startMin)}분
      </ThemedText>
      <View
        style={styles.sliderTrackArea}
        onLayout={(e) => {
          trackWRef.current = e.nativeEvent.layout.width;
        }}>
        <View style={[styles.sliderTrack, { backgroundColor: c.containerLow }]} />
        <View
          style={[
            styles.sliderRange,
            {
              left: `${rangeLeftPct}%`,
              width: `${rangeWidthPct}%`,
              backgroundColor: PRIMARY,
            },
          ]}
        />
        <View
          style={[styles.thumb, { left: `${startPct}%`, marginLeft: -16 }]}
          {...startPan.panHandlers}
          accessibilityLabel="시작 시각 조절"
          accessibilityRole="adjustable"
        >
          <View style={styles.thumbDot} />
        </View>
        <View
          style={[styles.thumb, { left: `${endPct}%`, marginLeft: -16 }]}
          {...endPan.panHandlers}
          accessibilityLabel="종료 시각 조절"
          accessibilityRole="adjustable"
        >
          <View style={styles.thumbDot} />
        </View>
      </View>
      <View style={styles.markerRowStatic}>
        {['06:00', '12:00', '18:00', '00:00'].map((t) => (
          <ThemedText key={t} style={[styles.markerText, { color: c.outline }]}>
            {t}
          </ThemedText>
        ))}
      </View>
      <ThemedText style={[styles.dragHint, { color: c.outline }]}>
        {TIME_SNAP_MINUTES}분 단위 · 원을 드래그해 시작·종료 시각을 맞춰 보세요
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderBlock: {
    marginTop: 4,
    gap: 10,
  },
  timelineMeta: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  sliderTrackArea: {
    height: 48,
    justifyContent: 'center',
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 999,
    top: '50%',
    marginTop: -3,
  },
  sliderRange: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    top: '50%',
    marginTop: -3,
    minWidth: 4,
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  thumbDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY },
  markerRowStatic: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  markerText: { fontSize: 9, fontWeight: '800' },
  dragHint: { fontSize: 10, fontWeight: '600', paddingHorizontal: 2, marginTop: 2 },
});
