import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, scrollTo, withTiming, type SharedValue } from 'react-native-reanimated';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import Svg, { Path } from 'react-native-svg';

import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperControl } from '@shared/ui/paper-control';
import { PaperGrain } from '@shared/ui/paper-grain';
import { RoutineWheelAddButton } from '@shared/ui/routine-wheel-add-button';
import { HeaderIcon } from '@shared/ui/header-icon';
import { ThemedText } from '@shared/ui/themed-text';
import type { CircularRoutineItem } from './CircularRoutineTimetable';
import { RhythmEmptyState } from './RhythmEmptyState';
import { rhythmCardDate } from '../lib/rhythmCardDate';
import { overlayCardPose, overlayDeckFrame, overlayDeckLayout, loopDeckIndex, overviewCardLayout, visibleDeckProgress } from '../lib/overlayCardDeck';

/** 카드 루틴 시간 UI — false면 표시·편집만 숨기고 하위 콜백·저장 로직은 유지 */
const SHOW_CARD_ROUTINE_TIME = FEATURE_FLAGS.cardRoutineTimeEdit;

type CardOrigin = { left: number; top: number; width: number; height: number };
/** 면색 미지정 — 포스트잇 기본값 white (`#FFFFFF` / 다크 `#3A3C52`) */
function cardColors(item: CircularRoutineItem, _slot: number, isDark: boolean) {
  return {
    paper: item.faceColor ?? (isDark ? '#3A3C52' : '#FFFFFF'),
    ink: item.inkColor ?? (isDark ? '#FAFAF6' : '#20384A'),
  };
}

function CardDate({ dateKey, ink, scale = 1, compact = false }: { dateKey?: string; ink: string; scale?: number; compact?: boolean }) {
  const date = rhythmCardDate(dateKey);
  if (!date) return null;
  return <View accessible accessibilityLabel={dateKey} style={s.cardDate}>
    <ThemedText accessible={false} numberOfLines={1} style={{ color: ink, fontSize: (compact ? 24 : 44) * scale, lineHeight: (compact ? 27 : 48) * scale }}>{date.day}</ThemedText>
    <ThemedText accessible={false} numberOfLines={1} style={{ color: ink, fontSize: (compact ? 8 : 12) * scale, lineHeight: (compact ? 12 : 17) * scale }}>{date.monthYear}</ThemedText>
  </View>;
}

function OverlayCard({ item, index, colorSlot, width, height, progress, mountedWindow, active, onPress, isDark }: {
  item: CircularRoutineItem; index: number; colorSlot: number; width: number; height: number; progress: SharedValue<number>; mountedWindow: number; active: boolean;
  onPress: () => void; isDark: boolean;
}) {
  const { t } = useTranslation();
  const { cardWidth, cardHeight, scale } = overlayDeckLayout(width, height);
  const motion = useAnimatedStyle(() => {
    const pose = overlayDeckFrame(index - visibleDeckProgress(progress.get(), mountedWindow), width, Math.max(1, height - 96));
    return { left: pose.left, top: pose.top, opacity: pose.opacity, zIndex: pose.zIndex,
      elevation: Math.max(1, pose.zIndex / 3), transform: [{ scale: pose.scale }] };
  });
  const contentMotion = useAnimatedStyle(() => ({ opacity: overlayCardPose(index - visibleDeckProgress(progress.get(), mountedWindow)).contentOpacity }));
  const colors = cardColors(item, colorSlot, isDark);
  const hasSummary = !!item.summary?.trim();
  return <Animated.View testID={`rhythm-card-${item.key}`} style={[s.card, {
    width: cardWidth, height: cardHeight,
    borderRadius: 12 * scale, backgroundColor: colors.paper,
  }, motion]} pointerEvents={active ? 'auto' : 'none'} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 12 * scale, overflow: 'hidden' }]}>
      <PaperGrain opacity={0.2} />
    </View>
    <Animated.View style={[s.body, contentMotion]}>
    <Pressable disabled={!active} accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={t('dayPlan.cardOpenHint')} onPress={onPress} style={[s.body, { padding: 30 * scale }]}>
      <View style={s.cardHead}><IconSymbol name={item.icon} size={(hasSummary ? 100 : 140) * scale} color={colors.ink} /><CardDate dateKey={item.dateKey} ink={colors.ink} scale={scale} /></View>
      <ThemedText numberOfLines={2} adjustsFontSizeToFit style={{ color: colors.ink, fontSize: (hasSummary ? 30 : 42) * scale, lineHeight: (hasSummary ? 37 : 51) * scale, marginTop: (hasSummary ? 23 : 30) * scale }}>{item.label}</ThemedText>
      {SHOW_CARD_ROUTINE_TIME ? (
        <View style={[s.time, { marginTop: 16 * scale }]}>
          <IconSymbol name="clock" size={19 * scale} color={colors.ink} />
          <ThemedText numberOfLines={1} style={{ color: colors.ink, fontSize: 20 * scale, lineHeight: 27 * scale }}>{item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
        </View>
      ) : null}
      {hasSummary ? <ThemedText numberOfLines={3} style={{ color: colors.ink, fontSize: 22 * scale, lineHeight: 31 * scale, marginTop: 17 * scale }}>{item.summary}</ThemedText> : null}
    </Pressable>
    </Animated.View>
  </Animated.View>;
}

