import { ThemedText } from '@shared/ui/themed-text';
import { HeroImageActions } from './HeroImageActions';
import { useTranslation } from '@shared/lib/i18n';
import { HeroCardCaption, type HeroCardText } from './HeroCardCaption';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { useSettledDeckLayout, type DeckSize } from '../lib/useSettledDeckLayout';
import { HeroCardStack, type HeroCardStackHandle } from './HeroCardStack';
import type { HeroCardOpen } from './HeroCardFlip';
import type { HeroDeckFrame } from './HeroOverviewCardMotion';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { resolveComicScene, type ComicSceneId } from '../lib/heroSceneImages';

export type ComicDeckItem = { key: string; label: string; artworkUri?: string; memo?: string; faceColor?: string; inkColor?: string };

const THUMB = 44;
const THUMB_GAP = 8;
const THUMB_STRIDE = THUMB + THUMB_GAP;
/** Matches the add button: 8px from the bottom, 44px tall, plus its right inset. */
const FOOTER_BOTTOM = 8;
const ADD_RESERVE = 72;
/** Artwork paper. A pure white card plus grain reads as a second sheet behind the drawing. */
const ILLUSTRATION_PAPER = '#F5E8CF';

/** Last measured stage, so a remounted deck paints its cards in the first frame. */
let lastDeckSize = { width: 0, height: 0 };
const rememberDeckSize = (size: DeckSize) => { lastDeckSize = size; };
let lastActive = 0;
/** Only cards this close to the focused one decode their full artwork. */
const ARTWORK_WINDOW = 2;

