import { ComicDayBoard, ComicSceneDetail } from './ComicDayBoard';
import { loadComicScenes, saveComicScene } from '../lib/comicSceneImages';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withDecay, Easing, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperControl } from '@shared/ui/paper-control';
import { PaperGrain } from '@shared/ui/paper-grain';
import { RoutineWheelAddButton } from '@shared/ui/routine-wheel-add-button';
import { ThemedText } from '@shared/ui/themed-text';
import { RhythmEmptyState } from './RhythmEmptyState';
import { OverlayRhythmCards } from './OverlayRhythmCards';
import {
  CIRCULAR_MIN_SECTOR_COUNT,
  circularFirstSectorDeg,
  circularSectorStepDeg,
  hitCircularWheelTap,
  orderCircularRoutines,
} from '../lib/circularRoutineLayout';

export type CircularRoutineItem = {
  key: string; label: string; icon: string; timeLabel?: string; dateKey?: string;
  startMinutes?: number; startsNextDay?: boolean; completed: boolean;
  faceColor?: string; inkColor?: string; summary?: string;
  /** 한 줄에 하나씩 나열. 칸보다 많으면 카드가 말줄임으로 자른다. */
  summaryLines?: readonly string[];
  /** 요약 아래에 항상 한 줄로 붙는 값. 체중 목표 등. */
  summaryFoot?: string;
};
type Props = {
  timeEnded?: boolean;
  presentation?: 'circle' | 'comic' | 'cards';
  items: CircularRoutineItem[]; ink: string; muted: string; isDark: boolean;
  renderDetail: (item: CircularRoutineItem) => ReactNode;
  onComplete: (key: string) => void;
  onFinish: (key: string, label: string) => void;
  onAdd: () => void;
  onSchedule?: () => void;
  onEditTime?: (key: string, label: string) => void;
};