function OverviewCardMotion({ progress, index, width, height, children }: {
  progress: SharedValue<number>; index: number; width: number; height: number; children: ReactNode;
}) {
  const motion = useAnimatedStyle(() => {
    const delay = Math.min(0.18, index * 0.025);
    const p = Math.max(0, Math.min(1, (progress.get() - delay) / (1 - delay)));
    return { opacity: p, transform: [{ translateY: 24 * (1 - p) }, { scale: 0.96 + 0.04 * p }] };
  });
  return <Animated.View style={[{ width, height }, motion]}>{children}</Animated.View>;
}

function RhythmCardOverview({ items, width, height, isDark, enabled, progress, onOpen, onExclude }: {
  items: CircularRoutineItem[]; width: number; height: number; isDark: boolean; enabled: boolean; progress: SharedValue<number>;
  onOpen: (item: CircularRoutineItem, slot: number, origin: CardOrigin) => void;
  onExclude?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const offset = useRef(0);
  const { columns, cardWidth, cardHeight } = overviewCardLayout(width, height, items.length);
  return <ScrollView testID="rhythm-card-overview" scrollEnabled={enabled} showsVerticalScrollIndicator={false} contentContainerStyle={s.overviewContent} scrollEventThrottle={16} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; }}>
    {items.map((item, index) => {
      const colors = cardColors(item, index % 3, isDark);
      const hasSummary = !!item.summary?.trim();
      return <OverviewCardMotion key={item.key} progress={progress} index={index} width={cardWidth} height={cardHeight}><Pressable testID={`rhythm-grid-card-${item.key}`} accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={t('dayPlan.cardOpenHint')}
        onPress={() => {
          tapHaptic();
          onOpen(item, index % 3, { left: 14 + (index % columns) * (cardWidth + 8), top: OVERVIEW_PAD_TOP + Math.floor(index / columns) * (cardHeight + 8) - offset.current, width: cardWidth, height: cardHeight });
        }}
        delayLongPress={480}
        onLongPress={onExclude ? () => { tapHaptic('warn'); onExclude(item.key, item.label); } : undefined}
        style={({ pressed }) => [s.overviewCard, { width: cardWidth, height: cardHeight, backgroundColor: colors.paper, opacity: pressed ? 0.8 : 1 }]}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 9, overflow: 'hidden' }]}>
          <PaperGrain opacity={0.2} />
        </View>
        <View style={s.cardHead}><IconSymbol name={item.icon} size={Math.min(hasSummary ? 48 : 64, cardWidth * (hasSummary ? 0.3 : 0.4))} color={colors.ink} /><CardDate dateKey={item.dateKey} ink={colors.ink} compact /></View>
        <ThemedText numberOfLines={hasSummary ? 1 : 2} adjustsFontSizeToFit style={{ color: colors.ink, fontSize: Math.min(hasSummary ? 18 : 24, cardWidth * (hasSummary ? 0.12 : 0.17)), lineHeight: hasSummary ? 22 : 28, marginTop: hasSummary ? 7 : 12 }}>{item.label}</ThemedText>
        {SHOW_CARD_ROUTINE_TIME ? (
          <View style={[s.time, { marginTop: 5 }]}><IconSymbol name="clock" size={10} color={colors.ink} /><ThemedText numberOfLines={1} style={{ color: colors.ink, fontSize: 10, lineHeight: 14, flexShrink: 1 }}>{item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText></View>
        ) : null}
        {hasSummary ? <ThemedText numberOfLines={2} style={{ color: colors.ink, fontSize: 11, lineHeight: 15, marginTop: 7 }}>{item.summary}</ThemedText> : null}
      </Pressable></OverviewCardMotion>;
    })}
  </ScrollView>;
}

