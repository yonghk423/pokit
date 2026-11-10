import { POLAROID_PHOTO_WIDTH, POLAROID_PHOTO_HEIGHT } from '../lib/heroPolaroidFraming';
import { HeroDiaryCardSides } from './HeroDiaryCardSides';
import { HeroPolaroidSurface, HeroPhotoEmulsion } from './HeroPolaroidSurface';
import type { AppFontId } from '@shared/lib/ui-font';
import { rememberHeroGenerationCardSize } from '../lib/heroGenerationFrame';
import { createCardTapGuard } from '../lib/cardTapGuard';
import { useTranslation } from '@shared/lib/i18n';
import { HeroCardCaption, type HeroCardText } from './HeroCardCaption';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { useSettledDeckLayout } from '../lib/useSettledDeckLayout';
import type { HeroCardOpen } from './HeroCardFlip';
import type { HeroDeckFrame } from './HeroOverviewCardMotion';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ComicSceneImage } from './HeroSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { resolveComicScene, type ComicSceneId } from '../lib/heroSceneImages';

export type ComicDeckItem = { key: string; label: string; artworkUri?: string; exportDate?: string | number; memo?: string; faceColor?: string; inkColor?: string; fontId?: AppFontId };

/** Artwork paper. A pure white card plus grain reads as a second sheet behind the drawing. */
const ILLUSTRATION_PAPER = '#F9F9F6';

