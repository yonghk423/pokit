import { useHeroCardLayout } from '../model/heroCardLayout';
import { HeroPolaroidSurface, HeroPhotoEmulsion } from './HeroPolaroidSurface';
import type { AppFontId } from '@shared/lib/ui-font';
import { HeroSceneThumbnail } from './HeroSceneThumbnail';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import { rememberHeroGenerationCardSize } from '../lib/heroGenerationFrame';
import { createCardTapGuard } from '../lib/cardTapGuard';
import { useHeroThumbnailStrip } from '../model/useHeroThumbnailStrip';
import { useTranslation } from '@shared/lib/i18n';
import { HeroCardCaption, type HeroCardText } from './HeroCardCaption';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { useSettledDeckLayout, type DeckSize } from '../lib/useSettledDeckLayout';
import { HeroCardStack, type HeroCardStackHandle } from './HeroCardStack';
import type { HeroCardOpen } from './HeroCardFlip';
import type { HeroDeckFrame } from './HeroOverviewCardMotion';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Image as NativeImage, Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { resolveComicScene, type ComicSceneId } from '../lib/heroSceneImages';

export type ComicDeckItem = { key: string; label: string; artworkUri?: string; exportDate?: string | number; memo?: string; faceColor?: string; inkColor?: string; fontId?: AppFontId };

const THUMB = 44;
const THUMB_GAP = 8;
const THUMB_STRIDE = THUMB + THUMB_GAP;
/** Matches the add button: 8px from the bottom, 44px tall, plus its right inset. */
const FOOTER_BOTTOM = 8;
const ADD_RESERVE = 72;
/** Artwork paper. A pure white card plus grain reads as a second sheet behind the drawing. */
const ILLUSTRATION_PAPER = '#F9F9F6';

/** Last measured stage, so a remounted deck paints its cards in the first frame. */
let lastDeckSize = { width: 0, height: 0 };
const rememberDeckSize = (size: DeckSize) => { lastDeckSize = size; };
let lastActive = 0;
/** Only cards this close to the focused one decode their full artwork. */
const ARTWORK_WINDOW = 2;