function ExpandedRhythmCard({ item, slot, origin, width, height, isDark, renderDetail, onClose, onComplete, onEditTime }: {
  item: CircularRoutineItem; slot: number; origin: CardOrigin; width: number; height: number; isDark: boolean;
  renderDetail: (item: CircularRoutineItem) => ReactNode; onClose: () => void; onComplete: (key: string) => void;
  onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  const closing = useRef(false);
  const closingMotion = useSharedValue(0);
  const colors = cardColors(item, slot, isDark);
  const panelWidth = Math.max(1, width - 32), panelHeight = Math.max(1, height - 24);
  useEffect(() => {
    progress.set(withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(progress);
  }, [progress]);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    closingMotion.set(1);
    Keyboard.dismiss();
    progress.set(withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }, finished => { if (finished) runOnJS(onClose)(); }));
  }, [progress, closingMotion, onClose]);
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => listener.remove();
  }, [close]);
  const frame = useAnimatedStyle(() => {
    const p = progress.get();
    // Opening keeps the paper opaque while it grows; closing shrinks and fades it with its content
    // so an empty panel never lingers.
    return { opacity: closingMotion.get() ? Math.min(1, p / 0.7) : 1, transform: [
      { translateX: (1 - p) * (origin.left + origin.width / 2 - width / 2) },
      { translateY: (1 - p) * (origin.top + origin.height / 2 - height / 2) },
      { scaleX: origin.width / panelWidth + (1 - origin.width / panelWidth) * p },
      { scaleY: origin.height / panelHeight + (1 - origin.height / panelHeight) * p },
    ] };
  });
  const dim = useAnimatedStyle(() => ({ opacity: progress.get() * 0.14 }));
  const content = useAnimatedStyle(() => {
    const p = progress.get();
    if (closingMotion.get()) return { opacity: Math.min(1, p / 0.7) };
    return { opacity: Math.min(1, Math.max(0, (p - 0.34) / 0.5)) };
  });
  return <View testID="rhythm-card-detail-overlay" style={s.overlay} accessibilityViewIsModal>
    <Animated.View pointerEvents="none" style={[s.scrim, dim]} />
    <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={close} />
    <Animated.View testID="rhythm-card-detail-panel" style={[s.expanded, { backgroundColor: colors.paper }, frame]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}>
        <PaperGrain opacity={0.2} />
      </View>
      <Animated.View style={[s.expandedContent, content]}>
        <View style={s.detailHead}>
          <IconSymbol name={item.icon} size={46} color={colors.ink} />
          <View style={s.detailTitleBlock}>
            <ThemedText style={[s.detailTitle, { color: colors.ink }]} numberOfLines={2}>{item.label}</ThemedText>
            {SHOW_CARD_ROUTINE_TIME ? (
              <Pressable accessibilityRole="button" disabled={!onEditTime} accessibilityLabel={item.timeLabel ? t('todo.timeA11y', { time: item.timeLabel }) : t('dayPlan.timeUnsetA11y')} onPress={() => { tapHaptic(); onEditTime?.(item.key, item.label); }} style={s.detailTime}>
                <IconSymbol name="clock" size={15} color={colors.ink} />
                <ThemedText style={{ color: colors.ink, fontSize: 14 }}>{item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
                {onEditTime ? <IconSymbol name="pencil" size={15} color={colors.ink} /> : null}
              </Pressable>
            ) : null}
          </View>
          <CardDate dateKey={item.dateKey} ink={colors.ink} compact />
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={s.closeHit}><ThemedText style={{ color: colors.ink, fontSize: 28 }}>×</ThemedText></Pressable>
        </View>
        <ScrollView testID="rhythm-card-detail-scroll" keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={s.detailBody}>
          {renderDetail({ ...item, faceColor: colors.paper, inkColor: colors.ink })}
        </ScrollView>
        <View style={s.detailFooter}>
          <View style={s.complete}>
            <CompletionRadioButton checked={item.completed} isDark={isDark} size={25} appearance="ink" motion="gentle" uncheckedColor={colors.ink} accessibilityLabel={t(item.completed ? 'dayPlan.completeCancelA11y' : 'dayPlan.completeA11y', { label: item.label })} onPress={() => onComplete(item.key)} />
            <ThemedText style={{ color: colors.ink, fontSize: 13 }}>{t('common.complete')}</ThemedText>
          </View>
          <PaperControl accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={s.closeButton}><ThemedText style={{ color: colors.ink, fontSize: 14 }}>{t('common.close')}</ThemedText></PaperControl>
        </View>
      </Animated.View>
    </Animated.View>
  </View>;
}