const ignoreDeckSize = () => {};
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
  const presentation = 'carousel';
  // Calendar and diary use different header/tab-bar geometry. A remounted
  // deck must measure its own stage before painting, never reuse another stage.
  const { size, updateSize, focused } = useSettledDeckLayout({ width: 0, height: 0 }, ignoreDeckSize);
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
    if (height <= 136) return;
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
    if (requested >= 0) { setActive(requested); setArrivalKey(null); }
  }
  useEffect(() => {
    if (!arrivalKey) return;
    const timeout = setTimeout(() => setArrivalKey(null), 350);
    return () => clearTimeout(timeout);
  }, [arrivalKey]);
  const cardRefs = useRef(new Map<string, View>());
  const readCurrentCard = useRef<(key: string, complete: (card: HeroCardOpen | null) => void) => void>(() => {});
  const carouselRef = useRef<ScrollView>(null);
  const availableHeight = Math.max(1, size.height - 16);
  // Keep the phone-sized card on compact screens, but let it grow on iPad.
  // The proportional cap also behaves smoothly in split view and Stage Manager.
  const cardWidth = Math.max(1, Math.min(size.width - 76, 560));
  const safeActive = Math.max(0, Math.min(active, items.length - 1));
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
    if (!item) return { width: cardWidth, height: Math.min(cardWidth * 1.55, maximumCardHeight) };
    const ratio = POLAROID_PHOTO_WIDTH / POLAROID_PHOTO_HEIGHT;
    const caption = 56;
    const imageWidth = Math.max(1, Math.min(cardWidth - 24, (maximumCardHeight - caption - 40) * ratio));
    return { width: imageWidth + 24, height: imageWidth / ratio + caption + 40 };
  };
  const currentFrame = frameForItem(currentItem);
  const itemFrames = items.map(frameForItem);
  const carouselOffsets = itemFrames.map((_, index) => itemFrames.slice(0, index).reduce((total, frame) => total + frame.width + 12, 0));
  const carouselOffset = carouselOffsets[safeActive] ?? 0;
  useLayoutEffect(() => {
    // The native scroll view keeps its offset while another tab is shown.
    // Reposition only when its geometry or selected card changes; scrolling
    // again on focus causes a visible jump on tab return.
    if (presentation === 'carousel' && size.width > 0) {
      carouselRef.current?.scrollTo({ x: carouselOffset, animated: false });
    }
  }, [presentation, carouselOffset, size.width, items.length]);
  const cardHeight = currentFrame.height;
  const cardTop = Math.max(8, ((syncMainState ? availableHeight : size.height) - cardHeight) / 2);
  useEffect(() => {
    if (size.width > 0) {
      if (syncMainState) rememberHeroGenerationCardSize(currentFrame.width, cardHeight);
      onFrameChange?.({ active: safeActive, width: currentFrame.width, height: cardHeight, top: cardTop });
    }
  }, [syncMainState, safeActive, currentFrame.width, cardHeight, cardTop, onFrameChange, size.width]);
  useEffect(() => { if (syncMainState) lastActive = active; }, [active, syncMainState]);
  const verticalSwipe = Gesture.Pan().enabled(focused && interactive && !detailOpen && !editingKey && items.length > 0 && !!onShowOverview)
    .activateAfterLongPress(350)
    .activeOffsetY([-10, 10]).failOffsetX([-12, 12])
    .onStart(() => { runOnJS(tapHaptic)(); })
    .onEnd((event, success) => {
      if (success && event.translationY < -40 && onShowOverview) runOnJS(onShowOverview)();
    });
  const renderPage = (index: number, pageInteractive: boolean, trackNative = false, paperBack = false): ReactNode => {
    const item = items[index];
    if (!item) return null;
    const { width: pageWidth, height: pageHeight } = frameForItem(item);
        const scene = resolveComicScene(item.key, item.label, choices);
        const face = scenePaper(item.faceColor, isDark);
        if (paperBack) return <View testID="hero-paper-back" style={[s.card, { width: pageWidth, height: pageHeight, alignSelf: 'center', backgroundColor: face }]}><HeroPolaroidSurface /></View>;
        const captionBudget = 56;
        const imageFrameHeight = Math.max(1, pageHeight - captionBudget - 40);
        const cardInk = item.inkColor ?? ink;
        return <CardArrival animate={syncMainState && trackNative && item.key === arrivalKey}><View collapsable={false} ref={pageInteractive || trackNative ? node => { if (node) cardRefs.current.set(item.key, node); else cardRefs.current.delete(item.key); } : undefined} style={[{ width: pageWidth, height: pageHeight, alignSelf: 'center', opacity: trackNative && detailOpen && index === safeActive ? 0 : 1 }]}>
          <HeroDiaryCardSides paper={face} key={item.key} title={item.label} memo={item.memo} ink={cardInk} fontId={item.fontId} interactive={pageInteractive && index === safeActive}>
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
            {(Math.abs(index - active) <= ARTWORK_WINDOW || !pageInteractive) ? <ComicSceneImage transitionDuration={0} contentFit="cover" contentPosition="center" backgroundColor={face} imageKey={`${item.artworkUri ?? scene.id}:960`}
              source={item.artworkUri ? { uri: item.artworkUri } : COMIC_SCENE_THUMBNAILS[scene.id] ?? scene.source} fallbackSource={item.artworkUri ? undefined : scene.source}
              priority={index === active ? 'high' : 'normal'} style={{ width: '100%', height: imageFrameHeight }} /> : <View style={{ width: '100%', height: imageFrameHeight }} />}
            <HeroPhotoEmulsion />
          </Pressable>
            <HeroCardCaption showMemo={false} tapToEdit fontId={item.fontId} key={item.key} title={item.label} memo={item.memo} number={index + 1} ink={cardInk} muted={muted} paper={face}
              showEdit={!!onEditCard}
              onSave={pageInteractive && onEditCard ? text => onEditCard(item.key, text) : undefined}
              onEditingChange={pageInteractive ? editing => setEditingKey(editing ? item.key : null) : undefined} />
          </ServiceTutorialTarget>
          </HeroDiaryCardSides>
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
      <GestureScrollView ref={carouselRef} testID="comic-scene-carousel" horizontal
        contentOffset={{ x: carouselOffset, y: 0 }}
        style={StyleSheet.absoluteFill} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Math.max(0, (size.width - (itemFrames[0]?.width ?? currentFrame.width)) / 2), height: size.height, gap: 12 }}
        snapToOffsets={carouselOffsets} decelerationRate="fast" disableIntervalMomentum bounces={false}
        scrollEnabled={focused && interactive && !detailOpen && !editingKey}
        onScrollBeginDrag={() => tapGuard.cancel()}
        onMomentumScrollEnd={event => {
          const x = event.nativeEvent.contentOffset.x;
          const next = Math.max(0, Math.min(items.length - 1, carouselOffsets.reduce((best, offset, index) => Math.abs(offset - x) < Math.abs(carouselOffsets[best] - x) ? index : best, 0)));
          if (next !== safeActive) { tapHaptic('select'); setActive(next); }
        }}>
        {items.map((item, index) => <View key={item.key} style={{ width: itemFrames[index].width, height: size.height }}>
          <View style={{ marginTop: Math.max(8, ((syncMainState ? availableHeight : size.height) - itemFrames[index].height) / 2) }}>
            {renderPage(index, index === safeActive && focused && interactive && !detailOpen, true)}
          </View>
        </View>)}
      </GestureScrollView>
    : null}

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
});

/** Native position motion adds the new card without moving the stack's layout. */
function CardArrival({ children }: { animate: boolean; children: ReactNode }) {
  return <View testID="comic-card-arrival" style={{ flex: 1 }}>{children}</View>;
}