/** The same layered paper stack as the mate deck, with intact artwork cards. */
export function ComicSceneDeck({ syncMainState = true, presentationOverride, focusKey, items, ink, muted, isDark, choices, onOpen, onRemove, onEditCard, onShowOverview, onFrameChange, detailOpen = false, interactive = true }: {
  syncMainState?: boolean;
  presentationOverride?: 'stack' | 'carousel';
  focusKey?: string | null;
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
  const savedPresentation = useHeroCardLayout();
  const presentation = presentationOverride ?? savedPresentation;
  const thumbnailStrip = useHeroThumbnailStrip();
  const rememberSize = useCallback((next: DeckSize) => {
    if (syncMainState) rememberDeckSize(next);
  }, [syncMainState]);
  // A history modal has a different stage from the main tab. Wait for its own
  // measurement instead of painting once with the main tab's cached geometry.
  const { size, updateSize, focused } = useSettledDeckLayout(syncMainState ? lastDeckSize : { width: 0, height: 0 }, rememberSize);
  const rootRef = useRef<View>(null);
  const lastHold = useRef(0);
  const tapGuard = useRef(createCardTapGuard()).current;
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
  const [active, setActive] = useState(() => {
    const requested = items.findIndex(item => item.key === focusKey);
    return requested >= 0 ? requested : Math.min(lastActive, Math.max(0, items.length - 1));
  });
  const [previousFocusKey, setPreviousFocusKey] = useState(focusKey);
  const [previousCount, setPreviousCount] = useState(items.length);
  const [arrivalKey, setArrivalKey] = useState<string | null>(null);
  // Reconcile before committing native views: never paint the new card count
  // with the previous selection, then jump to the appended card in an effect.
  if (items.length !== previousCount) {
    setPreviousCount(items.length);
    if (items.length > previousCount) {
      setArrivalKey(items[items.length - 1].key);
      setActive(items.length - 1);
    } else setActive(value => Math.min(value, Math.max(0, items.length - 1)));
  }
  // A generated result can replace a stock card without changing the count.
  // Select it before painting, independently of its position in the saved list.
  if (focusKey !== previousFocusKey) {
    setPreviousFocusKey(focusKey);
    const requested = items.findIndex(item => item.key === focusKey);
    if (requested >= 0) { setActive(requested); setArrivalKey(items[requested].key); }
  }
  useEffect(() => {
    if (!arrivalKey) return;
    const timeout = setTimeout(() => setArrivalKey(null), 350);
    return () => clearTimeout(timeout);
  }, [arrivalKey]);
  const cardRefs = useRef(new Map<string, View>());
  const readCurrentCard = useRef<(key: string, complete: (card: HeroCardOpen | null) => void) => void>(() => {});
  const turnRef = useRef<HeroCardStackHandle>(null);
  const carouselRef = useRef<ScrollView>(null);
  const availableHeight = Math.max(1, size.height - FOOTER_BOTTOM - THUMB - 16);
  // Keep the phone-sized card on compact screens, but let it grow on iPad.
  // The proportional cap also behaves smoothly in split view and Stage Manager.
  const cardWidth = Math.max(1, Math.min(size.width - 76, 560));
  const safeActive = Math.max(0, Math.min(active, items.length - 1));
  const [photoRatios, setPhotoRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!syncMainState) return;
    let live = true;
    const uris = [...new Set(items.map(item => item.artworkUri).filter((uri): uri is string => !!uri))];
    for (const uri of uris) {
      if (photoRatios[uri]) continue;
      NativeImage.getSize(resolveHeroArtworkUri(uri), (width, height) => {
        if (live && width > 0 && height > 0) setPhotoRatios(previous => previous[uri] === width / height ? previous : { ...previous, [uri]: width / height });
      }, () => {});
    }
    return () => { live = false; };
  }, [syncMainState, items, photoRatios]);
  const carouselStride = cardWidth + 16;
  useLayoutEffect(() => {
    if (presentation === 'carousel' && focused && size.width > 0) {
      carouselRef.current?.scrollTo({ x: safeActive * carouselStride, animated: false });
    }
  }, [presentation, focused, safeActive, carouselStride, size.width, items.length]);
  const currentItem = items[safeActive];
  const currentScene = currentItem ? resolveComicScene(currentItem.key, currentItem.label, choices) : null;
  const savedArtwork = currentItem?.artworkUri;
  const generatedArtwork = useMemo(() => savedArtwork ? { uri: savedArtwork } : null, [savedArtwork]);
  const currentArtwork = generatedArtwork ?? (currentScene ? COMIC_SCENE_THUMBNAILS[currentScene.id] ?? currentScene.source : null);
  useEffect(() => {
    if (syncMainState && focused && interactive && currentArtwork) useHeroTabArtwork.getState().setSource(currentArtwork);
  }, [syncMainState, focused, interactive, currentArtwork]);
  const frameTop = Math.min(60, Math.max(8, availableHeight * 0.1));
  const originalCardTop = Math.max(8, frameTop - 28);
  const maximumCardHeight = Math.max(1, availableHeight - originalCardTop + 8);
  const frameForItem = (item: ComicDeckItem | undefined) => {
    if (!syncMainState || !item) return { width: cardWidth, height: Math.min(cardWidth * 1.55, maximumCardHeight) };
    const scene = resolveComicScene(item.key, item.label, choices);
    const asset = NativeImage.resolveAssetSource(scene.source);
    const ratio = item.artworkUri ? photoRatios[item.artworkUri] ?? 2 / 3 : asset?.width && asset.height ? asset.width / asset.height : 2 / 3;
    const caption = (item.memo?.trim() ? 105 : item.label.trim() ? 77 : 64) + 8;
    const imageWidth = Math.max(1, Math.min(cardWidth - 24, (maximumCardHeight - caption - 40) * ratio));
    return { width: imageWidth + 24, height: imageWidth / ratio + caption + 40 };
  };
  const currentFrame = frameForItem(currentItem);
  const cardHeight = currentFrame.height;
  const cardTop = syncMainState ? Math.max(8, originalCardTop - 8) : Math.max(8, (size.height - cardHeight) / 2);
  useEffect(() => {
    if (size.width > 0) {
      if (syncMainState) rememberHeroGenerationCardSize(currentFrame.width, cardHeight);
      onFrameChange?.({ active: safeActive, width: currentFrame.width, height: cardHeight, top: cardTop });
    }
  }, [syncMainState, safeActive, currentFrame.width, cardHeight, cardTop, onFrameChange, size.width]);
  useEffect(() => { if (syncMainState) lastActive = active; }, [active, syncMainState]);
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
  const thumbLane = thumbViewport || Math.max(1, size.width - ADD_RESERVE * (syncMainState ? 1 : 2));
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
  const renderPage = (index: number, pageInteractive: boolean, trackNative = false, paperBack = false): ReactNode => {
    const item = items[index];
    if (!item) return null;
    const { width: pageWidth, height: pageHeight } = frameForItem(item);
        const scene = resolveComicScene(item.key, item.label, choices);
        const face = scenePaper(item.faceColor, isDark);
        if (paperBack) return <View testID="hero-paper-back" style={[s.card, { width: currentFrame.width, height: currentFrame.height, alignSelf: 'center', backgroundColor: face }]}><HeroPolaroidSurface /></View>;
        const captionBudget = (item.memo?.trim() ? 105 : item.label.trim() ? 77 : 64) + 8;
        const imageFrameHeight = Math.max(1, pageHeight - captionBudget - 40);
        const cardInk = item.inkColor ?? ink;
        return <CardArrival animate={syncMainState && trackNative && item.key === arrivalKey}><View collapsable={false} ref={pageInteractive || trackNative ? node => { if (node) cardRefs.current.set(item.key, node); else cardRefs.current.delete(item.key); } : undefined} style={[s.card, { width: pageWidth, height: pageHeight, alignSelf: 'center', backgroundColor: face, opacity: trackNative && detailOpen && index === safeActive ? 0 : 1 }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: face, shadowColor: '#393329', shadowOpacity: 0.28, shadowRadius: 1.5, shadowOffset: { width: 0.8, height: 1.8 } }]} />
          {face !== '#000000' ? <HeroPolaroidSurface /> : null}
          <ServiceTutorialTarget steps={pageInteractive && index === active ? ['comicOpen'] : []} style={s.body}><Pressable disabled={!pageInteractive || !!editingKey} accessibilityRole="button" accessibilityLabel={item.label} delayLongPress={500}
            onTouchStart={event => { const touch = event.nativeEvent; tapGuard.start(touch.pageX, touch.pageY, touch.touches.length); }}
            onTouchMove={event => { const touch = event.nativeEvent; tapGuard.move(touch.pageX, touch.pageY, touch.touches.length); }}
            onTouchEnd={event => { const touch = event.nativeEvent; tapGuard.move(touch.pageX, touch.pageY); }}
            onTouchCancel={() => tapGuard.cancel()}
            onLongPress={pageInteractive ? () => { tapGuard.cancel(); if (presentation === 'carousel') requestRemoval(item.key); } : undefined}
            accessibilityActions={onRemove ? [{ name: 'longpress', label: t('comicDay.deleteScene') }] : undefined}
            onAccessibilityAction={event => { if (pageInteractive && !editingKey && event.nativeEvent.actionName === 'longpress') onRemove?.(item.key); }}
            onPress={() => {
            if (!tapGuard.canOpen() || Date.now() - lastHold.current < 800) return;
            tapHaptic();
            const node = cardRefs.current.get(item.key);
            if (!node) { onOpen(item.key); return; }
            node.measureInWindow((left, top, width, height) => {
              if (width <= 0 || height <= 0) { onOpen(item.key); return; }
              onOpen(item.key, { frame: { left, top, width, height }, front: renderPage(index, false), readCurrent: complete => readCurrentCard.current(item.key, complete) });
            });
          }} style={{ flexShrink: 0 }}>
            {(Math.abs(index - active) <= ARTWORK_WINDOW || !pageInteractive) ? <ComicSceneImage transitionDuration={syncMainState ? 180 : 0} preserveFullImage contentFit="contain" backgroundColor={face} imageKey={`${item.artworkUri ?? scene.id}:960`}
              source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} fallbackSource={item.artworkUri ? undefined : scene.source}
              priority={index === active ? 'high' : 'normal'} style={{ width: '100%', height: imageFrameHeight }} /> : <View style={{ width: '100%', height: imageFrameHeight }} />}
            <HeroPhotoEmulsion />
          </Pressable>
            <HeroCardCaption tapToEdit fontId={item.fontId} key={item.key} title={item.label} memo={item.memo} number={index + 1} ink={cardInk} muted={muted} paper={face}
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
    {size.width > 0 && size.height > 0 ? presentation === 'carousel' ?
      <GestureScrollView ref={carouselRef} testID="comic-scene-carousel" horizontal
        contentOffset={{ x: safeActive * carouselStride, y: 0 }}
        style={StyleSheet.absoluteFill} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: (size.width - cardWidth) / 2, paddingTop: cardTop, gap: 16 }}
        snapToInterval={carouselStride} decelerationRate="fast" disableIntervalMomentum bounces={false}
        scrollEnabled={focused && interactive && !detailOpen && !editingKey}
        onScrollBeginDrag={() => tapGuard.cancel()}
        onMomentumScrollEnd={event => {
          const next = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / carouselStride)));
          if (next !== safeActive) { tapHaptic('select'); setActive(next); }
        }}>
        {items.map((item, index) => <View key={item.key} style={{ width: cardWidth, height: cardHeight }}>
          {renderPage(index, index === safeActive && focused && interactive && !detailOpen, true)}
        </View>)}
      </GestureScrollView> : <HeroCardStack ref={turnRef} active={safeActive} count={items.length} width={size.width} height={size.height}
        onCardHold={onRemove && !editingKey ? (x, y) => {
          const left = (size.width - cardWidth) / 2;
          if (x >= left && x <= left + cardWidth && y >= cardTop && y <= cardTop + cardHeight) requestRemoval(items[safeActive].key);
        } : undefined}
        overviewGesture={verticalSwipe}
        cardWidth={currentFrame.width} cardHeight={cardHeight} top={cardTop} swipeEnabled={!editingKey} enabled={focused && interactive && !detailOpen}
        renderBack={index => renderPage(index, false, false, true)}
        pageKey={index => items[index].key} renderPage={(index, pageInteractive, focusedCard) => renderPage(index, pageInteractive, focusedCard)} onChange={setActive} />
    : null}
    {size.width > 0 && items.length > 0 ? <Animated.View testID="comic-scene-thumbs" pointerEvents={thumbnailStrip.collapsed ? 'none' : 'auto'} accessibilityElementsHidden={thumbnailStrip.collapsed} importantForAccessibility={thumbnailStrip.collapsed ? 'no-hide-descendants' : 'auto'} style={[s.thumbs, !syncMainState && { left: ADD_RESERVE, bottom: FOOTER_BOTTOM + 20 }, thumbnailStrip.motionStyle]} onLayout={event => {
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
          return <HeroSceneThumbnail isDark={isDark} key={item.key} disabled={!!editingKey} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => {
            tapHaptic();
            if (presentation === 'carousel') setActive(index);
            else turnRef.current?.turnTo(index);
          }}>
            <ComicSceneImage preserveFullImage contentFit="contain" backgroundColor={face} imageKey={`${item.artworkUri ?? scene.id}:960`}
              source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} fallbackSource={item.artworkUri ? undefined : scene.source}
              style={StyleSheet.absoluteFill} />
          </HeroSceneThumbnail>;
        })}
      </GestureScrollView>
    </Animated.View> : null}
  </View>;
}

function scenePaper(color: string | undefined, isDark: boolean) {
  if (isDark && !color) return '#3A3C52';
  return color ?? ILLUSTRATION_PAPER;
}

const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  card: { borderRadius: 0, shadowColor: '#262218', shadowOpacity: 0.24, shadowRadius: 11, shadowOffset: { width: 3, height: 9 }, elevation: 8 },
  body: { flex: 1, borderRadius: 2, overflow: 'hidden', padding: 12, paddingTop: 28 },
  thumbs: { position: 'absolute', left: 0, right: ADD_RESERVE, bottom: FOOTER_BOTTOM - 4, height: THUMB + 8, justifyContent: 'center' },
  thumbScroll: { flex: 1 },
  thumbRow: { flexGrow: 1, alignItems: 'center', gap: THUMB_GAP, paddingHorizontal: 12, paddingVertical: 4 },
});

/** Native position motion adds the new card without moving the stack's layout. */
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
  return <Animated.View testID="comic-card-arrival" style={{ flex: 1, transform: [
    { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
    { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.975, 1] }) },
  ] }}>{children}</Animated.View>;
}