/** The same layered paper stack as the mate deck, with intact artwork cards. */
export function ComicSceneDeck({ items, ink, muted, isDark, choices, onOpen, onRemove, onEditCard, onShowOverview, onFrameChange, detailOpen = false, interactive = true }: {
  items: ComicDeckItem[]; ink: string; muted: string; isDark: boolean;
  choices: Record<string, ComicSceneId>; onOpen: (key: string, card?: HeroCardOpen) => void;
  onRemove?: (key: string) => void;
  onEditCard?: (key: string, text: HeroCardText) => void;
  onShowOverview?: () => void;
  onFrameChange?: (frame: HeroDeckFrame) => void;
  interactive?: boolean;
  detailOpen?: boolean;
}) {
  const { t } = useTranslation();
  const { size, updateSize, focused } = useSettledDeckLayout(lastDeckSize, rememberDeckSize);
  const rootRef = useRef<View>(null);
  const lastHold = useRef(0);
  const requestRemoval = (key: string) => {
    if (!onRemove || editingKey || Date.now() - lastHold.current < 800) return;
    lastHold.current = Date.now(); tapHaptic('warn'); onRemove(key);
  };
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const measureStage = useCallback((width: number, height: number) => {
    // Detached native screens can briefly report only their footer or a one-pixel stage.
    if (height <= FOOTER_BOTTOM + THUMB + 112 + 24) return;
    updateSize(width, height);
  }, [updateSize]);
  useLayoutEffect(() => {
    if (!focused || detailOpen) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        rootRef.current?.measure((_x, _y, width, height) => measureStage(width, height));
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [focused, detailOpen, measureStage]);
  const [active, setActive] = useState(() => Math.min(lastActive, Math.max(0, items.length - 1)));
  const previousCount = useRef(items.length);
  const [arrivalKey, setArrivalKey] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (items.length > previousCount.current) {
      // A newly appended card becomes the visible card in the existing stack.
      setArrivalKey(items[items.length - 1].key);
      setActive(items.length - 1);
    }
    previousCount.current = items.length;
  }, [items]);
  useEffect(() => {
    if (!arrivalKey) return;
    const timeout = setTimeout(() => setArrivalKey(null), 350);
    return () => clearTimeout(timeout);
  }, [arrivalKey]);
  const cardRefs = useRef(new Map<string, View>());
  const readCurrentCard = useRef<(key: string, complete: (card: HeroCardOpen | null) => void) => void>(() => {});
  const turnRef = useRef<HeroCardStackHandle>(null);
  const availableHeight = Math.max(1, size.height - FOOTER_BOTTOM - THUMB - 16);
  // Keep the phone-sized card on compact screens, but let it grow on iPad.
  // The proportional cap also behaves smoothly in split view and Stage Manager.
  const cardWidth = Math.max(1, Math.min(size.width - 64, 560, Math.max(320, size.width * 0.56)));
  const safeActive = Math.max(0, Math.min(active, items.length - 1));
  const currentItem = items[safeActive];
  const currentScene = currentItem ? resolveComicScene(currentItem.key, currentItem.label, choices) : null;
  const currentArtwork = currentScene ? COMIC_SCENE_THUMBNAILS[currentScene.id] ?? currentScene.source : null;
  useEffect(() => {
    if (focused && interactive && currentArtwork) useHeroTabArtwork.getState().setSource(currentArtwork);
  }, [focused, interactive, currentArtwork]);
  // Hold one generous frame across all scenes. This keeps the original large-card
  // feel while preventing portrait, landscape and memo cards from moving the deck.
  const frameTop = Math.min(60, Math.max(8, availableHeight * 0.1));
  const cardTop = Math.max(8, frameTop - 28);
  // Lift the stack without changing the card or artwork dimensions.
  const cardHeight = Math.min(cardWidth / 0.75 + 174, Math.max(1, availableHeight - frameTop + 12));
  useEffect(() => {
    if (size.width > 0) onFrameChange?.({ active: safeActive, width: cardWidth, height: cardHeight, top: cardTop });
  }, [safeActive, cardWidth, cardHeight, cardTop, onFrameChange, size.width]);
  useEffect(() => { lastActive = active; }, [active]);
  const thumbRef = useRef<ScrollView>(null);
  const verticalSwipe = Gesture.Pan().enabled(focused && interactive && !detailOpen && !editingKey && items.length > 0 && !!onShowOverview)
    .activateAfterLongPress(350)
    .activeOffsetY([-10, 10]).failOffsetX([-12, 12])
    .onStart(() => { runOnJS(tapHaptic)(); })
    .onEnd((event, success) => {
      if (success && event.translationY < -40 && onShowOverview) runOnJS(onShowOverview)();
    });
  const [thumbViewport, setThumbViewport] = useState(0);
  const stripWidth = Math.max(0, items.length * THUMB_STRIDE - THUMB_GAP) + 24;
  const thumbLane = thumbViewport || Math.max(1, size.width - ADD_RESERVE);
  const thumbOverflows = stripWidth > thumbLane + 1;
  // The strip stays put; it only scrolls when the focused thumbnail would leave a long row.
  const thumbPlaced = useRef(false);
  useEffect(() => {
    const lane = thumbLane;
    if (!focused || !interactive || detailOpen || !thumbOverflows) return;
    const target = 12 + active * THUMB_STRIDE + THUMB / 2 - lane / 2;
    thumbRef.current?.scrollTo({ x: Math.max(0, Math.min(stripWidth - lane, target)), animated: thumbPlaced.current });
    thumbPlaced.current = true;
  }, [active, thumbLane, thumbOverflows, stripWidth, focused, interactive, detailOpen]);
  const renderPage = (index: number, pageInteractive: boolean, trackNative = false): ReactNode => {
    const item = items[index];
    if (!item) return null;
        const scene = resolveComicScene(item.key, item.label, choices);
        const face = scenePaper(item.faceColor, isDark);
        const captionBudget = (item.memo?.trim() ? 105 : item.label.trim() ? 77 : 64) + 28;
        const imageFrameHeight = Math.max(1, cardHeight - captionBudget);
        const cardInk = item.inkColor ?? ink;
        return <CardArrival animate={item.key === arrivalKey}><View collapsable={false} ref={pageInteractive || trackNative ? node => { if (node) cardRefs.current.set(item.key, node); else cardRefs.current.delete(item.key); } : undefined} style={[s.card, { width: cardWidth, height: cardHeight, backgroundColor: face, opacity: trackNative && detailOpen && index === safeActive ? 0 : 1 }]}>
          {pageInteractive ? <ThemedText testID="hero-card-order" pointerEvents="none" style={{ position: 'absolute', left: 8, top: -19, color: muted, fontSize: 10, lineHeight: 14 }}>{String(index + 1).padStart(2, '0')}</ThemedText> : null}
          <ServiceTutorialTarget steps={pageInteractive && index === active ? ['comicOpen'] : []} style={[s.body, { paddingBottom: 12 }]}><Pressable disabled={!pageInteractive || !!editingKey} accessibilityRole="button" accessibilityLabel={item.label} delayLongPress={500}
            onLongPress={pageInteractive && onRemove ? () => requestRemoval(item.key) : undefined}
            accessibilityActions={onRemove ? [{ name: 'longpress', label: t('comicDay.deleteScene') }] : undefined}
            onAccessibilityAction={event => { if (pageInteractive && !editingKey && event.nativeEvent.actionName === 'longpress') onRemove?.(item.key); }}
            onPress={() => {
            if (Date.now() - lastHold.current < 800) return;
            tapHaptic();
            const node = cardRefs.current.get(item.key);
            if (!node) { onOpen(item.key); return; }
            node.measureInWindow((left, top, width, height) => {
              if (width <= 0 || height <= 0) { onOpen(item.key); return; }
              onOpen(item.key, { frame: { left, top, width, height }, front: renderPage(index, false), readCurrent: complete => readCurrentCard.current(item.key, complete) });
            });
          }} style={{ flexShrink: 0 }}>
            {(Math.abs(index - active) <= ARTWORK_WINDOW || !pageInteractive) ? <ComicSceneImage fillPortrait contentFit="contain" backgroundColor={face} imageKey={`${item.artworkUri ?? scene.id}:960`}
              source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} fallbackSource={scene.source}
              priority={index === active ? 'high' : 'normal'} style={{ width: '100%', height: imageFrameHeight }} /> : <View style={{ width: '100%', height: imageFrameHeight }} />}
          </Pressable>
            <HeroCardCaption key={item.key} title={item.label} memo={item.memo} number={index + 1} ink={cardInk} muted={muted} paper={face}
              topActions={pageInteractive ? <HeroImageActions key={item.artworkUri ?? scene.id} uri={item.artworkUri} source={scene.source} compact /> : undefined}
              showEdit={!!onEditCard}
              onSave={pageInteractive && onEditCard ? text => onEditCard(item.key, text) : undefined}
              onEditingChange={pageInteractive ? editing => setEditingKey(editing ? item.key : null) : undefined} />
          </ServiceTutorialTarget>
        </View></CardArrival>;
  };
  // Refresh this reader after each commit, so closing uses the edited card rather than its opening copy.
  useLayoutEffect(() => {
    readCurrentCard.current = (key, complete) => {
      const index = items.findIndex(item => item.key === key);
      const node = cardRefs.current.get(key);
      if (index < 0 || !node) { complete(null); return; }
      node.measureInWindow((left, top, width, height) => {
        complete(width > 0 && height > 0 ? { frame: { left, top, width, height }, front: renderPage(index, false) } : null);
      });
    };
  });
  // Deletions can shorten the diary while the deck remains mounted.
  return <View ref={rootRef} testID="comic-scene-deck" style={s.root} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    measureStage(width, height);
  }}>
    {size.width > 0 && size.height > 0 ?
      <HeroCardStack ref={turnRef} active={safeActive} count={items.length} width={size.width} height={size.height}
        onCardHold={onRemove && !editingKey ? (x, y) => {
          const left = (size.width - cardWidth) / 2;
          if (x >= left && x <= left + cardWidth && y >= cardTop && y <= cardTop + cardHeight) requestRemoval(items[safeActive].key);
        } : undefined}
        overviewGesture={verticalSwipe}
        cardWidth={cardWidth} cardHeight={cardHeight} top={cardTop} swipeEnabled={!editingKey} enabled={focused && interactive && !detailOpen}
        renderPage={(index, pageInteractive, focusedCard) => renderPage(index, pageInteractive, focusedCard)} onChange={setActive} />
    : null}
    {size.width > 0 && items.length > 0 ? <View testID="comic-scene-thumbs" style={s.thumbs} onLayout={event => {
      const width = event.nativeEvent.layout.width;
      if (focused && width > 0) setThumbViewport(previous => previous === width ? previous : width);
    }}>
      <GestureScrollView ref={thumbRef} testID="comic-scene-thumbs-scroll" horizontal nestedScrollEnabled disallowInterruption
        style={s.thumbScroll} showsHorizontalScrollIndicator={false} bounces={false} alwaysBounceHorizontal={false} directionalLockEnabled
        scrollEnabled={focused && interactive && !detailOpen && !editingKey && thumbOverflows}
        contentContainerStyle={[s.thumbRow, { justifyContent: thumbOverflows ? 'flex-start' : 'center' }]}>
        {items.map((item, index) => {
          const scene = resolveComicScene(item.key, item.label, choices);
          const face = scenePaper(item.faceColor, isDark);
          const selected = index === active;
          return <Pressable key={item.key} disabled={!!editingKey} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => {
            tapHaptic();
            turnRef.current?.turnTo(index);
          }} style={[s.thumb, { backgroundColor: selected ? '#EDE9DF' : face }]}>
            <ComicSceneImage contentFit="contain" backgroundColor={face} imageKey={`${item.artworkUri ?? scene.id}:960`}
              source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} fallbackSource={scene.source}
              style={StyleSheet.absoluteFill} />
            <HanddrawnFrame color={selected ? '#514C43' : isDark ? '#D5D5D5' : '#77786F'} bold={selected} />
          </Pressable>;
        })}
      </GestureScrollView>
    </View> : null}
  </View>;
}

