import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ThemedText } from '@shared/ui/themed-text';
import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import { resolveComicScene, type ComicSceneId } from '../lib/comicSceneImages';

export type ComicDeckItem = { key: string; label: string; memo?: string; faceColor?: string; inkColor?: string };

const GAP = 6;
/** Horizontal room left for the neighboring cards to peek out on each side. */
const PEEK_GUTTER = 84;
const THUMB = 44;
const THUMB_GAP = 8;
const THUMB_STRIDE = THUMB + THUMB_GAP;
/** Matches the add button: 8px from the bottom, 44px tall, plus its right inset. */
const FOOTER_BOTTOM = 8;
const ADD_RESERVE = 72;
/** Artwork paper. A pure white card plus grain reads as a second sheet behind the drawing. */
const ILLUSTRATION_PAPER = '#FEFEFE';

/** Last measured stage, so a remounted deck paints its cards in the first frame. */
let lastDeckSize = { width: 0, height: 0 };
let lastActive = 0;
/** Only cards this close to the focused one decode their full artwork. */
const ARTWORK_WINDOW = 2;

/** Diary scenes as a swipeable card deck — one large scene per card with slim neighbor peeks. */
export function ComicSceneDeck({ items, ink, muted, isDark, choices, onOpen, onRemove }: {
  items: ComicDeckItem[]; ink: string; muted: string; isDark: boolean;
  choices: Record<string, ComicSceneId>; onOpen: (key: string) => void;
  onRemove?: (key: string) => void;
}) {
  const [size, setSize] = useState(lastDeckSize);
  const [active, setActive] = useState(() => Math.min(lastActive, Math.max(0, items.length - 1)));
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = Math.max(1, size.width - PEEK_GUTTER);
  const cardHeight = Math.max(1, size.height - (FOOTER_BOTTOM + THUMB + 56));
  const step = cardWidth + GAP;
  const [initialOffset] = useState(() => ({ x: active * step, y: 0 }));
  const scrollX = useRef(new Animated.Value(active * step)).current;
  useEffect(() => { lastActive = active; }, [active]);
  const side = Math.max(0, (size.width - cardWidth) / 2);
  const thumbRef = useRef<ScrollView>(null);
  const activeRef = useRef(active);
  const stepRef = useRef(step);
  activeRef.current = active;
  stepRef.current = step;
  const nudge = (direction: number) => {
    const next = Math.max(0, Math.min(items.length - 1, activeRef.current + direction));
    scrollRef.current?.scrollTo({ x: next * stepRef.current, animated: true });
  };
  const remove = (key: string) => { tapHaptic('warn'); onRemove?.(key); };
  const verticalSwipe = Gesture.Pan().enabled(items.length > 1)
    .activeOffsetY([-10, 10]).failOffsetX([-12, 12])
    .onEnd((event, success) => {
      if (!success || Math.abs(event.translationY) < 28) return;
      runOnJS(nudge)(event.translationY < 0 ? 1 : -1);
    });
  const stripWidth = items.length * THUMB_STRIDE - THUMB_GAP;
  // The strip stays put; it only scrolls when the focused thumbnail would leave a long row.
  useEffect(() => {
    const lane = Math.max(1, size.width - ADD_RESERVE - 12);
    if (size.width <= 0 || stripWidth <= lane) return;
    const target = active * THUMB_STRIDE + THUMB / 2 - lane / 2;
    thumbRef.current?.scrollTo({ x: Math.max(0, Math.min(stripWidth - lane, target)), animated: true });
  }, [active, size.width, stripWidth]);
  return <View testID="comic-scene-deck" style={s.root} onLayout={event => {
    const { width, height } = event.nativeEvent.layout;
    lastDeckSize = { width, height };
    setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
  }}>
    {size.width > 0 && size.height > 0 ? <GestureDetector gesture={verticalSwipe}><Animated.ScrollView ref={scrollRef} horizontal contentOffset={initialOffset} showsHorizontalScrollIndicator={false} style={{ height: cardHeight }}
      snapToInterval={step} decelerationRate="fast" contentContainerStyle={{ height: cardHeight, paddingHorizontal: side, gap: GAP, alignItems: 'center' }}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true, listener: (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const next = Math.max(0, Math.min(items.length - 1, Math.round(event.nativeEvent.contentOffset.x / step)));
        setActive(previous => previous === next ? previous : next);
      } })} scrollEventThrottle={16}>
      {items.map((item, index) => {
        const scene = resolveComicScene(item.key, item.label, choices);
        const face = scenePaper(item.faceColor, isDark);
        const cardInk = item.inkColor ?? ink;
        const memo = item.memo?.trim().replace(/\s+/g, ' ') ?? '';
        const inputRange = [(index - 1) * step, index * step, (index + 1) * step];
        const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
        return <Animated.View key={item.key} style={[s.card, { width: cardWidth, height: cardHeight, backgroundColor: face, transform: [{ scale }] }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={item.label} delayLongPress={480} onPress={() => { tapHaptic(); onOpen(item.key); }} onLongPress={onRemove ? () => remove(item.key) : undefined} style={s.body}>
            {Math.abs(index - active) <= ARTWORK_WINDOW ? <ComicSceneImage contentFit="contain" backgroundColor={face} imageKey={`${scene.id}:large`}
              source={COMIC_SCENE_THUMBNAILS[scene.id]?.large ?? scene.source} fallbackSource={scene.source}
              priority={index === active ? 'high' : 'normal'} style={{ width: '100%', flex: 1, minHeight: 0 }} /> : <View style={{ flex: 1 }} />}
            <View style={[s.caption, { borderTopColor: muted }]}>
              <ThemedText style={{ color: muted, fontSize: 12, lineHeight: 17 }}>{String(index + 1).padStart(2, '0')}</ThemedText>
              <ThemedText numberOfLines={2} style={{ color: cardInk, fontSize: 22, lineHeight: 29 }}>{item.label}</ThemedText>
              {memo ? <ThemedText numberOfLines={3} style={{ color: cardInk, opacity: 0.75, fontSize: 14, lineHeight: 21 }}>{memo}</ThemedText> : null}
            </View>
          </Pressable>
        </Animated.View>;
      })}
    </Animated.ScrollView></GestureDetector> : null}
    {size.width > 0 && items.length > 0 ? <View testID="comic-scene-thumbs" style={s.thumbs}>
      <ScrollView ref={thumbRef} horizontal showsHorizontalScrollIndicator={false} scrollEnabled={stripWidth > size.width - ADD_RESERVE - 12}
        contentContainerStyle={s.thumbRow}>
        {items.map((item, index) => {
          const scene = resolveComicScene(item.key, item.label, choices);
          const face = scenePaper(item.faceColor, isDark);
          const selected = index === active;
          return <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected }} delayLongPress={480} onLongPress={onRemove ? () => remove(item.key) : undefined} onPress={() => {
            tapHaptic();
            scrollRef.current?.scrollTo({ x: index * step, animated: true });
          }} style={[s.thumb, { backgroundColor: selected ? '#D7F0E7' : face }]}>
            <ComicSceneImage contentFit="cover" backgroundColor={face} imageKey={`${scene.id}:small`}
              source={COMIC_SCENE_THUMBNAILS[scene.id]?.small ?? scene.source} fallbackSource={scene.source}
              style={StyleSheet.absoluteFill} />
            <HanddrawnFrame color={selected ? '#328D7B' : isDark ? '#D5D5D5' : '#77786F'} bold={selected} />
          </Pressable>;
        })}
      </ScrollView>
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
  card: { borderRadius: 12, shadowColor: '#6F5942', shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  body: { flex: 1, borderRadius: 12, overflow: 'hidden', paddingBottom: 14 },
  caption: { flexShrink: 0, borderTopWidth: 0.5, marginTop: 10, marginHorizontal: 14, paddingTop: 10, gap: 4 },
  thumbs: { position: 'absolute', left: 0, right: ADD_RESERVE, bottom: FOOTER_BOTTOM, height: THUMB, justifyContent: 'center' },
  thumbRow: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: THUMB_GAP, paddingHorizontal: 12 },
  thumb: { width: THUMB, height: THUMB, overflow: 'hidden' },
});
