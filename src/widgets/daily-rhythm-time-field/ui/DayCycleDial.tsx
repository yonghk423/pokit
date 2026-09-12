import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import {
  addDaysToLocalDateKey,
  getLocalDateKey,
  parseHHmmToMinutes,
} from '@entities/day-plan';
import {
  RETRO_BORDER_WIDTH,
  RetroFlatColors,
  SOLID_SHADOW_OFFSET,
  cityPopFont,
} from '@shared/config/retroFlat';
import { formatDateKeyCompact, formatHhmmClock, useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { DialHandleBadge } from './DialHandleBadge';

import {
  CYCLE_MINUTES,
  DAY_MINUTES,
  buildDayCycleSegments,
  clampDialHandle,
  clockwiseSpanMinutes,
  cycleDisplayMinutes,
  cycleEndIsNextDay,
  cycleMinutesToClockHhmm,
  describeDonutSegment,
  formatBalanceDuration,
  minutesFromDialPointRaw,
  polarToCartesian,
  sleepSpanUntilNextWake,
  snapCycleMinutes,
  toCycleEndMinutes,
  toCycleStartMinutes,
  type DialHandleKind,
} from '../lib/dayCycleDialMath';

const DIAL_BACKDROP = require('../../../../assets/main.png') as ImageSourcePropType;

export type DayCycleDialProps = {
  startHhmm: string;
  endHhmm: string;
  /** 마무리가 다음 날이면 true */
  endNextDay?: boolean;
  /** 시작 기준일 `YYYY-MM-DD` — 미지정 시 오늘 */
  baseDateKey?: string;
  onChange: (startHhmm: string, endHhmm: string, endNextDay: boolean) => void;
  /** 드래그 중 true — 부모 ScrollView 잠금용 */
  onInteractionChange?: (active: boolean) => void;
  isDark?: boolean;
  size?: number;
};

/** 드래그 중 1분 단위 — 놓을 때 5분으로 정리 */
const DRAG_SNAP_STEP = 1;
const COMMIT_SNAP_STEP = 5;

/** 온보딩 ScrollView 좌우 패딩(14×2)에 맞춘 첫 페인트용 추정 */
const DIAL_CONTENT_INSET = 28;

function clampDialSize(containerW: number): number {
  // solid shadow가 우측으로 나가므로 여유만 두고 최대한 크게
  return Math.min(Math.max(containerW - SOLID_SHADOW_OFFSET - 2, 280), 420);
}

function parseStartToCycle(hhmm: string): number {
  const m = parseHHmmToMinutes(hhmm.trim());
  if (m === null) return toCycleStartMinutes(7 * 60);
  return toCycleStartMinutes(m);
}

function parseEndToCycle(hhmm: string, nextDay: boolean): number {
  const m = parseHHmmToMinutes(hhmm.trim());
  if (m === null) return toCycleEndMinutes(23 * 60, nextDay);
  const dayMinutes = m === DAY_MINUTES ? DAY_MINUTES : m;
  return toCycleEndMinutes(dayMinutes, nextDay);
}

const HOUR_TICKS = Array.from({ length: 48 }, (_, h) => h);
/** 라벨을 다는 사이클 시(3시간 간격). 표시는 시계 시(0–23) */
const LABEL_HOURS = new Set(Array.from({ length: 16 }, (_, i) => i * 3));
const MAJOR_HOURS = new Set([0, 12, 24, 36]);

function cycleHourToClockLabel(cycleHour: number): string {
  return String(((cycleHour % 24) + 24) % 24);
}

/** 하루마다 AM/PM을 한 번씩 — 오전 6시·오후 6시 옆에만 */
const MERIDIEM_HOURS = new Set([6, 18, 30, 42]);

function cycleHourToMeridiem(cycleHour: number): 'AM' | 'PM' | null {
  if (!MERIDIEM_HOURS.has(cycleHour)) return null;
  return cycleHour % 24 < 12 ? 'AM' : 'PM';
}

type DraftRange = { start: number; end: number };

/**
 * 48시간 원형 다이얼 — 핸들(또는 링)을 손가락으로 드래그해 시작·마무리 시각을 설정.
 */
export function DayCycleDial({
  startHhmm,
  endHhmm,
  endNextDay = false,
  baseDateKey,
  onChange,
  onInteractionChange,
  isDark = false,
  size: sizeProp,
}: DayCycleDialProps) {
  const { t, locale } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const dialRef = useRef<View>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef(300);
  const ringMidRRef = useRef(100);
  const handleKindRef = useRef<DialHandleKind>('start');
  const draggingRef = useRef(false);
  /** 드래그 중 마지막 햅틱을 준 「시」 — 정시만 피드백 (버벅임 완화) */
  const lastHapticHourRef = useRef<number | null>(null);
  const startMinRef = useRef(parseStartToCycle(startHhmm));
  const endMinRef = useRef(parseEndToCycle(endHhmm, endNextDay));
  const lastEmittedRef = useRef({ start: startHhmm, end: endHhmm, endNextDay });
  const onChangeRef = useRef(onChange);
  const onInteractionChangeRef = useRef(onInteractionChange);
  const draftFlushRafRef = useRef<number | null>(null);
  const pendingDraftRef = useRef<DraftRange | null>(null);
  onChangeRef.current = onChange;
  onInteractionChangeRef.current = onInteractionChange;

  /** 첫 페인트부터 최종 크기에 가깝게 — layout 전 300 폴백으로 커지는 점프 방지 */
  const estimatedContentW = Math.max(260, windowWidth - DIAL_CONTENT_INSET);
  const [layoutW, setLayoutW] = useState(estimatedContentW);
  const [activeHandle, setActiveHandle] = useState<DialHandleKind | null>(null);
  const [draft, setDraft] = useState<DraftRange | null>(null);

  const size = sizeProp ?? clampDialSize(layoutW);
  sizeRef.current = size;
  const cx = size / 2;
  const cy = size / 2;
  // 바깥 라벨(0·24 + 날짜)이 사각 테두리에 잘리지 않도록 링을 안쪽으로
  const labelInset = Math.max(52, size * 0.16);
  const outerR = size / 2 - labelInset;
  const innerR = outerR * 0.58;
  const ringMidR = (outerR + innerR) / 2;
  ringMidRRef.current = ringMidR;
  const handleR = Math.max(10, size * 0.055);
  const labelR = outerR + labelInset * 0.42;
  const meridiemR = outerR + labelInset * 0.70;
  const minorTickInner = outerR - 6;
  const majorTickInner = outerR - 11;

  // 드래그 중에는 props로 덮어쓰지 않음 — 손가락 궤적이 끊기지 않게
  useEffect(() => {
    if (draggingRef.current) return;
    startMinRef.current = parseStartToCycle(startHhmm);
    endMinRef.current = parseEndToCycle(endHhmm, endNextDay);
    lastEmittedRef.current = { start: startHhmm, end: endHhmm, endNextDay };
    setDraft(null);
  }, [endHhmm, endNextDay, startHhmm]);

  useEffect(() => {
    return () => {
      if (draftFlushRafRef.current != null) {
        cancelAnimationFrame(draftFlushRafRef.current);
      }
    };
  }, []);

  const startU = draft?.start ?? parseStartToCycle(startHhmm);
  const endU = draft?.end ?? parseEndToCycle(endHhmm, endNextDay);

  const displayStart = cycleDisplayMinutes(startU);
  const displayEnd = cycleDisplayMinutes(endU);

  const activitySpanMin = endU - startU;
  const sleepSpanMin = sleepSpanUntilNextWake(startU, endU);
  const activityDuration = formatBalanceDuration(activitySpanMin, locale);
  const sleepDuration = formatBalanceDuration(sleepSpanMin, locale);

  const cycleSegments = useMemo(
    () => buildDayCycleSegments(startU, endU),
    [endU, startU],
  );
  const segmentPaths = useMemo(
    () =>
      cycleSegments.map((seg) => ({
        ...seg,
        path: describeDonutSegment(cx, cy, outerR, innerR, seg.startDisplay, seg.endDisplay),
        span: clockwiseSpanMinutes(seg.startDisplay, seg.endDisplay),
        mid: polarToCartesian(
          cx,
          cy,
          ringMidR,
          (seg.startDisplay + clockwiseSpanMinutes(seg.startDisplay, seg.endDisplay) / 2) %
            CYCLE_MINUTES,
        ),
      })),
    [cx, cy, cycleSegments, innerR, outerR, ringMidR],
  );

  /** 둘째 해 — 시작과 같은 시계 시각의 다음날(48h 다이얼 맞은편). 활동이 길어도 숨기지 않음 */
  const displayWake = cycleDisplayMinutes(startU + DAY_MINUTES);
  const startPos = polarToCartesian(cx, cy, ringMidR, displayStart);
  const endPos = polarToCartesian(cx, cy, ringMidR, displayEnd);
  const wakePos = polarToCartesian(cx, cy, ringMidR, displayWake);
  const activePos =
    activeHandle === 'end' ? endPos : activeHandle === 'wake' ? wakePos : startPos;

  /** City Pop Flat — 민트(활동) / 잉크(수면) / 트랙(그 외) */
  const colors = {
    dialStroke: tone.border,
    dialTrack: isDark ? tone.surfaceAlt : tone.bg,
    activityFill: isDark ? tone.primaryContainer : tone.bgMint,
    sleepFill: isDark ? '#12152A' : tone.text,
    restFill: 'transparent',
    /** 해 핸들 — 맑은 하늘(선명) + 노란 해 */
    startHandle: isDark ? '#2F8FCB' : '#2EA7E0',
    startHandleIcon: '#FFE566',
    /** 달 핸들 — 깜깜한 밤 + 노란 달 */
    endHandle: isDark ? '#050508' : '#0A0A0C',
    endHandleIcon: '#F5D76E',
    centerBg: isDark ? 'rgba(45, 47, 68, 0.58)' : 'rgba(255, 255, 255, 0.58)',
    ink: tone.text,
    muted: tone.textMuted,
    sleepLabel: isDark ? tone.text : '#FFFFFF',
    restLabel: isDark ? tone.textMuted : tone.textMuted,
    sleepAccent: tone.accent,
    /** 레이아웃 음영은 항상 검정 */
    shadow: '#000000',
    summaryBg: isDark ? tone.surfaceAlt : '#FFFFFF',
  };

  const measureOriginSync = useCallback((cb?: () => void) => {
    try {
      dialRef.current?.measureInWindow((x, y) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          originRef.current = { x, y };
        }
        cb?.();
      });
    } catch {
      cb?.();
    }
  }, []);

  const emitIfChanged = useCallback((start: number, end: number) => {
    const nextStart = cycleMinutesToClockHhmm(start, false);
    const nextEnd = cycleMinutesToClockHhmm(end, true);
    const nextEndNextDay = cycleEndIsNextDay(end);
    if (
      nextStart === lastEmittedRef.current.start &&
      nextEnd === lastEmittedRef.current.end &&
      nextEndNextDay === lastEmittedRef.current.endNextDay
    ) {
      return;
    }
    lastEmittedRef.current = { start: nextStart, end: nextEnd, endNextDay: nextEndNextDay };
    try {
      onChangeRef.current(nextStart, nextEnd, nextEndNextDay);
    } catch {
      /* ignore */
    }
  }, []);

  const scheduleDraftFlush = useCallback(() => {
    if (draftFlushRafRef.current != null) return;
    draftFlushRafRef.current = requestAnimationFrame(() => {
      draftFlushRafRef.current = null;
      const pending = pendingDraftRef.current;
      if (!pending) return;
      setDraft(pending);
    });
  }, []);

  const hapticForHour = useCallback((activeMinutes: number) => {
    const hour = Math.floor(cycleDisplayMinutes(activeMinutes) / 60) % 48;
    if (lastHapticHourRef.current === null) {
      lastHapticHourRef.current = hour;
      return;
    }
    if (lastHapticHourRef.current === hour) return;
    lastHapticHourRef.current = hour;
    // 시가 바뀔 때마다 — 0·12·24·36은 조금 더 또렷하게
    const isMajor = hour % 12 === 0;
    void Haptics.impactAsync(
      isMajor ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => undefined);
  }, []);

  const applyLocalPoint = useCallback(
    (localX: number, localY: number) => {
      if (!Number.isFinite(localX) || !Number.isFinite(localY)) return;
      const center = sizeRef.current / 2;
      // 중심 근처(안쪽 원) 터치는 무시 — 각도 불안정
      const dist = Math.hypot(localX - center, localY - center);
      if (dist < ringMidRRef.current * 0.35) return;

      const rawMin = minutesFromDialPointRaw(localX, localY, center, center);
      const clamped = clampDialHandle(
        handleKindRef.current,
        rawMin,
        startMinRef.current,
        endMinRef.current,
        undefined,
        DRAG_SNAP_STEP,
      );
      if (clamped.start === startMinRef.current && clamped.end === endMinRef.current) return;

      startMinRef.current = clamped.start;
      endMinRef.current = clamped.end;
      // 드래그 중에는 부모 onChange 호출하지 않음 — 상위 리렌더가 버벅임의 주원인
      pendingDraftRef.current = { start: clamped.start, end: clamped.end };
      scheduleDraftFlush();

      if (draggingRef.current) {
        const kind = handleKindRef.current;
        const active =
          kind === 'end'
            ? clamped.end
            : kind === 'wake'
              ? clamped.start + DAY_MINUTES
              : clamped.start;
        hapticForHour(active);
      }
    },
    [hapticForHour, scheduleDraftFlush],
  );

  const commitDrag = useCallback(() => {
    const start = snapCycleMinutes(startMinRef.current, COMMIT_SNAP_STEP);
    const endSnapped =
      Math.round(endMinRef.current / COMMIT_SNAP_STEP) * COMMIT_SNAP_STEP;
    const kind = handleKindRef.current;
    const target =
      kind === 'end'
        ? endSnapped
        : kind === 'wake'
          ? start + DAY_MINUTES
          : start;
    const snapped = clampDialHandle(
      kind,
      target,
      start,
      endSnapped,
      undefined,
      COMMIT_SNAP_STEP,
    );
    startMinRef.current = snapped.start;
    endMinRef.current = snapped.end;
    pendingDraftRef.current = { start: snapped.start, end: snapped.end };
    setDraft({ start: snapped.start, end: snapped.end });
    emitIfChanged(snapped.start, snapped.end);
  }, [emitIfChanged]);

  const localFromEvent = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY, locationX, locationY } = e.nativeEvent;
    // page 좌표 + 측정된 origin이 가장 안정적 (레이아웃 갱신 후에도)
    if (
      Number.isFinite(pageX) &&
      Number.isFinite(pageY) &&
      (originRef.current.x !== 0 || originRef.current.y !== 0 || sizeRef.current > 0)
    ) {
      return {
        x: pageX - originRef.current.x,
        y: pageY - originRef.current.y,
      };
    }
    if (Number.isFinite(locationX) && Number.isFinite(locationY)) {
      return { x: locationX, y: locationY };
    }
    return null;
  }, []);

  const pickNearestHandle = useCallback((localX: number, localY: number) => {
    const center = sizeRef.current / 2;
    const midR = ringMidRRef.current;
    const startP = polarToCartesian(
      center,
      center,
      midR,
      cycleDisplayMinutes(startMinRef.current),
    );
    const endP = polarToCartesian(
      center,
      center,
      midR,
      cycleDisplayMinutes(endMinRef.current),
    );
    const wakeP = polarToCartesian(
      center,
      center,
      midR,
      cycleDisplayMinutes(startMinRef.current + DAY_MINUTES),
    );
    const dStart = (localX - startP.x) ** 2 + (localY - startP.y) ** 2;
    const dEnd = (localX - endP.x) ** 2 + (localY - endP.y) ** 2;
    const dWake = (localX - wakeP.x) ** 2 + (localY - wakeP.y) ** 2;
    if (dWake <= dStart && dWake <= dEnd) {
      handleKindRef.current = 'wake';
      return;
    }
    handleKindRef.current = dStart <= dEnd ? 'start' : 'end';
  }, []);

  const applyLocalPointRef = useRef(applyLocalPoint);
  const localFromEventRef = useRef(localFromEvent);
  const pickNearestHandleRef = useRef(pickNearestHandle);
  const measureOriginSyncRef = useRef(measureOriginSync);
  const commitDragRef = useRef(commitDrag);
  applyLocalPointRef.current = applyLocalPoint;
  localFromEventRef.current = localFromEvent;
  pickNearestHandleRef.current = pickNearestHandle;
  measureOriginSyncRef.current = measureOriginSync;
  commitDragRef.current = commitDrag;

  /** PanResponder는 마운트 시 1회만 — 핸들러는 ref로 최신 로직 참조 */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        draggingRef.current = true;
        lastHapticHourRef.current = null;
        onInteractionChangeRef.current?.(true);
        const { locationX, locationY } = e.nativeEvent;
        if (Number.isFinite(locationX) && Number.isFinite(locationY)) {
          pickNearestHandleRef.current(locationX, locationY);
          setActiveHandle(handleKindRef.current);
          applyLocalPointRef.current(locationX, locationY);
        }
        measureOriginSyncRef.current(() => {
          const pt = localFromEventRef.current(e);
          if (!pt) return;
          if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) {
            pickNearestHandleRef.current(pt.x, pt.y);
            setActiveHandle(handleKindRef.current);
          }
          applyLocalPointRef.current(pt.x, pt.y);
        });
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      },
      onPanResponderMove: (e) => {
        if (!draggingRef.current) return;
        const pt = localFromEventRef.current(e);
        if (!pt) return;
        applyLocalPointRef.current(pt.x, pt.y);
      },
      onPanResponderRelease: () => {
        draggingRef.current = false;
        lastHapticHourRef.current = null;
        if (draftFlushRafRef.current != null) {
          cancelAnimationFrame(draftFlushRafRef.current);
          draftFlushRafRef.current = null;
        }
        commitDragRef.current();
        setActiveHandle(null);
        onInteractionChangeRef.current?.(false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      },
      onPanResponderTerminate: () => {
        draggingRef.current = false;
        lastHapticHourRef.current = null;
        if (draftFlushRafRef.current != null) {
          cancelAnimationFrame(draftFlushRafRef.current);
          draftFlushRafRef.current = null;
        }
        commitDragRef.current();
        setActiveHandle(null);
        onInteractionChangeRef.current?.(false);
      },
    }),
  ).current;

  const onRootLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    // 측정값이 확정된 뒤에만 반영. 미세한 차이는 무시해 리사이즈 점프를 줄인다.
    if (w >= 200 && Math.abs(w - layoutW) > 4) {
      setLayoutW(w);
    }
    requestAnimationFrame(() => measureOriginSync());
  };

  const startLabel = formatHhmmClock(cycleMinutesToClockHhmm(startU, false), locale);
  const endClock = cycleMinutesToClockHhmm(endU, true);
  const endLabel = formatHhmmClock(
    endClock === '24:00' ? '00:00' : endClock,
    locale,
  );
  const resolvedBaseDateKey = baseDateKey?.trim() || getLocalDateKey();
  const endIsNextCalendarDay = cycleEndIsNextDay(endU);
  const startDateLabel = formatDateKeyCompact(resolvedBaseDateKey, locale);
  const endDateLabel = formatDateKeyCompact(
    endIsNextCalendarDay
      ? addDaysToLocalDateKey(resolvedBaseDateKey, 1)
      : resolvedBaseDateKey,
    locale,
  );
  const day0RingLabel = startDateLabel;
  const day1RingLabel = formatDateKeyCompact(
    addDaysToLocalDateKey(resolvedBaseDateKey, 1),
    locale,
  );
  const rangeSummaryText =
    endDateLabel === startDateLabel
      ? t('dayCycleDial.rangeSummarySameDay', {
          date: startDateLabel,
          start: startLabel,
          end: endLabel,
        })
      : t('dayCycleDial.rangeSummary', {
          startDate: startDateLabel,
          start: startLabel,
          endDate: endDateLabel,
          end: endLabel,
        });

  const dialBox = size + SOLID_SHADOW_OFFSET;

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: colors.ink }, cityPopFont('800')]}>
            {t('dayCycleDial.title')}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.dialShell, { width: dialBox, height: dialBox }]}>
        <View
          pointerEvents="none"
          style={[
            styles.dialShadow,
            {
              backgroundColor: colors.shadow,
              width: size,
              height: size,
              transform: [
                { translateX: SOLID_SHADOW_OFFSET },
                { translateY: SOLID_SHADOW_OFFSET },
              ],
            },
          ]}
        />
        <View
          ref={dialRef}
          collapsable={false}
          onLayout={() => measureOriginSync()}
          style={[
            styles.dialWrap,
            {
              width: size,
              height: size,
              backgroundColor: colors.dialTrack,
            },
          ]}
          {...panResponder.panHandlers}>
          <View
            pointerEvents="none"
            style={[
              styles.dialInnerArtClip,
              {
                width: outerR * 2,
                height: outerR * 2,
                borderRadius: outerR,
                left: cx - outerR,
                top: cy - outerR,
              },
            ]}>
            <Image
              source={DIAL_BACKDROP}
              style={[styles.dialInnerArt, { opacity: isDark ? 0.4 : 0.55 }]}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey="day-cycle-dial-inner"
              transition={0}
              accessibilityElementsHidden
            />
          </View>
          <Svg width={size} height={size} pointerEvents="none">
            <Circle
              cx={cx}
              cy={cy}
              r={outerR}
              stroke={colors.dialStroke}
              strokeWidth={RETRO_BORDER_WIDTH}
              fill="transparent"
            />
            {segmentPaths.map((seg) => (
              <Path
                key={`seg-${seg.kind}-${seg.startDisplay}`}
                d={seg.path}
                fill={
                  seg.kind === 'activity'
                    ? colors.activityFill
                    : seg.kind === 'sleep'
                      ? colors.sleepFill
                      : colors.restFill
                }
              />
            ))}
            {segmentPaths
              .filter((seg) => seg.kind === 'activity')
              .map((seg) => (
                <Path
                  key={`seg-stroke-${seg.startDisplay}`}
                  d={seg.path}
                  fill="none"
                  stroke={colors.dialStroke}
                  strokeWidth={RETRO_BORDER_WIDTH}
                />
              ))}
            <Circle
              cx={cx}
              cy={cy}
              r={innerR}
              fill={colors.centerBg}
              stroke={colors.dialStroke}
              strokeWidth={RETRO_BORDER_WIDTH}
            />

            <Line
              x1={activePos.x}
              y1={activePos.y}
              x2={cx}
              y2={cy}
              stroke={activeHandle === 'end' ? colors.endHandle : colors.startHandle}
              strokeWidth={RETRO_BORDER_WIDTH}
              strokeDasharray="4 4"
              opacity={activeHandle ? 1 : 0.55}
            />

            {HOUR_TICKS.map((h) => {
              const m = h * 60;
              const isMajor = MAJOR_HOURS.has(h);
              const isLabeled = LABEL_HOURS.has(h);
              const tip = polarToCartesian(cx, cy, outerR, m);
              const base = polarToCartesian(
                cx,
                cy,
                isMajor ? majorTickInner : minorTickInner,
                m,
              );
              const lab = polarToCartesian(cx, cy, labelR, m);
              const meridiem = cycleHourToMeridiem(h);
              const meridiemPos = meridiem
                ? polarToCartesian(cx, cy, meridiemR, m)
                : null;
              return (
                <G key={`tick-${h}`}>
                  <Line
                    x1={base.x}
                    y1={base.y}
                    x2={tip.x}
                    y2={tip.y}
                    stroke={colors.dialStroke}
                    strokeWidth={isMajor ? RETRO_BORDER_WIDTH : 1}
                    opacity={isMajor ? 1 : 0.55}
                  />
                  {isLabeled ? (
                    <>
                      <SvgText
                        x={lab.x}
                        y={lab.y}
                        fill={colors.ink}
                        fontSize={isMajor ? 12 : 10}
                        fontWeight="800"
                        textAnchor="middle"
                        alignmentBaseline="central"
                        dy={h === 0 ? 5 : h === 24 ? -4 : 3}>
                        {cycleHourToClockLabel(h)}
                      </SvgText>
                      {h === 0 || h === 24 ? (
                        <SvgText
                          x={lab.x}
                          y={lab.y}
                          fill={colors.muted}
                          fontSize={8}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="central"
                          dy={h === 0 ? -11 : 12}>
                          {h === 0 ? day0RingLabel : day1RingLabel}
                        </SvgText>
                      ) : null}
                      {meridiem && meridiemPos ? (
                        <SvgText
                          x={meridiemPos.x}
                          y={meridiemPos.y}
                          fill={colors.muted}
                          fontSize={8}
                          fontWeight="700"
                          textAnchor="middle"
                          alignmentBaseline="central">
                          {meridiem}
                        </SvgText>
                      ) : null}
                    </>
                  ) : null}
                </G>
              );
            })}

            {segmentPaths.map((seg) => {
              if (seg.kind === 'rest' || seg.span < 120) return null;
              const label = seg.kind === 'activity' ? activityDuration : sleepDuration;
              return (
                <SvgText
                  key={`arc-label-${seg.kind}-${seg.startDisplay}`}
                  x={seg.mid.x}
                  y={seg.mid.y}
                  fill={seg.kind === 'sleep' ? colors.sleepLabel : tone.primary}
                  fontSize={10}
                  fontWeight="800"
                  textAnchor="middle">
                  {label}
                </SvgText>
              );
            })}
          </Svg>

          {(() => {
            const startActive = activeHandle === 'start';
            const endActive = activeHandle === 'end';
            const wakeActive = activeHandle === 'wake';
            const startSize = handleR * 2 * (startActive ? 1.12 : 1);
            const endSize = handleR * 2 * (endActive ? 1.12 : 1);
            const wakeSize = handleR * 2 * (wakeActive ? 1.12 : 1);
            const iconSize = Math.round(handleR * 1.15);
            return (
              <>
                <DialHandleBadge
                  kind="sun"
                  size={startSize}
                  left={startPos.x - startSize / 2}
                  top={startPos.y - startSize / 2}
                  backgroundColor={colors.startHandle}
                  borderColor={colors.dialStroke}
                  iconColor={colors.startHandleIcon}
                  iconSize={iconSize}
                  active={startActive}
                />
                <DialHandleBadge
                  kind="sun"
                  size={wakeSize}
                  left={wakePos.x - wakeSize / 2}
                  top={wakePos.y - wakeSize / 2}
                  backgroundColor={colors.startHandle}
                  borderColor={colors.dialStroke}
                  iconColor={colors.startHandleIcon}
                  iconSize={iconSize}
                  active={wakeActive}
                />
                <DialHandleBadge
                  kind="moon"
                  size={endSize}
                  left={endPos.x - endSize / 2}
                  top={endPos.y - endSize / 2}
                  backgroundColor={colors.endHandle}
                  borderColor={colors.dialStroke}
                  iconColor={colors.endHandleIcon}
                  iconSize={iconSize}
                  active={endActive}
                />
              </>
            );
          })()}

          <View
            pointerEvents="none"
            style={[styles.centerCard, { width: innerR * 2 - 16, height: innerR * 2 - 16 }]}>
            <ThemedText
              style={[styles.centerKicker, { color: colors.muted }, cityPopFont('700')]}>
              {t('dayCycleDial.centerKicker')}
            </ThemedText>
            <ThemedText style={[styles.centerActivity, { color: colors.ink }, cityPopFont('800')]}>
              {t('dayCycleDial.centerActivity', { duration: activityDuration })}
            </ThemedText>
            <ThemedText
              style={[styles.centerSleep, { color: colors.sleepAccent }, cityPopFont('700')]}>
              {t('dayCycleDial.centerSleep', { duration: sleepDuration })}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.summaryShell, { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET }]}>
        <View
          pointerEvents="none"
          style={[
            styles.summaryShadow,
            {
              backgroundColor: colors.shadow,
              transform: [
                { translateX: SOLID_SHADOW_OFFSET },
                { translateY: SOLID_SHADOW_OFFSET },
              ],
            },
          ]}
        />
        <View
          style={[
            styles.summaryFace,
            { backgroundColor: colors.summaryBg },
          ]}>
          <ThemedText
            style={[styles.summaryCaption, { color: colors.ink }, cityPopFont('800')]}
            lightColor={colors.ink}
            darkColor={colors.ink}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.72}>
            {rangeSummaryText}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    width: '100%',
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.35,
  },
  dialShell: {
    position: 'relative',
  },
  dialShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dialWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialInnerArtClip: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 0,
  },
  dialInnerArt: {
    width: '100%',
    height: '100%',
  },
  centerCard: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 10,
  },
  centerKicker: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  centerActivity: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  centerSleep: {
    fontSize: 13,
  },
  summaryShell: {
    alignSelf: 'stretch',
    position: 'relative',
  },
  summaryShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  summaryFace: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  summaryCaption: {
    width: '100%',
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: -0.35,
  },
});