function scenePaper(color: string | undefined, isDark: boolean) {
  if (isDark && !color) return '#3A3C52';
  if (!color || color.toUpperCase() === '#FFFFFF') return ILLUSTRATION_PAPER;
  return color;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  card: { borderRadius: 16, shadowColor: '#6F5942', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  body: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  thumbs: { position: 'absolute', left: 0, right: ADD_RESERVE, bottom: FOOTER_BOTTOM, height: THUMB, justifyContent: 'center' },
  thumbScroll: { flex: 1 },
  thumbRow: { flexGrow: 1, alignItems: 'center', gap: THUMB_GAP, paddingHorizontal: 12 },
  thumb: { width: THUMB, height: THUMB, flexShrink: 0, overflow: 'hidden' },
});

/** Native opacity/position motion adds the new card without moving the stack's layout. */
function CardArrival({ animate, children }: { animate: boolean; children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(1));
  const reduced = useRef(false);
  useEffect(() => {
    let alive = true;
    const update = (value: boolean) => {
      if (!alive) return;
      reduced.current = value;
      if (value) { progress.stopAnimation(); progress.setValue(1); }
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { alive = false; subscription.remove(); };
  }, [progress]);
  useLayoutEffect(() => {
    if (!animate || reduced.current) return;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [animate, progress]);
  return <Animated.View testID="comic-card-arrival" style={{ flex: 1, opacity: progress, transform: [
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) },
  ] }}>{children}</Animated.View>;
}