function RoutineSector({ item, angle, radius, orbitRadius, rotation, ink, isDark, onPress, onComplete, onEditTime }: {
  item: CircularRoutineItem; angle: number; radius: number; orbitRadius: number; rotation: SharedValue<number>;
  isDark: boolean; ink: string; onPress: () => void; onComplete: () => void; onEditTime?: () => void;
}) {
  const { t } = useTranslation();
  const routineInk = item.inkColor ?? ink;
  const radians = angle * Math.PI / 180;
  const upright = useAnimatedStyle(() => ({ transform: [{ rotate: `${-rotation.value}deg` }] }));
  // Labels stay tappable for a11y; colored wedges are opened by the wheel Tap gesture (SVG Path onPress loses to Pan).
  return (
    <Animated.View style={[s.item, {
      left: radius + Math.cos(radians) * orbitRadius - 70,
      top: radius + Math.sin(radians) * orbitRadius - 58,
    }, upright]}>
      <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={onPress} style={s.itemMain}>
        <IconSymbol name={item.icon} size={32} color={routineInk} />
        <ThemedText numberOfLines={2} style={[s.itemTitle, { color: routineInk }]}>{item.label}</ThemedText>
      </Pressable>
      {onEditTime ? <Pressable accessibilityRole="button"
        accessibilityLabel={item.timeLabel ? t('todo.timeA11y', { time: item.timeLabel }) : t('dayPlan.timeUnsetA11y')}
        onPress={() => { tapHaptic(); onEditTime(); }} hitSlop={6} style={s.timeButton}>
        <IconSymbol name="clock" size={11} color={routineInk} />
        <ThemedText numberOfLines={1} style={[s.time, { color: routineInk }]}>{item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
      </Pressable> : item.timeLabel ? <ThemedText style={[s.time, { color: routineInk }]}>{item.timeLabel}</ThemedText> : null}
      <CompletionRadioButton checked={item.completed} isDark={isDark} size={25}
        appearance="ink" motion="gentle" uncheckedColor={isDark ? '#FAFAFA' : '#202020'}
        accessibilityLabel={item.label} onPress={onComplete} />
    </Animated.View>
  );
}

export function CircularRoutineTimetable({ items, ink, muted, isDark, renderDetail, onComplete, onFinish, onAdd, onSchedule, onEditTime, presentation = 'circle', timeEnded = false }: Props) {
  const [reviewEnded, setReviewEnded] = useState(false);
  const showEmpty = items.length === 0 || (timeEnded && !reviewEnded);
  const [sceneChoices, setSceneChoices] = useState(loadComicScenes);
  const { t } = useTranslation();
  const [size, setSize] = useState({ width: 340, height: 600 });
  const rootRef = useRef<View>(null);
  const keyboardResizing = useRef(false);
  const updateSize = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }, []);
  useEffect(() => {
    let frame: number | undefined;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      keyboardResizing.current = true;
      if (frame !== undefined) cancelAnimationFrame(frame);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      // Wait until the keyboard-avoiding parent has restored its final bounds.
      frame = requestAnimationFrame(() => {
        keyboardResizing.current = false;
        rootRef.current?.measure((_x, _y, width, height) => updateSize(width, height));
      });
    });
    return () => { show.remove(); hide.remove(); if (frame !== undefined) cancelAnimationFrame(frame); };
  }, [updateSize]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = items.find(item => item.key === selectedKey);
  const rotation = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const drawer = useSharedValue(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ordered = orderCircularRoutines(items);
  // 12 slots → 30° wedges so about six routines sit in the visible right semicircle.
  const count = Math.max(CIRCULAR_MIN_SECTOR_COUNT, ordered.length);
  // A larger wheel keeps each sector readable even when many routines are added.
  const radius = Math.max(size.width - 16, count * 28);
  // Fit the full semicircle within both available width and height on every phone.
  const visibleRadius = Math.max(1, Math.min(size.width - 16, size.height / 2));
  const wheelScale = visibleRadius / radius;
  const orbitRadius = Math.max(0, Math.min(
    radius - 100,
    (size.height / 2 - 20) / wheelScale - 58,
  ));
  const step = circularSectorStepDeg(count);
  const firstSector = circularFirstSectorDeg(count);
  const close = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    Keyboard.dismiss();
    drawer.set(withTiming(0, { duration: 220 }));
    closeTimer.current = setTimeout(() => setSelectedKey(null), 220);
  }, [drawer]);
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!selected) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => listener.remove();
  }, [selected, close]);
  // Start only after the newly mounted drawer has painted at its off-screen position.
  useEffect(() => {
    if (!selectedKey) return;
    let animationFrame: number | undefined;
    const mountFrame = requestAnimationFrame(() => {
      animationFrame = requestAnimationFrame(() => {
        drawer.set(withTiming(1, { duration: 360, easing: Easing.bezier(0.22, 0.61, 0.36, 1) }));
      });
    });
    return () => {
      cancelAnimationFrame(mountFrame);
      if (animationFrame != null) cancelAnimationFrame(animationFrame);
    };
  }, [selectedKey, drawer]);
  const openDetail = useCallback((key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    cancelAnimation(rotation);
    drawer.set(0);
    setSelectedKey(key);
  }, [drawer, rotation]);
  const handleWheelTap = useCallback((x: number, y: number, rotationDeg: number) => {
    const hit = hitCircularWheelTap({
      x, y, rotationDeg,
      viewportHeight: size.height,
      count,
      orbitRadius,
      wheelScale,
      visibleRadius,
    });
    if (!hit) return;
    const item = ordered[hit.index];
    if (!item) return;
    if (hit.kind === 'complete') {
      tapHaptic();
      onComplete(item.key);
      return;
    }
    if (hit.kind === 'time') {
      if (!onEditTime) {
        tapHaptic();
        openDetail(item.key);
        return;
      }
      tapHaptic();
      onEditTime(item.key, item.label);
      return;
    }
    tapHaptic();
    openDetail(item.key);
  }, [count, onComplete, onEditTime, openDetail, ordered, orbitRadius, size.height, visibleRadius, wheelScale]);
  const wheelGesture = useMemo(() => {
    const tap = Gesture.Tap()
      .enabled(!selected && !showEmpty)
      .maxDistance(14)
      .maxDuration(450)
      // Gesture callbacks run after touch events, never during render.
      // eslint-disable-next-line react-hooks/refs
      .onBegin(() => { cancelAnimation(rotation); })
      // eslint-disable-next-line react-hooks/refs
      .onEnd((event, success) => {
        if (!success) return;
        runOnJS(handleWheelTap)(event.x, event.y, rotation.value);
      });
    const pan = Gesture.Pan()
      .enabled(!selected && !showEmpty)
      .minDistance(16)
      // eslint-disable-next-line react-hooks/refs
      .onBegin(() => { cancelAnimation(rotation); })
      // eslint-disable-next-line react-hooks/refs
      .onStart(() => { dragStart.value = rotation.value; })
      // eslint-disable-next-line react-hooks/refs
      .onUpdate(event => { rotation.value = dragStart.value + event.translationY / (radius * wheelScale) * 100; })
      // eslint-disable-next-line react-hooks/refs
      .onEnd(event => { rotation.value = withDecay({ velocity: event.velocityY / (radius * wheelScale) * 100, deceleration: 0.995 }); });
    // Tap first so a short press opens a sector instead of being claimed by Pan.
    return Gesture.Exclusive(tap, pan);
  }, [dragStart, handleWheelTap, radius, rotation, selected, showEmpty, wheelScale]);
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }, { scale: wheelScale }] }));
  const drawerStyle = useAnimatedStyle(() => ({ transform: [{ translateX: (1 - drawer.value) * size.width }] }));
  const dismissGesture = Gesture.Pan().runOnJS(true).activeOffsetX(15).failOffsetY([-20, 20])
    // Gesture Handler invokes this callback after a gesture, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onEnd(event => { if (event.translationX > 45 || event.velocityX > 400) close(); });
  const paper = isDark ? '#262B28' : '#FFFFFF';
  // Match the paper sampled from each original illustration, including its warm tone.
  const wheelPaper = isDark ? paper : timeEnded ? '#F2F0EC' : '#F1F1ED';
  return (
    <View ref={rootRef} testID="circular-timetable-root" style={[s.root, { backgroundColor: isDark ? '#262B28' : '#F7F6F4' }]} onLayout={event => { if (keyboardResizing.current || Keyboard.isVisible()) return; const { width, height } = event.nativeEvent.layout; updateSize(width, height); }}>
      {presentation === 'comic' ? <ComicDayBoard items={ordered} ink={ink} muted={muted} isDark={isDark} choices={sceneChoices} onOpen={openDetail} onComplete={onComplete} onAdd={onAdd} onEditTime={onEditTime} /> : presentation === 'cards' ? <OverlayRhythmCards items={ordered} width={size.width} height={size.height} ink={ink} muted={muted} isDark={isDark} renderDetail={renderDetail} onComplete={onComplete} onExcludeFromToday={onFinish} onAdd={onAdd} onSchedule={onSchedule} onEditTime={onEditTime} /> : <>
      <GestureDetector gesture={wheelGesture}>
        <View style={s.viewport}>
          <Animated.View style={[{ position: 'absolute', width: radius * 2, height: radius * 2, left: -radius, top: size.height / 2 - radius }, wheelStyle]}>
            <Svg width={radius * 2} height={radius * 2} pointerEvents="none">
              <Circle cx={radius} cy={radius} r={radius - 2} fill={wheelPaper} stroke={muted} strokeWidth={1} />
              {!showEmpty && ordered.map((item, index) => {
                const start = (firstSector + index * step - step / 2) * Math.PI / 180;
                const end = start + step * Math.PI / 180;
                const x = radius + Math.cos(start) * (radius - 2);
                const y = radius + Math.sin(start) * (radius - 2);
                return <Path key={item.key} d={`M${radius} ${radius} L${x} ${y} A${radius - 2} ${radius - 2} 0 0 1 ${radius + Math.cos(end) * (radius - 2)} ${radius + Math.sin(end) * (radius - 2)} Z`} fill={item.faceColor ?? 'transparent'} accessibilityLabel={item.label} stroke={muted} strokeOpacity={0.35} strokeWidth={0.7} />;
              })}
            </Svg>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
              <PaperGrain opacity={0.22} />
            </View>
            {!showEmpty && ordered.map((item, index) => <RoutineSector key={item.key} item={item} angle={firstSector + index * step} radius={radius} orbitRadius={orbitRadius} rotation={rotation} ink={ink} isDark={isDark} onEditTime={onEditTime ? () => onEditTime(item.key, item.label) : undefined} onComplete={() => onComplete(item.key)} onPress={() => { tapHaptic(); openDetail(item.key); }} />)}
          </Animated.View>
        </View>
      </GestureDetector>
      {showEmpty ? <View style={[s.emptyState, { width: visibleRadius, top: size.height / 2 - Math.min(140, size.height * 0.3) }]}>
        <RhythmEmptyState ended={timeEnded} ink={ink} muted={muted} />
      </View> : null}
      {timeEnded && items.length > 0 ? <PaperControl accessibilityRole="button" accessibilityLabel={t(reviewEnded ? 'dayPlan.rhythmShowClosing' : 'dayPlan.rhythmReview')} onPress={() => { tapHaptic(); setReviewEnded(value => !value); }} style={[s.review, { backgroundColor: '#FFFFFF' }]}>
        <Svg width={26} height={26} viewBox="0 0 28 28" accessible={false}><Path d="M5 7L21 6L22 22L5 23ZM9 4L24 4L25 19M8 11L18 10M8 15L18 14M8 19L15 18" fill="none" stroke="#343434" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
      </PaperControl> : null}
      <RoutineWheelAddButton label={t('dayPlan.addMoreRoutine')} onPress={onAdd} style={s.add} invite={items.length === 0 && !timeEnded} />
      </>}
      {selected ? <>
        <Pressable style={[StyleSheet.absoluteFill, { zIndex: 2, backgroundColor: presentation === 'comic' ? 'rgba(0,0,0,0.12)' : 'transparent' }]} onPress={() => { tapHaptic(); close(); }} accessibilityLabel={t('common.close')} />
        <Animated.View accessibilityViewIsModal style={[s.drawer, { backgroundColor: selected.faceColor ?? paper }, drawerStyle]}>
          <PaperGrain />
          <GestureDetector gesture={dismissGesture}>
          <View style={s.drawerHead}>
            <ThemedText style={[s.drawerTitle, { color: selected.inkColor ?? ink }]}>{selected.label}</ThemedText>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.closeButton} hitSlop={8} onPress={() => { tapHaptic(); close(); }}><ThemedText style={{ color: selected.inkColor ?? ink, fontSize: 26 }}>×</ThemedText></Pressable>
          </View>
          </GestureDetector>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.detail}>
            {presentation === 'comic' ? <ComicSceneDetail item={selected} ink={selected.inkColor ?? ink} muted={muted} choices={sceneChoices} onChoose={id => setSceneChoices(saveComicScene(selected.key, id))} onEditTime={onEditTime} /> : null}
            {renderDetail(selected)}</ScrollView>
          <View style={[s.drawerFooter, presentation === 'comic' && { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            {presentation === 'comic' ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><CompletionRadioButton checked={selected.completed} isDark={isDark} size={25} appearance="ink" motion="gentle" accessibilityLabel={selected.label} onPress={() => onComplete(selected.key)} /><ThemedText style={{ color: selected.inkColor ?? ink, fontSize: 13 }}>{t('comicDay.complete')}</ThemedText></View> : null}
            <PaperControl
              accessibilityRole="button"
              hitSlop={8}
              accessibilityLabel={t('dayPlan.endTodayA11y', { label: selected.label })}
              onPress={() => { tapHaptic(); onFinish(selected.key, selected.label); }}
              style={[s.detailFinish, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.55)' : '#000000' }]}>
              <ThemedText numberOfLines={1} style={{ color: isDark ? '#FAFAFA' : '#000000', fontSize: 12, fontWeight: '800', letterSpacing: -0.2 }}>
                {t('dayPlan.endTodayConfirm')}
              </ThemedText>
            </PaperControl>
          </View>
        </Animated.View>
      </> : null}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  viewport: { flex: 1, overflow: 'hidden' },
  item: { position: 'absolute', width: 140, height: 116, alignItems: 'center', justifyContent: 'center' },
  itemMain: { alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  itemTitle: { fontSize: 16, textAlign: 'center', lineHeight: 21 },
  time: { fontSize: 12 },
  timeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 3 },
  emptyState: { position: 'absolute', left: 0 },
  review: { position: 'absolute', bottom: 14, right: 74, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  add: { position: 'absolute', bottom: 14, right: 14 },
  closeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  drawer: { zIndex: 3, position: 'absolute', top: 0, bottom: 0, right: 0, width: '90%', borderLeftWidth: StyleSheet.hairlineWidth, borderColor: '#9CA79B', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  drawerHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  drawerTitle: { flex: 1, fontSize: 20 },
  detail: { paddingHorizontal: 16, paddingBottom: 24 },
  drawerFooter: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  detailFinish: { minWidth: 44, height: 28, borderRadius: 0, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, zIndex: 1 },
});