/** One tap brings a card forward and expands it; closing restores its original slot. */
export function OverlayRhythmCards({ items, width, height, ink, muted, isDark, renderDetail, onComplete, onExcludeFromToday, onAdd, onSchedule, onEditTime }: {
  items: CircularRoutineItem[]; width: number; height: number; ink: string; muted: string; isDark: boolean;
  renderDetail: (item: CircularRoutineItem) => ReactNode; onComplete: (key: string) => void;
  onExcludeFromToday?: (key: string, label: string) => void;
  onAdd: () => void;
  onSchedule?: () => void;
  onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const [overviewRequested, setOverview] = useState(false);
  const [overviewMounted, setOverviewMounted] = useState(false);
  const overview = overviewRequested && items.length > 0;
  const overviewProgress = useSharedValue(0);
  useEffect(() => {
    overviewProgress.set(withTiming(overview ? 1 : 0, { duration: overview ? 480 : 380, easing: Easing.bezier(0.22, 0.61, 0.36, 1) }));
    return () => cancelAnimation(overviewProgress);
  }, [overview, overviewProgress]);
  const deckVisibility = useAnimatedStyle(() => ({ opacity: 1 - overviewProgress.get(), transform: [{ scale: 1 - overviewProgress.get() * 0.025 }] }));
  const gridVisibility = useAnimatedStyle(() => ({ opacity: overviewProgress.get() }));
  const count = items.length;
  const looping = count > 1;
  const initialWindow = looping ? count : 0;
  const [windowStart, setWindowStart] = useState(initialWindow);
  const deckScroll = useAnimatedRef<ScrollView>();
  const progress = useSharedValue(initialWindow);
  const reportedWindow = useSharedValue(initialWindow);
  const scrollBias = useSharedValue(0);
  const syncGeneration = useSharedValue(0);
  const currentGeneration = useRef(0);
  const [expanded, setExpanded] = useState<{ key: string; slot: number; origin: CardOrigin } | null>(null);
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);

  // Reserve the lower strip for rhythm selection.
  const stageHeight = Math.max(1, height - 96);
  const { cardWidth, cardHeight } = overlayDeckLayout(width, stageHeight);
  // The detail panel can shrink for the keyboard; the card stack keeps its original geometry.
  const step = Math.max(150, width * 0.42);
  const pickerShift = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.max(0, width - 24) / 2 - PICKER_BUTTON / 2 - progress.get() * PICKER_STRIDE }],
  }), [width]);
  const [initialOffset] = useState(() => ({ x: initialWindow * step, y: 0 }));
  const nativeOffset = useSharedValue(initialWindow * step);
  // Start in the middle copy, leaving a complete cycle on either side for seamless swipes.
  const maxStart = looping ? count * 3 : 0;
  const safeStart = looping ? windowStart : 0;
  const updateWindow = useCallback((next: number, generation: number) => {
    if (generation === currentGeneration.current) setWindowStart(next);
  }, []);
  const recenter = (offset: number) => {
    'worklet';
    if (!looping || Math.abs(offset - nativeOffset.get()) > 1) return;
    const next = offset / step;
    if (next >= count && next < count * 2) return;
    const centered = loopDeckIndex(next, count) + count;
    // Keep virtual card positions unchanged while only the native scroll offset recenters.
    // This avoids remounting images or flashing an empty frame between cycles.
    scrollBias.set(scrollBias.get() + next - centered);
    nativeOffset.set(centered * step);
    scrollTo(deckScroll, centered * step, 0, false);
  };
  const onScroll = useAnimatedScrollHandler({
    onScroll: event => {
      nativeOffset.set(event.contentOffset.x);
      const next = Math.max(0, Math.min(maxStart, event.contentOffset.x / step));
      const virtualPosition = next + scrollBias.get();
      progress.set(virtualPosition);
      const nextWindow = Math.floor(virtualPosition);
      if (reportedWindow.get() !== nextWindow) {
        reportedWindow.set(nextWindow);
        runOnJS(updateWindow)(nextWindow, syncGeneration.get());
      }
      // A very long fling can cross both buffer copies before momentum ends.
      if (looping && (next <= 0 || next >= maxStart)) recenter(event.contentOffset.x);
    },
    onMomentumEnd: event => recenter(event.contentOffset.x),
    onEndDrag: event => {
      const position = event.contentOffset.x / step;
      if (Math.abs(event.velocity?.x ?? 1) < 0.01 && Math.abs(position - Math.round(position)) < 0.001) recenter(event.contentOffset.x);
    },
  });
  useLayoutEffect(() => {
    // Synchronize native offset, UI-thread progress and React's mounted window together.
    // No native scroll event is guaranteed when a hidden tab/layout or item count changes.
    const rawProgress = progress.get();
    const virtualPosition = looping
      ? (Number.isFinite(rawProgress) && rawProgress > 0 ? rawProgress : count)
      : 0;
    const centered = looping ? loopDeckIndex(virtualPosition, count) + count : 0;
    const generation = ++currentGeneration.current;
    syncGeneration.set(generation);
    scrollBias.set(virtualPosition - centered);
    progress.set(virtualPosition);
    reportedWindow.set(Math.floor(virtualPosition));
    nativeOffset.set(centered * step);
    // An external native/UI-thread reset must update the mounted range before paint.
    // Native scroll state must be synchronized before the next card window paints.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWindowStart(Math.floor(virtualPosition));
    deckScroll.current?.scrollTo({ x: centered * step, animated: false });
  }, [count, looping, progress, scrollBias, reportedWindow, nativeOffset, syncGeneration, deckScroll, step]);
  const firstMounted = looping ? safeStart - 1 : 0;
  const mounted = Array.from({ length: looping ? 6 : count }, (_, offset) => {
    const index = firstMounted + offset;
    const itemIndex = loopDeckIndex(index, count);
    return { item: items[itemIndex], index, itemIndex };
  });
  const selected = expanded ? items.find(item => item.key === expanded.key) : undefined;
  const opening = useRef(false);
  // React commits from the overlay can leave animated card/picker styles at their mount-time
  // values. Remounting them after the overlay closes recomputes every pose from `progress`.
  const [deckEpoch, setDeckEpoch] = useState(0);
  const close = useCallback(() => { opening.current = false; setExpanded(null); setDeckEpoch(value => value + 1); }, []);
  const openCard = (index: number) => {
    if (opening.current || overview || !count) return;
    const pose = overlayDeckFrame(index - visibleDeckProgress(progress.get(), safeStart), width, stageHeight);
    if (pose.contentOpacity < 0.5) return;
    const itemIndex = loopDeckIndex(index, count);
    opening.current = true;
    tapHaptic();
    const nativeX = (progress.get() - scrollBias.get()) * step;
    if (Math.abs(nativeOffset.get() - nativeX) > 1) deckScroll.current?.scrollTo({ x: nativeX, animated: false });
    setExpanded({ key: items[itemIndex].key, slot: itemIndex % 3, origin: {
      left: pose.left + cardWidth * (1 - pose.scale) / 2,
      top: pose.top + cardHeight * (1 - pose.scale) / 2,
      width: cardWidth * pose.scale, height: cardHeight * pose.scale,
    } });
  };
  // Hit-test in viewport coordinates: native sticky headers can retain their old
  // responder bounds after the looping scroll offset has been recentered.
  const cardIndexAt = (x: number, y: number) => {
    const position = visibleDeckProgress(progress.get(), safeStart);
    for (const { index } of mounted) {
      const pose = overlayDeckFrame(index - position, width, stageHeight);
      if (pose.contentOpacity < 0.5) continue;
      const left = pose.left + cardWidth * (1 - pose.scale) / 2;
      const top = pose.top + cardHeight * (1 - pose.scale) / 2;
      if (x >= left && x <= left + cardWidth * pose.scale && y >= top && y <= top + cardHeight * pose.scale) return index;
    }
    return null;
  };
  const tapCardAt = (x: number, y: number) => {
    const index = cardIndexAt(x, y);
    if (index != null) openCard(index);
  };
  const excludeCardAt = (x: number, y: number) => {
    const index = cardIndexAt(x, y);
    if (index == null || !onExcludeFromToday) return;
    const item = items[loopDeckIndex(index, count)];
    if (!item) return;
    tapHaptic('warn');
    onExcludeFromToday(item.key, item.label);
  };
  // This callback is invoked only by the native gesture after the render completes.
  const cardTap = Gesture.Tap().enabled(!overview && !selected && count > 0).maxDistance(10).maxDuration(350)
    // eslint-disable-next-line react-hooks/refs
    .onEnd((event, success) => { if (success) runOnJS(tapCardAt)(event.x, event.y); });
  const cardLongPress = Gesture.LongPress().enabled(!overview && !selected && count > 0 && !!onExcludeFromToday).minDuration(480).maxDistance(14)
    // eslint-disable-next-line react-hooks/refs
    .onStart(event => { runOnJS(excludeCardAt)(event.x, event.y); });
  // Keep vertical deck navigation alongside the horizontal card swipe. The
  // horizontal scroll view wins horizontal drags; vertical drags advance one card.
  const verticalSwipe = Gesture.Pan().enabled(!overview && !selected && looping)
    .activeOffsetY([-10, 10]).failOffsetX([-12, 12])
    // eslint-disable-next-line react-hooks/refs
    .onEnd((event, success) => {
      if (!success || Math.abs(event.translationY) < 28) return;
      const current = Math.round(progress.get() - scrollBias.get());
      const direction = event.translationY < 0 ? 1 : -1;
      const target = Math.max(0, Math.min(maxStart, current + direction));
      scrollTo(deckScroll, target * step, 0, true);
    });
  const deckGesture = Gesture.Simultaneous(cardLongPress, Gesture.Race(cardTap, verticalSwipe));
  // Forget a removed selection before rendering so re-adding it cannot reopen stale details.
  if (expanded && !selected) setExpanded(null);
  return <View style={[s.root, { backgroundColor: isDark ? '#262B28' : '#F7F6F4' }]} onLayout={event => { const h = event.nativeEvent.layout.height; if (h > 0) setAvailableHeight(previous => previous === h ? previous : h); }}>
    <View testID="rhythm-card-background" pointerEvents={selected ? 'none' : 'auto'} style={s.root} accessibilityElementsHidden={!!selected} importantForAccessibility={selected ? 'no-hide-descendants' : 'auto'}>
      <GestureDetector gesture={deckGesture}><Animated.View collapsable={false} testID="rhythm-card-stack-layer" pointerEvents={overview ? 'none' : 'auto'} accessibilityElementsHidden={overview} importantForAccessibility={overview ? 'no-hide-descendants' : 'auto'} style={[StyleSheet.absoluteFill, deckVisibility]}>
      {items.length ? <>
        <View pointerEvents="box-none" testID="rhythm-card-deck-stage" style={[StyleSheet.absoluteFill, { height: stageHeight, overflow: 'hidden' }]}>
          <View key={deckEpoch} pointerEvents="box-none" style={{ width, height: stageHeight }}>
            {mounted.map(({ item, index, itemIndex }) => {
              if (!item) return null;
              return <OverlayCard key={`${item.key}:${index}`} item={item} index={index} colorSlot={itemIndex % 3} width={width} height={stageHeight} progress={progress} mountedWindow={safeStart} active={Math.abs(index - Math.round(visibleDeckProgress(progress.get(), safeStart))) < 0.35} isDark={isDark}
                onPress={() => openCard(index)} />;
            })}
          </View>
        </View>
        <Animated.ScrollView ref={deckScroll} horizontal contentOffset={initialOffset} testID="rhythm-card-deck-scroll" style={StyleSheet.absoluteFill} showsHorizontalScrollIndicator={false} scrollEnabled={!overview && looping} scrollEventThrottle={16} onScroll={onScroll} bounces={false} overScrollMode="never" snapToInterval={step} decelerationRate="fast" removeClippedSubviews={false}>
          <View pointerEvents="none" style={{ width: width + maxStart * step, height: stageHeight }} />
        </Animated.ScrollView>
      </> : <View style={s.empty}><RhythmEmptyState ended={false} ink={ink} muted={muted} /></View>}
      </Animated.View></GestureDetector>
      {!overview && count > 0 ? <View testID="rhythm-card-picker" style={s.pickerScroll}>
        <Animated.View key={deckEpoch} style={[{ height: PICKER_BUTTON }, pickerShift]}>
          {(looping ? Array.from({ length: count * 2 + 1 }, (_, offset) => safeStart - count + offset) : items.map((_, index) => index)).map(index => {
            const item = items[loopDeckIndex(index, count)];
            if (!item) return null;
            const focus = Math.round(progress.get());
            const isSelected = index === focus;
            const colors = cardColors(item, loopDeckIndex(index, count) % 3, isDark);
            return <Pressable key={`${item.key}:${index}`} testID={isSelected ? `rhythm-picker-${item.key}` : undefined} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: isSelected }} onPress={() => {
              tapHaptic();
              const nativeIndex = looping ? index - scrollBias.get() : 0;
              deckScroll.current?.scrollTo({ x: Math.max(0, Math.min(maxStart, nativeIndex)) * step, animated: true });
            }} style={[s.pickerButton, { left: index * PICKER_STRIDE, backgroundColor: isSelected ? '#D7F0E7' : colors.paper }]}>
              <PaperGrain opacity={0.32} />
              <IconSymbol name={item.icon} size={24} color={colors.ink} />
              <HanddrawnFrame color={isSelected ? '#328D7B' : isDark ? '#D5D5D5' : '#77786F'} bold={isSelected} />
            </Pressable>;
          })}
        </Animated.View>
      </View> : null}
      {overviewMounted && count > 0 ? <Animated.View pointerEvents={overview ? 'auto' : 'none'} accessibilityElementsHidden={!overview} importantForAccessibility={overview ? 'auto' : 'no-hide-descendants'} style={[StyleSheet.absoluteFill, gridVisibility]}>
        <RhythmCardOverview items={items} width={width} height={height} isDark={isDark} enabled={overview} progress={overviewProgress} onExclude={onExcludeFromToday} onOpen={(item, slot, origin) => setExpanded({ key: item.key, slot, origin })} />
      </Animated.View> : null}
      {count > 0 ? <PaperControl testID="rhythm-card-overview-toggle" preserveColor accessibilityRole="button" accessibilityLabel={t(overview ? 'dayPlan.cardsShowStack' : 'dayPlan.cardsShowAll')} accessibilityState={{ selected: overview, expanded: overview }} onPress={() => {
        tapHaptic();
        deckScroll.current?.scrollTo({ x: (progress.get() - scrollBias.get()) * step, animated: false });
        setOverviewMounted(true);
        setOverview(value => !value);
        setDeckEpoch(value => value + 1);
      }} style={[s.overviewToggle, { right: onSchedule ? 58 : 14, backgroundColor: overview ? 'rgba(200,235,221,0.62)' : isDark ? 'rgba(48,54,49,0.55)' : 'rgba(247,246,244,0.55)' }]}>
        <Svg width={25} height={25} viewBox="0 0 30 30" accessible={false}>
          <Path d={overview ? 'M11 3L25 5L24 23L10 22ZM5 8L20 7L22 27L6 27Z' : 'M4 4L13 3L13 13L4 13ZM18 4L27 4L26 13L18 13ZM4 18L13 18L13 27L4 26ZM18 18L27 18L26 27L18 27Z'} fill="none" stroke={isDark ? '#FAFAF6' : '#343C38'} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </PaperControl> : null}
      {onSchedule ? <PaperControl testID="rhythm-card-schedule" preserveColor accessibilityRole="button" accessibilityLabel={t('dayPlan.scheduledRoutine.calendarA11y')} onPress={() => { tapHaptic(); onSchedule(); }} style={[s.overviewToggle, { backgroundColor: isDark ? 'rgba(48,54,49,0.55)' : 'rgba(247,246,244,0.55)' }]}>
        <HeaderIcon name="calendar" size={22} />
      </PaperControl> : null}
      {!overview && items.length > 3 ? <View pointerEvents="none" style={s.deckCount}><ThemedText style={{ color: muted, fontSize: 12 }}>{loopDeckIndex(safeStart, count) + 1} / {count}</ThemedText><IconSymbol name="chevron.down" size={12} color={muted} /></View> : null}
      <RoutineWheelAddButton translucent icon="cards" size={36} label={t('dayPlan.addMoreRoutine')} onPress={onAdd} style={[s.add, { bottom: 96, right: (count > 0 ? 44 : 0) + (onSchedule ? 44 : 0) + 14 }]} />
    </View>
    {expanded && selected ? <ExpandedRhythmCard key={selected.key} item={selected} slot={expanded.slot} origin={expanded.origin} width={width} height={availableHeight ?? height} isDark={isDark} renderDetail={renderDetail} onClose={close} onComplete={onComplete} onEditTime={onEditTime} /> : null}
  </View>;
}
const OVERVIEW_PAD_TOP = 12;
const PICKER_BUTTON = 46;
const PICKER_GAP = 8;
const PICKER_STRIDE = PICKER_BUTTON + PICKER_GAP;

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  overviewToggle: { position: 'absolute', right: 14, bottom: 96, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  overviewContent: { paddingTop: OVERVIEW_PAD_TOP, paddingHorizontal: 14, paddingBottom: 80, flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 },
  overviewCard: { borderRadius: 9, padding: 10, shadowColor: '#5A5347', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  deckCount: { position: 'absolute', left: 20, bottom: 82, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerScroll: { position: 'absolute', left: 12, right: 12, bottom: 14, height: PICKER_BUTTON, overflow: 'hidden' },
  pickerButton: { position: 'absolute', top: 0, width: PICKER_BUTTON, height: PICKER_BUTTON, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#514B3F', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  card: { position: 'absolute', shadowColor: '#6F5942', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  body: { flex: 1 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  cardDate: { alignItems: 'flex-end', flexShrink: 0 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  add: { position: 'absolute', right: 14, bottom: 14 },
  empty: { minHeight: 340, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 20 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#000000' },
  expanded: { position: 'absolute', left: 16, right: 16, top: 12, bottom: 12, borderRadius: 16, shadowColor: '#35352F', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  expandedContent: { flex: 1, minHeight: 0 },
  detailHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingTop: 12, paddingBottom: 10, gap: 10 },
  detailTitleBlock: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 20, lineHeight: 27 },
  detailTime: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 36 },
  closeHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  detailBody: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeButton: { minWidth: 76, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#5F655C', borderRadius: 4 },
});
